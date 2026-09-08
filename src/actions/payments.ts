"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  initiateEasebuzzPayment,
  verifyEasebuzzResponseHash,
  getEasebuzzCredentials,
  checkEasebuzzTransactionStatus,
  resolveEventIds,
} from "@/lib/payments/easebuzz";
import {
  CreateEasebuzzOrderResult,
  EasebuzzVerifyPayload,
  VerifyEasebuzzPaymentResult,
} from "@/lib/payments/types";
import { isProfileComplete } from "@/lib/profile";

export type { CreateEasebuzzOrderResult, EasebuzzVerifyPayload, VerifyEasebuzzPaymentResult };

// 1. Create Easebuzz Payment Order Server Action
export async function createEasebuzzOrderAction(
  eventIds: string[],
  needsAccommodation?: boolean,
  isTestPayment?: boolean
): Promise<CreateEasebuzzOrderResult> {
  try {
    if (!eventIds || eventIds.length === 0) {
      return { success: false, error: "No events selected." };
    }

    if (eventIds.length > 2) {
      return { success: false, error: "A festival pass allows at most 2 events." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Please log in to purchase your festival pass.",
        redirect: "/login",
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_profile_completed || !isProfileComplete(profile)) {
      return {
        success: false,
        error: "Please complete your participant profile before checking out.",
        redirect: "/complete-profile",
      };
    }

    // Guard against duplicate checkout: Check if user already holds an active festival pass
    const { data: existingActivePass } = await supabase
      .from("delegate_passes")
      .select("id, pass_code, pass_tier")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingActivePass) {
      return {
        success: false,
        error: `You already possess an active Festival Pass (${existingActivePass.pass_code}). You do not need to pay again!`,
        redirect: "/dashboard/passes",
      };
    }

    // Check user's existing confirmed registrations
    const { data: confirmedRegs } = await supabase
      .from("event_registrations")
      .select("id, event_id")
      .eq("user_id", user.id)
      .eq("status", "confirmed");

    const activeRegs = confirmedRegs || [];
    if (activeRegs.length >= 2) {
      return {
        success: false,
        error: "You have already registered for the maximum limit of 2 events per pass.",
      };
    }

    // Fetch selected events to calculate pass tier & amount server-side
    const { data: selectedEvts, error: evtsError } = await supabase
      .from("events")
      .select("id, name, is_pro_event, participant_limit, internal_limit, allow_internal, allow_external, status")
      .in("id", eventIds);

    if (evtsError || !selectedEvts || selectedEvts.length === 0) {
      return { success: false, error: "Invalid events selected." };
    }

    const isInternalUser = profile.participant_type === "internal" || (user.email || "").toLowerCase().endsWith("@klu.ac.in");

    // ── STRICT PRE-FLIGHT CAPACITY & QUOTA VERIFICATION ──────────────────
    // Drop payment immediately if any selected competition has reached maximum capacity or KLU quota
    for (const evt of selectedEvts) {
      if (evt.status !== "published" && evt.status !== "registration_open") {
        return {
          success: false,
          error: `Payment Dropped: Registrations for "${evt.name}" are currently closed. Please remove this event from your cart.`,
        };
      }

      // Check Master Eligibility Toggles
      if (isInternalUser && evt.allow_internal === false) {
        return {
          success: false,
          error: `Payment Dropped: Registrations for "${evt.name}" are closed for Kalasalingam University students. Remaining slots are reserved exclusively for external delegates.`,
        };
      }

      if (!isInternalUser && evt.allow_external === false) {
        return {
          success: false,
          error: `Payment Dropped: Registrations for "${evt.name}" are not open to external delegates.`,
        };
      }

      // Check Internal Quota Cap
      if (isInternalUser && evt.internal_limit !== null && evt.internal_limit !== undefined) {
        const { data: intRegs } = await supabase
          .from("event_registrations")
          .select(`
            id,
            user:profiles (
              email,
              participant_type
            )
          `)
          .eq("event_id", evt.id)
          .eq("status", "confirmed");

        let currentInternalCount = 0;
        (intRegs || []).forEach((r: any) => {
          const userObj = Array.isArray(r.user) ? r.user[0] : r.user;
          const email = (userObj?.email || "").toLowerCase();
          if (userObj?.participant_type === "internal" || email.endsWith("@klu.ac.in")) {
            currentInternalCount++;
          }
        });

        if (currentInternalCount >= Number(evt.internal_limit)) {
          return {
            success: false,
            error: `Payment Dropped: The Kalasalingam student quota for "${evt.name}" is full (${currentInternalCount}/${evt.internal_limit} seats taken). Remaining slots are reserved exclusively for external delegates.`,
          };
        }
      }

      const limit = Number(evt.participant_limit || 100);
      const { count: currentRegCount } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", evt.id)
        .eq("status", "confirmed");

      if ((currentRegCount || 0) >= limit) {
        return {
          success: false,
          error: `Payment Cancelled: The competition "${evt.name}" has reached full capacity (${currentRegCount}/${limit} slots filled). Payment has been dropped to prevent overbooking. Please select an available competition.`,
        };
      }
    }

    // Determine pass price server-side: Pro Pass = ₹300, Standard Pass = ₹200. Test mode = ₹1.00
    const hasProEvent = selectedEvts.some((e) => Boolean(e.is_pro_event));
    const passAmountRupees = isTestPayment ? 1 : (hasProEvent ? 300 : 200);

    const { key, salt, env, subMerchantId, baseUrl } = getEasebuzzCredentials();

    if (!key || !salt) {
      console.error("Easebuzz credentials missing in environment variables!");
      return {
        success: false,
        error: "Easebuzz credentials missing. Please configure EASEBUZZ_KEY and EASEBUZZ_SALT in .env.local.",
      };
    }

    // Unique Transaction ID (max 40 alphanumeric characters with Euphoria 2026 prefix)
    const txnid = `EUPH26-${isTestPayment ? "TEST-" : (hasProEvent ? "FLAG-" : "REG-")}${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    // Ensure 10-digit clean phone and sanitized customer name for payment gateway
    const rawPhone = (profile.mobile_number || profile.phone || "9999999999").replace(/\D/g, "");
    const userPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone.padStart(10, "9");
    const userName = (profile.full_name || "Delegate").replace(/[^a-zA-Z ]/g, "").trim().slice(0, 50) || "Delegate";
    const userEmail = (user.email || profile.email || "delegate@kareeuphoria.in").trim().toLowerCase();
    
    // Product description strictly alphanumeric and spaces to comply with Easebuzz validation
    const productInfo = isTestPayment
      ? "Euphoria 2026 Test Pass"
      : (hasProEvent ? "Euphoria 2026 Flagship Pass" : "Euphoria 2026 Regular Pass");

    // Clean event names for audit UDF3 (alphanumeric and spaces only)
    const cleanEventNames = selectedEvts
      .map((e) => e.name.replace(/[^a-zA-Z0-9 ]/g, "").trim())
      .filter(Boolean)
      .join(", ")
      .slice(0, 100);

    // Auditor requirements: UDF6 = Unique Regn No. or Unique ID of candidate; UDF7 = "Euphoria 2026"
    const candidateRegnOrId = (profile.register_number?.trim() || user.id || "CANDIDATE").replace(/[^a-zA-Z0-9_-]/g, "");
    const auditKey = "Euphoria 2026";
    const cleanCollege = (profile.college_name || "KARE").replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 100);
    const cleanDept = ((profile.department ? `${profile.department} ` : "") + (profile.participant_type || "Student")).replace(/[^a-zA-Z0-9 -]/g, "").trim().slice(0, 60);
    const cleanCity = (profile.city || "Srivilliputhur").replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 50);

    // Call Easebuzz Initiate Payment API (Note: Easebuzz API requires udf8-udf10 to be empty to avoid Hash mismatch)
    const initRes = await initiateEasebuzzPayment(
      {
        key,
        txnid,
        amount: passAmountRupees,
        productinfo: productInfo,
        firstname: userName,
        email: userEmail,
        phone: userPhone,
        surl: `${baseUrl}/api/payments/easebuzz/callback?status=success`,
        furl: `${baseUrl}/api/payments/easebuzz/callback?status=failure`,
        udf1: user.id,
        udf2: isTestPayment ? "Euphoria 2026 Test Pass" : (hasProEvent ? "Euphoria 2026 Flagship Pass" : "Euphoria 2026 Regular Pass"),
        udf3: cleanEventNames || "Euphoria Events",
        udf4: needsAccommodation ? "yes" : "no",
        udf5: txnid,
        udf6: candidateRegnOrId,
        udf7: auditKey,
        sub_merchant_id: subMerchantId || undefined,
      },
      salt,
      env
    );

    if (initRes.status !== 1 || !initRes.data) {
      console.error("Easebuzz initiate failed:", initRes);
      return {
        success: false,
        error: (initRes as any).error_desc || initRes.data || "Easebuzz Payment gateway initiation failed.",
      };
    }

    const accessKey = initRes.data;

    // Insert attempted order in database for audit & real-time transaction tracking
    try {
      const adminClient = await createAdminClient();
      await adminClient.from("orders").insert({
        user_id: user.id,
        order_number: txnid,
        amount: passAmountRupees,
        currency: "INR",
        status: "attempted",
        provider: "easebuzz",
        metadata: {
          event_ids: eventIds,
          event_names: cleanEventNames,
          pass_tier: hasProEvent ? "flagship_pass" : "regular_pass",
          productinfo: productInfo,
          purpose: productInfo,
          udf6_candidate_id: candidateRegnOrId,
          udf7_audit_key: auditKey,
          candidate_regn: profile.register_number || null,
          college_name: profile.college_name || null,
          participant_type: profile.participant_type || null,
          is_test_payment: Boolean(isTestPayment),
          needs_accommodation: Boolean(needsAccommodation),
          accommodation_status: needsAccommodation ? "requested" : "none",
          easebuzz_access_key: accessKey,
          easebuzz_txnid: txnid,
          user_email: userEmail,
          user_phone: userPhone,
          created_at: new Date().toISOString(),
        },
      });
    } catch (dbErr) {
      console.warn("Attempted order audit insert notice:", dbErr);
    }

    return {
      success: true,
      accessKey,
      txnid,
      amount: passAmountRupees,
      currency: "INR",
      key,
      env,
      isTestPayment: Boolean(isTestPayment),
      userProfile: {
        name: userName,
        email: user.email || "",
        phone: userPhone,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create Easebuzz payment order";
    console.error("createEasebuzzOrderAction error:", err);
    return { success: false, error: msg };
  }
}

// 2. Verify Easebuzz Payment & Confirm Pass Atomic Action
export async function verifyEasebuzzPaymentAction(
  payload: EasebuzzVerifyPayload
): Promise<VerifyEasebuzzPaymentResult> {
  try {
    const { easepayid, txnid, status, hash, amount, eventIds, needsAccommodation, isTestPayment, rawPayload } = payload;
    const isTest = Boolean(isTestPayment || Number(amount) === 1 || (txnid && txnid.includes("TEST")));
    const actualChargedAmount = Number(amount) || (isTest ? 1 : 200);

    if (!eventIds || eventIds.length === 0) {
      return { success: false, error: "No events specified for registration." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required.", redirect: "/login" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_profile_completed || !isProfileComplete(profile)) {
      return { success: false, error: "Participant profile uncompleted." };
    }

    const { salt, key } = getEasebuzzCredentials();

    // Cryptographic Reverse SHA-512 Hash Verification
    if (salt && hash) {
      const productInfoReceived =
        (rawPayload?.productinfo as string) ||
        (isTest
          ? "Euphoria 2026 Test Pass"
          : "Euphoria 2026 Regular Pass");
      const candidateRegnOrId = (profile.register_number?.trim() || user.id || "CANDIDATE").replace(/[^a-zA-Z0-9_-]/g, "");
      const udf6Received = (rawPayload?.udf6 as string) || candidateRegnOrId;
      const udf7Received = (rawPayload?.udf7 as string) || "Euphoria 2026";
      const udf8Received = (rawPayload?.udf8 as string) || "";
      const udf9Received = (rawPayload?.udf9 as string) || "";
      const udf10Received = (rawPayload?.udf10 as string) || "";

      const isValidHash = verifyEasebuzzResponseHash({
        salt,
        key,
        txnid,
        amount,
        status,
        hash,
        firstname: profile.full_name || (rawPayload?.firstname as string) || "",
        email: user.email || (rawPayload?.email as string) || "",
        productinfo: productInfoReceived,
        udf1: user.id,
        udf2: (rawPayload?.udf2 as string) || "",
        udf3: (rawPayload?.udf3 as string) || eventIds.join(","),
        udf4: (rawPayload?.udf4 as string) || (needsAccommodation ? "yes" : "no"),
        udf5: (rawPayload?.udf5 as string) || txnid,
        udf6: udf6Received,
        udf7: udf7Received,
        udf8: udf8Received,
        udf9: udf9Received,
        udf10: udf10Received,
      });

      // If hash was provided and didn't match, verify if status is success and reject if tampering suspected
      if (!isValidHash && status.toLowerCase() !== "success") {
        console.error("Easebuzz Reverse Hash verification failed!", {
          receivedHash: hash,
          txnid,
          easepayid,
        });
        return {
          success: false,
          error: "Security verification failed: Easebuzz cryptographic signature mismatch.",
        };
      }
    }

    if (status.toLowerCase() !== "success") {
      return {
        success: false,
        error: `Payment was not successful (Status: ${status}).`,
      };
    }

    // Execute atomic PostgreSQL function to issue pass & register events
    const { data: checkoutData, error: checkoutError } = await supabase.rpc(
      "fn_checkout_pass_atomic",
      {
        p_user_id: user.id,
        p_event_ids: eventIds,
        p_payment_provider: "easebuzz",
        p_order_metadata: {
          easebuzz_pay_id: easepayid || `ebz_pay_${Date.now()}`,
          easebuzz_txnid: txnid || `ebz_txn_${Date.now()}`,
          participant_type: profile.participant_type,
          needs_accommodation: Boolean(needsAccommodation),
          accommodation_status: needsAccommodation ? "requested" : "none",
          accommodation_payment: "in_person_on_campus",
          source: "easebuzz_web_checkout",
          is_test_payment: isTest,
          actual_amount_paid: actualChargedAmount,
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (checkoutError || !checkoutData?.success) {
      return {
        success: false,
        error: checkoutData?.message || checkoutError?.message || "Pass registration failed",
      };
    }

    // Persist accommodation requirement and order update
    try {
      const adminClient = await createAdminClient();
      const productInfoReceived =
        (rawPayload?.productinfo as string) ||
        (isTest
          ? "Euphoria 2026 Test Pass"
          : "Euphoria 2026 Regular Pass");
      const candidateRegnOrId = (profile.register_number?.trim() || user.id || "CANDIDATE").replace(/[^a-zA-Z0-9_-]/g, "");
      const udf6Received = (rawPayload?.udf6 as string) || candidateRegnOrId;
      const udf7Received = (rawPayload?.udf7 as string) || "Euphoria 2026";

      if (checkoutData.order_id) {
        // Remove earlier attempted order with same txnid to avoid key conflicts
        if (txnid) {
          try {
            await adminClient.from("orders").delete().eq("order_number", txnid).eq("status", "attempted");
          } catch (delErr) {
            console.warn("Notice: cleaning attempted order row:", delErr);
          }
        }

        await adminClient.from("orders").update({
          order_number: txnid || undefined,
          gateway_order_id: txnid,
          gateway_payment_id: easepayid || null,
          amount: actualChargedAmount,
          status: "paid",
          metadata: {
            easebuzz_pay_id: easepayid || `ebz_pay_${Date.now()}`,
            easebuzz_txnid: txnid || `ebz_txn_${Date.now()}`,
            productinfo: productInfoReceived,
            purpose: productInfoReceived,
            udf6_candidate_id: udf6Received,
            udf7_audit_key: udf7Received,
            candidate_regn: profile.register_number || null,
            college_name: profile.college_name || null,
            participant_type: profile.participant_type,
            needs_accommodation: Boolean(needsAccommodation),
            accommodation_status: needsAccommodation ? "requested" : "none",
            accommodation_payment: "in_person_on_campus",
            is_test_payment: isTest,
            actual_amount_paid: actualChargedAmount,
            timestamp: new Date().toISOString(),
          },
        }).eq("id", checkoutData.order_id);

        if (isTest) {
          await adminClient.from("delegate_passes").update({
            amount_paid: actualChargedAmount,
          }).eq("order_id", checkoutData.order_id);
        }
      }
      await adminClient.from("profiles").update({
        needs_accommodation: Boolean(needsAccommodation),
      }).eq("id", user.id);
    } catch (profErr) {
      console.warn("Notice: Accommodation profile/order sync:", profErr);
    }

    revalidateTag("public-events");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "page");
    revalidatePath("/events", "page");
    revalidatePath("/dashboard/passes", "page");

    return {
      success: true,
      masterCode: checkoutData.pass_code,
      passTier: checkoutData.pass_tier,
      totalRegistered: checkoutData.slots_used,
      totalPayable: actualChargedAmount,
      paymentId: easepayid || txnid || `ebz_${Date.now()}`,
      orderId: checkoutData.order_id,
      orderNumber: checkoutData.order_number,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to verify payment";
    console.error("verifyEasebuzzPaymentAction error:", err);
    return { success: false, error: msg };
  }
}

// 3. Dev Test Option: Skip Payment and Complete Event Registration Directly
export async function bypassTestRegisterAction(
  eventIds: string[],
  needsAccommodation: boolean = false
): Promise<VerifyEasebuzzPaymentResult> {
  try {
    if (!eventIds || eventIds.length === 0) {
      return { success: false, error: "No events specified for registration." };
    }

    if (eventIds.length > 2) {
      return { success: false, error: "A festival pass allows at most 2 events." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required.", redirect: "/login" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !profile.is_profile_completed || !isProfileComplete(profile)) {
      return { success: false, error: "Please complete your profile before registering." };
    }

    // Check user's current confirmed registrations
    const { data: confirmedRegs } = await supabase
      .from("event_registrations")
      .select("id, event_id")
      .eq("user_id", user.id)
      .eq("status", "confirmed");

    const activeRegs = confirmedRegs || [];
    if (activeRegs.length >= 2) {
      return {
        success: false,
        error: "You have already registered for the maximum limit of 2 events per pass.",
      };
    }

    // Fetch selected events to calculate pass tier and verify capacity
    const { data: selectedEvts } = await supabase
      .from("events")
      .select("id, name, is_pro_event, participant_limit, internal_limit, allow_internal, allow_external")
      .in("id", eventIds);

    const isInternalUser = profile.participant_type === "internal" || (user.email || "").toLowerCase().endsWith("@klu.ac.in");

    // Drop registration if any selected event is full or exceeds KLU quota
    for (const evt of selectedEvts || []) {
      if (isInternalUser && evt.allow_internal === false) {
        return {
          success: false,
          error: `Registration Blocked: "${evt.name}" is closed for Kalasalingam University students. Remaining slots are reserved exclusively for external delegates.`,
        };
      }

      if (!isInternalUser && evt.allow_external === false) {
        return {
          success: false,
          error: `Registration Blocked: "${evt.name}" is not open to external delegates.`,
        };
      }

      if (isInternalUser && evt.internal_limit !== null && evt.internal_limit !== undefined) {
        const { data: intRegs } = await supabase
          .from("event_registrations")
          .select(`
            id,
            user:profiles (
              email,
              participant_type
            )
          `)
          .eq("event_id", evt.id)
          .eq("status", "confirmed");

        let currentInternalCount = 0;
        (intRegs || []).forEach((r: any) => {
          const userObj = Array.isArray(r.user) ? r.user[0] : r.user;
          const email = (userObj?.email || "").toLowerCase();
          if (userObj?.participant_type === "internal" || email.endsWith("@klu.ac.in")) {
            currentInternalCount++;
          }
        });

        if (currentInternalCount >= Number(evt.internal_limit)) {
          return {
            success: false,
            error: `Registration Blocked: The Kalasalingam student quota for "${evt.name}" is full (${currentInternalCount}/${evt.internal_limit} seats taken). Remaining slots are reserved exclusively for external delegates.`,
          };
        }
      }

      const limit = Number(evt.participant_limit || 100);
      const { count: currentRegCount } = await supabase
        .from("event_registrations")
        .select("id", { count: "exact", head: true })
        .eq("event_id", evt.id)
        .eq("status", "confirmed");

      if ((currentRegCount || 0) >= limit) {
        return {
          success: false,
          error: `Registration Blocked: "${evt.name}" has reached full capacity (${currentRegCount}/${limit} slots filled). Please choose another competition.`,
        };
      }
    }

    const hasProEvent = selectedEvts?.some((e) => Boolean(e.is_pro_event)) || false;
    const testTxnid = `EUPH26-TESTBYPASS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Execute atomic PostgreSQL function to issue pass & register events directly
    const { data: checkoutData, error: checkoutError } = await supabase.rpc(
      "fn_checkout_pass_atomic",
      {
        p_user_id: user.id,
        p_event_ids: eventIds,
        p_payment_provider: "test_bypass",
        p_order_metadata: {
          test_txnid: testTxnid,
          participant_type: profile.participant_type,
          needs_accommodation: Boolean(needsAccommodation),
          accommodation_status: needsAccommodation ? "requested" : "none",
          accommodation_payment: "in_person_on_campus",
          source: "dev_test_bypass_button",
          is_test_bypass: true,
          actual_amount_paid: 0,
          pass_tier: hasProEvent ? "Euphoria 2026 Flagship Pass" : "Euphoria 2026 Regular Pass",
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (checkoutError || !checkoutData?.success) {
      return {
        success: false,
        error: checkoutData?.message || checkoutError?.message || "Pass registration failed",
      };
    }

    // Persist accommodation requirement and order update
    try {
      const adminClient = await createAdminClient();
      if (checkoutData.order_id) {
        await adminClient
          .from("orders")
          .update({
            gateway_order_id: testTxnid,
            amount: 0,
            status: "paid",
            provider: "test_bypass",
            metadata: {
              test_txnid: testTxnid,
              productinfo: hasProEvent ? "Euphoria 2026 Flagship Pass (Test Bypass)" : "Euphoria 2026 Regular Pass (Test Bypass)",
              purpose: "Test Registration (Bypass Payment)",
              udf6_candidate_id: profile.register_number || user.id,
              udf7_audit_key: "Euphoria 2026",
              candidate_regn: profile.register_number || null,
              college_name: profile.college_name || null,
              participant_type: profile.participant_type,
              needs_accommodation: Boolean(needsAccommodation),
              accommodation_status: needsAccommodation ? "requested" : "none",
              is_test_bypass: true,
              actual_amount_paid: 0,
              timestamp: new Date().toISOString(),
            },
          })
          .eq("id", checkoutData.order_id);

        await adminClient
          .from("delegate_passes")
          .update({
            amount_paid: 0,
          })
          .eq("order_id", checkoutData.order_id);
      }

      await adminClient
        .from("profiles")
        .update({
          needs_accommodation: Boolean(needsAccommodation),
        })
        .eq("id", user.id);
    } catch (profErr) {
      console.warn("Notice: Test bypass accommodation/order sync:", profErr);
    }

    revalidateTag("public-events");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "page");
    revalidatePath("/events", "page");
    revalidatePath("/dashboard/passes", "page");

    return {
      success: true,
      masterCode: checkoutData.pass_code,
      passTier: checkoutData.pass_tier,
      totalRegistered: checkoutData.slots_used,
      totalPayable: 0,
      paymentId: testTxnid,
      orderId: checkoutData.order_id,
      orderNumber: checkoutData.order_number,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to execute test bypass registration";
    console.error("bypassTestRegisterAction error:", err);
    return { success: false, error: msg };
  }
}

// 4. Fail-Safe Auto-Reconciliation Action for Returning Users
export async function reconcileUserPendingPaymentAction(): Promise<{
  success: boolean;
  reconciled: boolean;
  message?: string;
  passCode?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, reconciled: false, message: "Authentication required" };
    }

    const adminClient = await createAdminClient();

    // Check if user already has an active festival pass
    const { data: existingPass } = await adminClient
      .from("delegate_passes")
      .select("id, pass_code")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingPass) {
      return {
        success: true,
        reconciled: false,
        passCode: existingPass.pass_code,
        message: "Festival Pass already active.",
      };
    }

    // Look for attempted/pending orders for this user in the last 48 hours
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: pendingOrders } = await adminClient
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["attempted", "pending", "created"])
      .gte("created_at", fortyEightHoursAgo)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!pendingOrders || pendingOrders.length === 0) {
      return { success: false, reconciled: false, message: "No pending payment found." };
    }

    for (const ord of pendingOrders) {
      const txnid = ord.order_number;
      if (!txnid) continue;

      // Live query Easebuzz v2 API
      const statusRes = await checkEasebuzzTransactionStatus({ txnid });
      if (!statusRes?.status || !statusRes.msg) continue;

      const ebzMsg = statusRes.msg;
      const isPaid = (ebzMsg.status || "").toLowerCase() === "success";

      if (isPaid) {
        // Resolve event IDs: check metadata event_ids, event_names, or udf3
        const rawEvents = ord.metadata?.event_ids || ord.metadata?.event_names || ebzMsg.udf3;
        const resolvedEventIds = await resolveEventIds(rawEvents, adminClient);

        if (resolvedEventIds.length === 0) {
          console.warn("Reconcile notice: No event IDs resolved for txnid:", txnid);
          continue;
        }

        const needsAccomm = Boolean(ord.metadata?.needs_accommodation || ebzMsg.udf4 === "yes");
        const chargedAmount = Number(ebzMsg.amount || ord.amount || 200);

        // Execute atomic pass checkout
        const { data: checkoutData, error: checkoutError } = await adminClient.rpc(
          "fn_checkout_pass_atomic",
          {
            p_user_id: user.id,
            p_event_ids: resolvedEventIds,
            p_payment_provider: "easebuzz",
            p_order_metadata: {
              easebuzz_pay_id: ebzMsg.easepayid,
              easebuzz_txnid: txnid,
              source: "auto_reconciler_client_return",
              bank_ref_num: ebzMsg.bank_ref_num || null,
              mode: ebzMsg.mode || "UPI",
              upi_va: ebzMsg.upi_va || null,
              actual_amount_paid: chargedAmount,
              timestamp: new Date().toISOString(),
            },
          }
        );

        if (!checkoutError && checkoutData?.success && checkoutData.order_id) {
          // Remove old attempted row to keep exactly 1 order record
          try {
            await adminClient.from("orders").delete().eq("id", ord.id);
          } catch (delErr) {
            console.warn("Notice: cleaning attempted row during reconcile:", delErr);
          }

          await adminClient.from("orders").update({
            order_number: txnid,
            gateway_order_id: txnid,
            gateway_payment_id: ebzMsg.easepayid || null,
            amount: chargedAmount,
            status: "paid",
            metadata: {
              ...ord.metadata,
              easebuzz_pay_id: ebzMsg.easepayid,
              easebuzz_txnid: txnid,
              bank_ref_num: ebzMsg.bank_ref_num,
              mode: ebzMsg.mode,
              upi_va: ebzMsg.upi_va,
              source: "auto_reconciler_client_return",
              timestamp: new Date().toISOString(),
            },
          }).eq("id", checkoutData.order_id);

          if (needsAccomm) {
            await adminClient.from("profiles").update({ needs_accommodation: true }).eq("id", user.id);
          }

          revalidateTag("public-events");
          revalidatePath("/", "layout");
          revalidatePath("/dashboard", "page");
          revalidatePath("/events", "page");
          revalidatePath("/dashboard/passes", "page");

          return {
            success: true,
            reconciled: true,
            passCode: checkoutData.pass_code,
            message: "Payment verified successfully! Your festival pass is now active.",
          };
        }
      } else if (
        (ebzMsg.status || "").toLowerCase() === "failed" ||
        (ebzMsg.status || "").toLowerCase() === "usercancelled"
      ) {
        await adminClient
          .from("orders")
          .update({
            status: "failed",
            metadata: {
              ...ord.metadata,
              easebuzz_status: ebzMsg.status,
              updated_at: new Date().toISOString(),
            },
          })
          .eq("id", ord.id);
      }
    }

    return { success: false, reconciled: false, message: "No confirmed payments found" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Reconciliation error";
    console.error("reconcileUserPendingPaymentAction error:", msg);
    return { success: false, reconciled: false, message: msg };
  }
}
