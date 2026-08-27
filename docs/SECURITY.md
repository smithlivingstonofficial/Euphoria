# Security Strategy, Threat Model & Mitigations

## 1. Threat Modeling & Risk Mitigation Matrix

| Threat Vector | Attack Scenario | Architectural Mitigation |
| :--- | :--- | :--- |
| **Race Condition / Overselling** | Concurrent users clicking "Register" when 1 slot remains | PostgreSQL `FOR UPDATE` lock inside `fn_register_event_atomic` RPC ensures atomic sequential execution. |
| **Duplicate Event Registration** | User attempts multiple registrations for same event | Composite Database Unique Index `UNIQUE(event_id, user_id)` forces rejection at DB storage layer. |
| **Domain Spoofing** | External student attempts to claim internal student pricing | `participant_type` derived strictly from verified `auth.users.email` domain (`@klu.ac.in`) during signup trigger and locked from user updates. |
| **Tampered Payment Confirmation** | Attacker calls `/api/payment/verify` with fake success data | Verification requires cryptographic HMAC signature check using server-only webhook/merchant secret. |
| **Forged / Replayed QR Pass** | Attacker creates fake QR code or forwards a screenshot to a friend | QR pass contains HMAC-SHA256 signature tied to DB nonce; single-checkin database constraint prevents reuse. |
| **Cross-Event Privilege Escalation** | Coordinator for Event A scans or views data for Event B | PostgreSQL RLS policies enforce `is_coordinator_for_event(event_id)` at row level. |
| **Brute Force / Scraping** | Script spamming registration or auth endpoints | In-memory token bucket rate limiter on edge routes + Supabase built-in auth rate limits. |
| **Secret Leaks** | Exposing database connection strings or payment secrets | Zero server secrets in client bundle; strictly accessed in Server Actions & Route Handlers via `process.env`. |

---

## 2. Row Level Security Defense-in-Depth

Supabase Row Level Security ensures that even if an attacker manipulates the client-side JavaScript, calls raw PostgREST endpoints, or exploits a frontend logic bug, the PostgreSQL database engine actively blocks unauthorized reads, inserts, and updates.
