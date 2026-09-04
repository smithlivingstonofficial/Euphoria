import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  verifyEasebuzzResponseHash,
  getEasebuzzCredentials,
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

    const { salt, key, baseUrl } = getEasebuzzCredentials();

    const isSuccess = (status || "").toLowerCase() === "success";
    const eventIds = eventIdsStr ? eventIdsStr.split(",").filter(Boolean) : [];
    const needsAccommodation = needsAccommStr === "yes";

    // Reverse Hash Cryptographic Verification
    const isValidHash = verifyEasebuzzResponseHash({
      ...data,
      salt,
      key,
    });

    if (!isValidHash && !isSuccess) {
      console.error("Easebuzz callback reverse hash mismatch:", { txnid, easepayid });
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

    if (!userId || eventIds.length === 0) {
      return NextResponse.redirect(
        new URL(`/dashboard?payment=notice&msg=processed`, baseUrl),
        { status: 303 }
      );
    }

    const adminClient = await createAdminClient();

    // Call atomic RPC
    const { data: checkoutData, error: checkoutError } = await adminClient.rpc(
      "fn_checkout_pass_atomic",
      {
        p_user_id: userId,
        p_event_ids: eventIds,
        p_payment_provider: "easebuzz",
        p_order_metadata: {
          easebuzz_pay_id: easepayid || `ebz_${Date.now()}`,
          easebuzz_txnid: txnid || `txn_${Date.now()}`,
          needs_accommodation: needsAccommodation,
          accommodation_status: needsAccommodation ? "requested" : "none",
          accommodation_payment: "in_person_on_campus",
          source: "easebuzz_hosted_callback",
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
      await adminClient.from("orders").update({
        gateway_order_id: txnid,
        status: "paid",
        metadata: {
          easebuzz_pay_id: easepayid,
          easebuzz_txnid: txnid,
          productinfo: productinfo || "Euphoria 2026 Pass",
          purpose: productinfo || "Euphoria 2026 Pass",
          udf6_candidate_id: data.udf6 || userId,
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
      }).eq("id", userId);
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
