import crypto from "crypto";

export interface QrTokenPayload {
  r: string; // registration_code
  e: string; // event_id
  u: string; // user_id
  t: number; // timestamp
}

const QR_SECRET = process.env.QR_SIGNING_SECRET || "euphoria-kare-default-secret-salt-2026";

/**
 * Generate a cryptographically signed QR token string.
 * Format: base64(payload).base64(hmac_signature)
 */
export function generateSignedQrToken(
  registrationCode: string,
  eventId: string,
  userId: string,
  nonce: string
): string {
  const payload: QrTokenPayload = {
    r: registrationCode,
    e: eventId,
    u: userId,
    t: Date.now(),
  };

  const payloadString = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signatureKey = `${QR_SECRET}:${nonce}`;
  const hmac = crypto.createHmac("sha256", signatureKey);
  hmac.update(payloadString);
  const signature = hmac.digest("base64url");

  return `${payloadString}.${signature}`;
}

/**
 * Verify a signed QR token string.
 */
export function verifySignedQrToken(
  tokenString: string,
  nonce: string
): { valid: boolean; payload?: QrTokenPayload; error?: string } {
  try {
    const parts = tokenString.split(".");
    if (parts.length !== 2) {
      return { valid: false, error: "MALFORMED_TOKEN" };
    }

    const [payloadString, signature] = parts;
    const signatureKey = `${QR_SECRET}:${nonce}`;
    const hmac = crypto.createHmac("sha256", signatureKey);
    hmac.update(payloadString);
    const expectedSignature = hmac.digest("base64url");

    if (signature !== expectedSignature) {
      return { valid: false, error: "INVALID_SIGNATURE" };
    }

    const payloadJson = Buffer.from(payloadString, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as QrTokenPayload;

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "VERIFICATION_FAILED" };
  }
}
