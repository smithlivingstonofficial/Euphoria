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
    let isValidHash = verifyEasebuzzResponseHash({
      ...payload,
      salt,
      key,
    });

    if (!isValidHash && txnid) {
      console.warn("Webhook reverse hash check failed, verifying directly with Easebuzz v2 API...", { txnid, easepayid });
      const { checkEasebuzzTransactionStatus } = await import("@/lib/payments/easebuzz");
      const liveVerify = await checkEasebuzzTransactionStatus({ txnid });
      if (liveVerify?.status && (liveVerify.msg?.status || "").toLowerCase() === "success") {
        isValidHash = true;
      }
    }

    if (!isValidHash) {
      console.warn("Easebuzz Webhook reverse hash mismatch:", { txnid, easepayid });
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 400 });
    }

    const isSuccess = (status || "").toLowerCase() === "success";
    const adminClient = await createAdminClient();

    // Look up attempted order
    let pendingOrder: any = null;
    if (txnid) {
      try {
        const { data: ord } = await adminClient
          .from("orders")
          .select("*")
          .eq("order_number", txnid)
          .maybeSingle();
        pendingOrder = ord;
      } catch (ordErr) {
        console.warn("Webhook pending order lookup warning:", ordErr);
      }
    }

    const targetUserId = userId || pendingOrder?.user_id;

    if (isSuccess && targetUserId) {
      const rawEvents = pendingOrder?.metadata?.event_ids || pendingOrder?.metadata?.event_names || eventIdsStr;
      const { resolveEventIds } = await import("@/lib/payments/easebuzz");
      const resolvedEventIds = await resolveEventIds(rawEvents, adminClient);
      const needsAccommodation = needsAccommStr === "yes" || Boolean(pendingOrder?.metadata?.needs_accommodation);

      if (resolvedEventIds.length > 0) {
        // Check first if user already has an active pass
        const { data: existingUserPass } = await adminClient
          .from("delegate_passes")
          .select("id, pass_code, pass_tier, slots_used, total_slots")
          .eq("user_id", targetUserId)
          .eq("status", "active")
          .maybeSingle();

        if (existingUserPass) {
          if (txnid) {
            try {
              await adminClient.from("orders").update({
                status: "paid",
                gateway_order_id: txnid,
                gateway_payment_id: easepayid || null,
              }).eq("order_number", txnid);
            } catch {}
          }
        } else {
          // Execute atomic RPC with bypass_limits: true
          const { data: checkoutData, error: checkoutError } = await adminClient.rpc(
            "fn_checkout_pass_atomic",
            {
              p_user_id: targetUserId,
              p_event_ids: resolvedEventIds,
              p_payment_provider: "easebuzz",
              p_order_metadata: {
                easebuzz_pay_id: easepayid || null,
                easebuzz_txnid: txnid,
                source: "easebuzz_webhook",
                needs_accommodation: needsAccommodation,
                bypass_limits: true,
                timestamp: new Date().toISOString(),
              },
            }
          );

          if (!checkoutError && checkoutData?.success && checkoutData.order_id) {
            if (pendingOrder?.id && pendingOrder.id !== checkoutData.order_id) {
              try {
                await adminClient.from("orders").delete().eq("id", pendingOrder.id);
              } catch (delErr) {
                console.warn("Notice: cleaning attempted order row in webhook:", delErr);
              }
            }

            await adminClient.from("orders").update({
              order_number: txnid || undefined,
              gateway_order_id: txnid,
              gateway_payment_id: easepayid || null,
              status: "paid",
              metadata: {
                ...pendingOrder?.metadata,
                easebuzz_pay_id: easepayid,
                easebuzz_txnid: txnid,
                source: "easebuzz_webhook",
                timestamp: new Date().toISOString(),
              },
            }).eq("id", checkoutData.order_id);

            if (needsAccommodation) {
              await adminClient.from("profiles").update({
                needs_accommodation: true,
              }).eq("id", targetUserId);
            }
          } else {
            // Direct service-role fulfillment fallback
            console.warn("Notice: webhook executing service-role direct fulfillment fallback:", checkoutError || checkoutData);

            const { data: targetEventRows } = await adminClient
              .from("events")
              .select("id, name, is_pro_event, participant_limit")
              .in("id", resolvedEventIds);

            const hasPro = (targetEventRows || []).some((e: any) => Boolean(e.is_pro_event));
            const passTier = hasPro ? "pro_pass" : "standard_pass";
            const passFee = hasPro ? 300 : 200;
            const orderNumber = txnid || `ORD-26-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
            const generatedPassCode = `EUPH-26-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

            const { data: newOrder } = await adminClient
              .from("orders")
              .upsert(
                {
                  user_id: targetUserId,
                  order_number: orderNumber,
                  amount: passFee,
                  currency: "INR",
                  status: "paid",
                  provider: "easebuzz",
                  gateway_order_id: txnid,
                  gateway_payment_id: easepayid || null,
                  metadata: {
                    easebuzz_pay_id: easepayid || null,
                    easebuzz_txnid: txnid,
                    amount_paid: passFee,
                    source: "easebuzz_webhook_direct_fallback",
                    pass_tier: passTier,
                    event_ids: resolvedEventIds,
                    needs_accommodation: needsAccommodation,
                    bypassed_limits: true,
                    timestamp: new Date().toISOString(),
                  },
                },
                { onConflict: "order_number" }
              )
              .select("id, order_number")
              .single();

            const { data: newPass } = await adminClient
              .from("delegate_passes")
              .insert({
                user_id: targetUserId,
                order_id: newOrder?.id || null,
                pass_code: generatedPassCode,
                pass_tier: passTier,
                amount_paid: passFee,
                total_slots: 2,
                slots_used: resolvedEventIds.length,
                status: "active",
                qr_secret_nonce: nonce,
              })
              .select("id, pass_code")
              .single();

            if (newPass) {
              for (let idx = 0; idx < resolvedEventIds.length; idx++) {
                const evtId = resolvedEventIds[idx];
                const slotNum = idx + 1;
                const regCode = `${generatedPassCode}-S${slotNum}`;

                await adminClient.from("event_registrations").insert({
                  pass_id: newPass.id,
                  event_id: evtId,
                  user_id: targetUserId,
                  slot_number: slotNum,
                  registration_code: regCode,
                  status: "confirmed",
                  payment_status: "paid",
                  qr_secret_nonce: Math.random().toString(36).substring(2),
                });
              }

              if (needsAccommodation) {
                await adminClient.from("profiles").update({ needs_accommodation: true }).eq("id", targetUserId);
              }
            }
          }
        }

        revalidateTag("public-events");
        revalidatePath("/dashboard", "page");
      }
    } else if (pendingOrder?.id) {
      // Mark pending order as failed if status is failure
      await adminClient.from("orders").update({
        status: isSuccess ? "paid" : "failed",
        metadata: {
          ...pendingOrder.metadata,
          easebuzz_pay_id: easepayid,
          easebuzz_txnid: txnid,
          webhook_status: status,
          timestamp: new Date().toISOString(),
        },
      }).eq("id", pendingOrder.id);
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("Easebuzz webhook error:", err);
    return NextResponse.json({ success: false, message: "Internal error" }, { status: 500 });
  }
}
