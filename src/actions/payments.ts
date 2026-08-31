"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";
import crypto from "crypto";

function getRazorpayCredentials() {
  const keyId =
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID ||
    process.env.PAYMENT_PROVIDER ||
    "";

  const keySecret =
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.PAYMENT_SECRET ||
    "";

  return { keyId, keySecret };
}

export interface CreateRazorpayOrderResult {
  success: boolean;
  orderId?: string;
  amount?: number; // In rupees
  currency?: string;
  keyId?: string;
  userProfile?: {
    name: string;
    email: string;
  };
  error?: string;
  redirect?: string;
}

// 1. Create Razorpay Order Server Action
export async function createRazorpayOrderAction(
  eventIds: string[]
): Promise<CreateRazorpayOrderResult> {
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
    const amountInPaise = passAmountRupees * 100;

    const receiptRef = `rcpt_${Date.now()}_${user.id.substring(0, 6)}`;
    const { keyId, keySecret } = getRazorpayCredentials();

    if (!keyId || !keySecret) {
      console.error("Razorpay Credentials missing in environment variables!");
      return {
        success: false,
        error: "Razorpay credentials missing. Please set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.local.",
      };
    }

    // Call Razorpay Orders API directly
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: receiptRef,
        notes: {
          user_id: user.id,
          user_name: profile.full_name,
          event_ids: eventIds.join(","),
          pass_tier: hasProEvent ? "pro_pass" : "standard_pass",
        },
      }),
    });

    if (!rzpRes.ok) {
      const errBody = await rzpRes.text();
      console.error("Razorpay Order API Failed:", rzpRes.status, errBody);
      return {
        success: false,
        error: `Razorpay API Error (${rzpRes.status}): Authentication or Key configuration error.`,
      };
    }

    const rzpData = await rzpRes.json();

    // Insert pending order in database for real-time transaction tracking audit
    try {
      const adminClient = await createAdminClient();
      const orderNum = `ORD-26-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await adminClient.from("orders").insert({
        user_id: user.id,
        order_number: orderNum,
        amount: passAmountRupees,
        currency: "INR",
        status: "pending",
        provider: "razorpay",
        gateway_order_id: rzpData.id,
        metadata: {
          event_ids: eventIds,
          pass_tier: hasProEvent ? "pro_pass" : "standard_pass",
          razorpay_order_id: rzpData.id,
          created_at: new Date().toISOString(),
        },
      });
    } catch (dbErr) {
      console.warn("Pending order audit insert notice:", dbErr);
    }

    return {
      success: true,
      orderId: rzpData.id,
      amount: passAmountRupees,
      currency: "INR",
      keyId: keyId,
      userProfile: {
        name: profile.full_name || "",
        email: user.email || "",
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create payment order";
    return { success: false, error: msg };
  }
}

export interface VerifyRazorpayPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  eventIds: string[];
}

// 2. Verify Razorpay Payment & Confirm Pass Atomic Action
export async function verifyRazorpayPaymentAction(
  payload: VerifyRazorpayPaymentPayload
) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, eventIds } = payload;

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
      return { success: false, error: "Profile uncompleted." };
    }

    const { keySecret } = getRazorpayCredentials();

    // Cryptographic HMAC SHA-256 Signature Verification
    if (keySecret && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        console.error("Razorpay HMAC signature verification failed!", {
          generatedSignature,
          receivedSignature: razorpay_signature,
        });
        return {
          success: false,
          error: "Security verification failed: Payment signature mismatch.",
        };
      }
    }

    // Execute atomic PostgreSQL function to issue pass & register events
    const { data: checkoutData, error: checkoutError } = await supabase.rpc(
      "fn_checkout_pass_atomic",
      {
        p_user_id: user.id,
        p_event_ids: eventIds,
        p_payment_provider: "razorpay",
        p_order_metadata: {
          razorpay_payment_id: razorpay_payment_id || `pay_${Date.now()}`,
          razorpay_order_id: razorpay_order_id || `order_${Date.now()}`,
          participant_type: profile.participant_type,
          source: "razorpay_web_checkout",
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
      paymentId: razorpay_payment_id || `pay_${Date.now()}`,
      orderId: checkoutData.order_id,
      orderNumber: checkoutData.order_number,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to verify payment";
    return { success: false, error: msg };
  }
}
