import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  verifyEasebuzzResponseHash,
  getEasebuzzCredentials,
  checkEasebuzzTransactionStatus,
} from "@/lib/payments/easebuzz";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    const {
      txnid,
      status,
      amount,
      easepayid,
      hash,
      udf1: userId,
      udf2: passTier,
      udf3: eventIdsStr,
      udf4: needsAccommStr,
      firstname,
      email,
      productinfo,
    } = data;

    const origin = req.headers.get("x-forwarded-proto") && req.headers.get("x-forwarded-host")
      ? `${req.headers.get("x-forwarded-proto")}://${req.headers.get("x-forwarded-host")}`
      : req.nextUrl.origin;

    const { salt, key, baseUrl } = getEasebuzzCredentials(origin);

    const isSuccess = (status || "").toLowerCase() === "success";
    const needsAccommodation = needsAccommStr === "yes";

    // Reverse Hash Cryptographic Verification
    let isValidHash = verifyEasebuzzResponseHash({
      ...data,
      salt,
      key,
    });

    // If reverse hash check fails but Easebuzz posted success, perform server-to-server gateway verification
    if (!isValidHash && txnid) {
      console.warn("Callback reverse hash check failed, verifying with Easebuzz v2 API directly...", { txnid, easepayid });
      const liveVerify = await checkEasebuzzTransactionStatus({ txnid });
      if (liveVerify?.status && (liveVerify.msg?.status || "").toLowerCase() === "success") {
        isValidHash = true;
        console.log("Easebuzz v2 direct retrieve confirmed payment success for txnid:", txnid);
      }
    }

    if (!isValidHash && !isSuccess) {
      console.error("Easebuzz callback security mismatch:", { txnid, easepayid });
      return NextResponse.redirect(
        new URL(`/events?payment=failed&reason=security_mismatch`, baseUrl),
        { status: 303 }
      );
    }

    if (!isSuccess) {
      return NextResponse.redirect(
        new URL(`/events?payment=failed&reason=${encodeURIComponent(status || "Payment failed")}`, baseUrl),
        { status: 303 }
      );
    }

    const adminClient = await createAdminClient();

    // Look for attempted order record in DB
    let pendingOrder: any = null;
    try {
      const { data: ord } = await adminClient
        .from("orders")
        .select("*")
        .eq("order_number", txnid)
        .maybeSingle();
      pendingOrder = ord;
    } catch (lookupErr) {
      console.warn("Pending order lookup warning:", lookupErr);
    }

    const targetUserId = userId || pendingOrder?.user_id;

    // Resilient event resolution: checks order metadata first, then udf3, then dynamic event name lookup
    const rawEvents = pendingOrder?.metadata?.event_ids || pendingOrder?.metadata?.event_names || eventIdsStr;
    const { resolveEventIds } = await import("@/lib/payments/easebuzz");
    const resolvedEventIds = await resolveEventIds(rawEvents, adminClient);

    if (!targetUserId || resolvedEventIds.length === 0) {
      console.error("Callback missing critical data:", { targetUserId, resolvedEventIds, txnid });
      return NextResponse.redirect(
        new URL(`/dashboard?payment=notice&msg=processed`, baseUrl),
        { status: 303 }
      );
    }

    // Call atomic RPC
    const { data: checkoutData, error: checkoutError } = await adminClient.rpc(
      "fn_checkout_pass_atomic",
      {
        p_user_id: targetUserId,
        p_event_ids: resolvedEventIds,
        p_payment_provider: "easebuzz",
        p_order_metadata: {
          easebuzz_pay_id: easepayid || `ebz_${Date.now()}`,
          easebuzz_txnid: txnid || `txn_${Date.now()}`,
          needs_accommodation: needsAccommodation,
          accommodation_status: needsAccommodation ? "requested" : "none",
          accommodation_payment: "in_person_on_campus",
          source: "easebuzz_hosted_callback",
          actual_amount_paid: Number(amount || 200),
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (checkoutError || !checkoutData?.success) {
      console.error("Easebuzz atomic checkout error in callback:", checkoutError || checkoutData);
      return NextResponse.redirect(
        new URL(`/events?payment=error&msg=registration_issue`, baseUrl),
        { status: 303 }
      );
    }

    if (checkoutData.order_id) {
      // Remove previous attempted order row if existed to avoid duplicate / key conflicts
      if (pendingOrder?.id && pendingOrder.id !== checkoutData.order_id) {
        try {
          await adminClient.from("orders").delete().eq("id", pendingOrder.id);
        } catch (delErr) {
          console.warn("Notice: cleaning attempted order row in callback:", delErr);
        }
      }

      await adminClient.from("orders").update({
        order_number: txnid || undefined,
        gateway_order_id: txnid,
        gateway_payment_id: easepayid || null,
        amount: Number(amount || 200),
        status: "paid",
        metadata: {
          ...pendingOrder?.metadata,
          easebuzz_pay_id: easepayid,
          easebuzz_txnid: txnid,
          productinfo: productinfo || "Euphoria 2026 Pass",
          purpose: productinfo || "Euphoria 2026 Pass",
          udf6_candidate_id: data.udf6 || targetUserId,
          udf7_audit_key: data.udf7 || "Euphoria 2026",
          needs_accommodation: needsAccommodation,
          source: "easebuzz_hosted_callback",
          timestamp: new Date().toISOString(),
        },
      }).eq("id", checkoutData.order_id);
    }

    if (needsAccommodation) {
      await adminClient.from("profiles").update({
        needs_accommodation: true,
      }).eq("id", targetUserId);
    }

    revalidateTag("public-events");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "page");
    revalidatePath("/events", "page");
    revalidatePath("/dashboard/passes", "page");

    return NextResponse.redirect(
      new URL(`/dashboard/passes?payment=success&code=${checkoutData.pass_code || "CONFIRMED"}`, baseUrl),
      { status: 303 }
    );
  } catch (err) {
    console.error("Easebuzz callback fatal error:", err);
    return NextResponse.redirect(
      new URL(`/events?payment=error`, "http://localhost:3000"),
      { status: 303 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get("status") || "notice";
  return NextResponse.redirect(
    new URL(`/dashboard/passes?payment=${status}`, req.url)
  );
}
