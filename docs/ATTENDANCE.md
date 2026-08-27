# Attendance & Cryptographic QR Pass Engine

## 1. QR Pass Security & Cryptographic Signing

The QR pass displayed on the participant's device is not a raw database key or plain email. It is a signed, tamper-evident cryptographic token.

### 1.1 Token Payload Structure
```typescript
interface QrTokenPayload {
  r: string; // Registration Code (e.g. "EUPH-26-A8K9M2")
  e: string; // Event UUID
  u: string; // User UUID
  t: number; // Issued at timestamp (epoch ms)
  n: string; // Nonce (unique per registration)
}
```

### 1.2 Signature Generation & Verification
- **Generation**:
  `PayloadString = Base64UrlEncode(JSON.stringify(payload))`
  `Signature = Base64UrlEncode(HMAC_SHA256(PayloadString, QR_SIGNING_SECRET + nonce))`
  `QR_Token = PayloadString + "." + Signature`
- **Tamper Resistance**: If a participant modifies the event ID, registration code, or timestamp, the HMAC verification fails instantly.
- **Replay Protection**: The `nonce` is stored in `event_registrations.qr_secret_nonce`.

---

## 2. Event-Day Coordinator Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor C as Coordinator (Mobile Scanner)
    participant UI as Scan Terminal (Web/PWA)
    participant S as Next.js Server Action / Route
    participant DB as Supabase PostgreSQL

    C->>UI: Points camera at Participant QR
    UI->>UI: Decodes raw QR token string
    UI->>S: POST /api/attendance/verify (token, event_id)
    S->>S: Validate coordinator session & role
    S->>S: Verify HMAC-SHA256 signature
    S->>DB: CALL fn_record_attendance_atomic(coord_id, reg_code, event_id)
    
    alt Successful First Scan
        DB-->>S: Return { success: true, participant_name, reg_num, dept }
        S-->>UI: 200 OK (Green Screen + Haptic + Chime)
        UI-->>C: Display "CHECKED IN: [Name]"
    else Duplicate Scan
        DB-->>S: Return { success: false, error: 'ALREADY_CHECKED_IN', scanned_at }
        S-->>UI: 409 Conflict (Amber Warning Alert)
        UI-->>C: Display "ALREADY SCANNED AT [Time]"
    else Invalid / Unassigned Event
        DB-->>S: Return { success: false, error: 'UNAUTHORIZED / INVALID' }
        S-->>UI: 403 Forbidden (Red Alert)
        UI-->>C: Display "INVALID PASS FOR THIS EVENT"
    end
```

---

## 3. Fallback Manual Lookup

If camera scanning is impaired by cracked phone screens or low-light auditorium environments:
1. Coordinator switches to **"Manual Search"** tab.
2. Inputs Participant Register Number (Internal) or Email / Registration Code.
3. System fetches participant registration for that specific event.
4. Coordinator taps **"Confirm Check-In"** (logged as `scan_method = 'manual_search'`).
