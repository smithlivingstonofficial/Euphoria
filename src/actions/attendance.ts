"use server";

import { createClient } from "@/lib/supabase/server";
import { verifySignedQrToken } from "@/lib/crypto/qr";

export async function verifyAndRecordAttendance(params: {
  eventId: string;
  tokenOrCode: string;
  scanMethod: "qr_camera" | "manual_search";
}) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "UNAUTHORIZED_COORDINATOR" };
    }

    let registrationCode = params.tokenOrCode;

    // If it's a signed QR token, decode and verify signature
    if (params.tokenOrCode.includes(".")) {
      // Fetch the registration's nonce to verify
      const parts = params.tokenOrCode.split(".");
      const payloadString = parts[0];
      const payloadJson = Buffer.from(payloadString, "base64url").toString("utf8");
      const parsed = JSON.parse(payloadJson);
      registrationCode = parsed.r;

      const { data: reg } = await supabase
        .from("event_registrations")
        .select("qr_secret_nonce")
        .eq("registration_code", registrationCode)
        .single();

      if (!reg) {
        return { success: false, error: "REGISTRATION_NOT_FOUND" };
      }

      const verification = verifySignedQrToken(params.tokenOrCode, reg.qr_secret_nonce);
      if (!verification.valid) {
        return { success: false, error: "INVALID_TAMPERED_QR" };
      }
    }

    // Call atomic attendance check-in PostgreSQL RPC
    const { data, error } = await supabase.rpc("fn_record_attendance_atomic", {
      p_coordinator_id: user.id,
      p_registration_code: registrationCode,
      p_event_id: params.eventId,
      p_scan_method: params.scanMethod,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Attendance recording failed";
    return { success: false, error: msg };
  }
}
