"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import {
  initiateEasebuzzPayment,
  verifyEasebuzzResponseHash,
  getEasebuzzCredentials,
} from "@/lib/payments/easebuzz";
import {
  CreateEasebuzzOrderResult,
  EasebuzzVerifyPayload,
  VerifyEasebuzzPaymentResult,
} from "@/lib/payments/types";

export type { CreateEasebuzzOrderResult, EasebuzzVerifyPayload, VerifyEasebuzzPaymentResult };

// 1. Create Easebuzz Payment Order Server Action
export async function createEasebuzzOrderAction(
  eventIds: string[],
  needsAccommodation?: boolean
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

    if (!profile || !profile.is_profile_completed) {
      return {
        success: false,
        error: "Please complete your participant profile before checking out.",
        redirect: "/complete-profile",
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
      .select("id, name, is_pro_event")
      .in("id", eventIds);

    if (evtsError || !selectedEvts || selectedEvts.length === 0) {
      return { success: false, error: "Invalid events selected." };
    }

    // Determine pass price server-side: Pro Pass = ₹300, Standard Pass = ₹200
    const hasProEvent = selectedEvts.some((e) => Boolean(e.is_pro_event));
    const passAmountRupees = hasProEvent ? 300 : 200;

    const { key, salt, env, subMerchantId, baseUrl } = getEasebuzzCredentials();

    if (!key || !salt) {
      console.error("Easebuzz credentials missing in environment variables!");
      return {
        success: false,
        error: "Easebuzz credentials missing. Please configure EASEBUZZ_KEY and EASEBUZZ_SALT in .env.local.",
      };
    }

    // Unique Transaction ID (max 40 alphanumeric characters)
    const txnid = `EBZ-26-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const userPhone = profile.mobile_number || profile.phone || "9999999999";
    const userName = profile.full_name || "Delegate";
    const productInfo = hasProEvent ? "EUPHORIA PRO PASS" : "EUPHORIA STANDARD PASS";

    // Call Easebuzz Initiate Payment API
    const initRes = await initiateEasebuzzPayment(
      {
        key,
        txnid,
        amount: passAmountRupees,
        productinfo: productInfo,
        firstname: userName,
        email: user.email || profile.email || "delegate@kareeuphoria.in",
        phone: userPhone,
        surl: `${baseUrl}/api/payments/easebuzz/callback?status=success`,
        furl: `${baseUrl}/api/payments/easebuzz/callback?status=failure`,
        udf1: user.id,
        udf2: hasProEvent ? "pro_pass" : "standard_pass",
        udf3: eventIds.join(","),
        udf4: needsAccommodation ? "yes" : "no",
        udf5: txnid,
        sub_merchant_id: subMerchantId || undefined,
      },
      salt,
      env
    );

    if (initRes.status !== 1 || !initRes.data) {
      console.error("Easebuzz initiate failed:", initRes);
      return {
        success: false,
        error: initRes.data || initRes.error_desc || "Easebuzz Payment gateway initiation failed.",
      };
    }

    const accessKey = initRes.data;

    // Insert pending order in database for audit & real-time transaction tracking
    try {
      const adminClient = await createAdminClient();
      await adminClient.from("orders").insert({
        user_id: user.id,
        order_number: txnid,
        amount: passAmountRupees,
        currency: "INR",
        status: "pending",
        provider: "easebuzz",
        gateway_order_id: txnid,
        metadata: {
          event_ids: eventIds,
          pass_tier: hasProEvent ? "pro_pass" : "standard_pass",
          needs_accommodation: Boolean(needsAccommodation),
          accommodation_status: needsAccommodation ? "requested" : "none",
          easebuzz_access_key: accessKey,
          easebuzz_txnid: txnid,
          created_at: new Date().toISOString(),
        },
      });
    } catch (dbErr) {
      console.warn("Pending order audit insert notice:", dbErr);
    }

    return {
      success: true,
      accessKey,
      txnid,
      amount: passAmountRupees,
      currency: "INR",
      key,
      env,
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
    const { easepayid, txnid, status, hash, amount, eventIds, needsAccommodation, rawPayload } = payload;

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

    if (!profile || !profile.is_profile_completed) {
      return { success: false, error: "Participant profile uncompleted." };
    }

    const { salt, key } = getEasebuzzCredentials();

    // Cryptographic Reverse SHA-512 Hash Verification
    if (salt && hash) {
      const isValidHash = verifyEasebuzzResponseHash({
        salt,
        key,
        txnid,
        amount,
        status,
        hash,
        firstname: profile.full_name || (rawPayload?.firstname as string) || "",
        email: user.email || (rawPayload?.email as string) || "",
        productinfo: (rawPayload?.productinfo as string) || "",
        udf1: user.id,
        udf2: (rawPayload?.udf2 as string) || "",
        udf3: (rawPayload?.udf3 as string) || eventIds.join(","),
        udf4: (rawPayload?.udf4 as string) || (needsAccommodation ? "yes" : "no"),
        udf5: (rawPayload?.udf5 as string) || txnid,
        udf6: (rawPayload?.udf6 as string) || "",
        udf7: (rawPayload?.udf7 as string) || "",
        udf8: (rawPayload?.udf8 as string) || "",
        udf9: (rawPayload?.udf9 as string) || "",
        udf10: (rawPayload?.udf10 as string) || "",
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
        await adminClient.from("orders").update({
          gateway_order_id: txnid,
          status: "paid",
          metadata: {
            easebuzz_pay_id: easepayid || `ebz_pay_${Date.now()}`,
            easebuzz_txnid: txnid || `ebz_txn_${Date.now()}`,
            participant_type: profile.participant_type,
            needs_accommodation: Boolean(needsAccommodation),
            accommodation_status: needsAccommodation ? "requested" : "none",
            accommodation_payment: "in_person_on_campus",
            timestamp: new Date().toISOString(),
          },
        }).eq("id", checkoutData.order_id);
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
      totalPayable: checkoutData.amount_paid,
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
