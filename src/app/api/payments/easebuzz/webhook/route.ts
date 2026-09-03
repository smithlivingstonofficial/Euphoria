import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  verifyEasebuzzResponseHash,
  getEasebuzzCredentials,
} from "@/lib/payments/easebuzz";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    let payload: Record<string, string> = {};

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });
    } else {
      payload = await req.json();
    }

    const {
      txnid,
      status,
      easepayid,
      hash,
      udf1: userId,
      udf3: eventIdsStr,
      udf4: needsAccommStr,
    } = payload;

    const { salt, key } = getEasebuzzCredentials();

    // Verify reverse hash
    const isValidHash = verifyEasebuzzResponseHash({
      ...payload,
      salt,
      key,
    });

    if (!isValidHash) {
      console.warn("Easebuzz Webhook reverse hash mismatch:", { txnid, easepayid });
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 400 });
    }

    const isSuccess = (status || "").toLowerCase() === "success";
    const adminClient = await createAdminClient();

    if (isSuccess && userId && eventIdsStr) {
      const eventIds = eventIdsStr.split(",").filter(Boolean);
      const needsAccommodation = needsAccommStr === "yes";

      // Execute atomic RPC if not already confirmed
      const { data: checkoutData, error: checkoutError } = await adminClient.rpc(
        "fn_checkout_pass_atomic",
        {
          p_user_id: userId,
          p_event_ids: eventIds,
          p_payment_provider: "easebuzz",
          p_order_metadata: {
            easebuzz_pay_id: easepayid,
            easebuzz_txnid: txnid,
            source: "easebuzz_webhook",
            needs_accommodation: needsAccommodation,
            timestamp: new Date().toISOString(),
          },
        }
      );

      if (!checkoutError && checkoutData?.success && checkoutData.order_id) {
        await adminClient.from("orders").update({
          gateway_order_id: txnid,
          status: "paid",
          metadata: {
            easebuzz_pay_id: easepayid,
            easebuzz_txnid: txnid,
            source: "easebuzz_webhook",
            timestamp: new Date().toISOString(),
          },
        }).eq("id", checkoutData.order_id);
      }

      revalidateTag("public-events");
      revalidatePath("/", "layout");
      revalidatePath("/dashboard", "page");
    } else {
      // Mark pending order as failed if status is failure
      await adminClient.from("orders").update({
        status: isSuccess ? "paid" : "failed",
        metadata: {
          easebuzz_pay_id: easepayid,
          easebuzz_txnid: txnid,
          webhook_status: status,
          timestamp: new Date().toISOString(),
        },
      }).eq("gateway_order_id", txnid);
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("Easebuzz webhook error:", err);
    return NextResponse.json({ success: false, message: "Internal error" }, { status: 500 });
  }
}
