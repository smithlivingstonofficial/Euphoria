# System Architecture & Design Specification

## 1. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------------+
|                                  CLIENT TIER                                  |
|                                                                               |
|  +--------------------+  +--------------------+  +-------------------------+  |
|  |  Public & Student  |  | Student / Staff    |  |  Super Admin Console    |  |
|  |  Mobile Web App    |  | Coordinator App    |  |  (Desktop Optimized)   |  |
|  +---------+----------+  +---------+----------+  +------------+------------+  |
+------------|-----------------------|--------------------------|---------------+
             |                       |                          |
             | HTTPS (Next.js SSR / Server Actions / RSC)       |
             v                       v                          v
+-------------------------------------------------------------------------------+
|                            NEXT.JS APPLICATION TIER (Vercel)                  |
|                                                                               |
|  [Edge & Serverless Compute Engine]                                           |
|  - Route Middleware (Auth session validation, RBAC route interception)        |
|  - React Server Components (Cached static event catalogs, SSR dashboards)     |
|  - Server Actions (Zod-validated mutations: register, profile, scan)          |
|  - Route Handlers (Payment Webhooks, QR Verification API, CSV Exporters)      |
|                                                                               |
|  [Modular Subsystems]                                                         |
|  +------------------+  +------------------+  +-----------------------------+  |
|  | Auth Bridge      |  | Payment Engine   |  | QR Crypto Token Engine      |  |
|  | (Supabase SSR)   |  | (Modular Driver) |  | (HMAC-SHA256 Sign/Verify)   |  |
|  +--------+---------+  +--------+---------+  +--------------+--------------+  |
+-----------|---------------------|---------------------------|-----------------+
            |                     |                           |
            | Supabase PostgREST / Postgres Connection Pool   |
            v                     v                           v
+-------------------------------------------------------------------------------+
|                            SUPABASE DATA & SECURITY TIER                      |
|                                                                               |
|  [PostgreSQL 15+ Engine]                                                      |
|  +-------------------------------------------------------------------------+  |
|  | Row Level Security (RLS) Policies (Enforced on EVERY table)             |  |
|  | Tables: profiles, events, registrations, payments, attendance, etc.     |  |
|  +-------------------------------------------------------------------------+  |
|  | Stored Procedures & Atomic Functions (PL/pgSQL RPC):                    |  |
|  | - fn_register_event_atomic() [Eliminates race conditions & overselling] |  |
|  | - fn_record_attendance_atomic() [Atomically validates & marks check-in]  |  |
|  | - fn_has_event_access(user_id, event_id, role)                          |  |
|  +-------------------------------------------------------------------------+  |
|  | Built-in Supabase Auth & JWT with Custom Claims                         |  |
|  | Realtime engine (Optional / scoped for live check-in telemetry)         |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 2. Architectural Decisions & Rationale

### 2.1 Next.js App Router with Server Actions
- **Why**: Eliminates the overhead of a separate Express or NestJS backend. Keeps the entire backend logic in TypeScript, collocated with types and validation schemas.
- **Data Fetching**: Public pages and static event details utilize Incremental Static Regeneration (ISR) / React Cache. Authenticated dashboard routes use dynamic React Server Components for zero-bundle-size database queries.
- **Mutations**: Performed via Server Actions with end-to-end type safety, Zod schema validation, and automatic cache invalidation (`revalidatePath`).

### 2.2 Supabase as the Single Backend
- **PostgreSQL**: Industry standard relational engine with powerful indexing, constraints, foreign keys, and JSON support.
- **Row Level Security (RLS)**: Enforces security at the database row level. Even if an API endpoint has a logic bug, the database rejects queries that violate policy.
- **Auth**: Built-in user sessions, password hashing, and cookie management using `@supabase/ssr`.

### 2.3 Modular Payment Abstraction Layer
- Architecture defines a standard interface `PaymentProvider`:
  ```typescript
  export interface PaymentProvider {
    createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
    verifyPaymentSignature(params: VerifyPaymentParams): Promise<boolean>;
    handleWebhook(payload: unknown, signature: string): Promise<WebhookResult>;
  }
  ```
- Ships with:
  1. `MockPaymentProvider` (Zero-cost sandbox for local development and offline testing).
  2. Ready adapters for Razorpay / Cashfree / custom UPI gateway without altering database schema or business logic.

### 2.4 Cryptographic QR Verification Architecture
- QR codes do not store plaintext IDs or raw database keys directly.
- The system generates an encrypted/signed token:
  `Token = Base64URL(JSON({ reg_id, event_id, issued_at, exp })) + "." + HMAC_SHA256(payload, APP_SECRET)`
- Verification is performed on the server via `fn_record_attendance_atomic` RPC to ensure instantaneous, tamper-proof attendance logging.
