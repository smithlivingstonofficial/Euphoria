# Modular Payment Architecture & Verification Specification

## 1. Modular Provider Interface

The payment subsystem is decoupled using the Dependency Inversion Principle. No database query or frontend component references a specific payment gateway SDK directly.

```typescript
export interface PaymentOrderParams {
  registrationId: string;
  userId: string;
  amount: number; // in INR
  currency: 'INR';
  description: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface PaymentOrderResult {
  orderId: string;
  provider: string;
  amount: number;
  currency: string;
  gatewayKey?: string; // Public client key if required by SDK
  checkoutUrl?: string; // Redirect URL for hosted checkouts
  extraParams?: Record<string, unknown>;
}

export interface PaymentVerificationParams {
  orderId: string;
  paymentId: string;
  signature: string;
  rawPayload?: Record<string, unknown>;
}

export interface IPaymentProvider {
  createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: PaymentVerificationParams): Promise<boolean>;
  handleWebhook(rawBody: string, signatureHeader: string): Promise<{
    success: boolean;
    orderId: string;
    paymentId: string;
    status: 'paid' | 'failed';
    raw: unknown;
  }>;
}
```

---

## 2. Mock Payment Provider (Zero-Cost Dev & Testing)

The system includes a built-in `MockPaymentProvider` that simulates order creation, checkout modal, and cryptographically verified server-side callbacks without requiring external merchant accounts or test credentials.

---

## 3. Server-Side Verification Flow

```
+---------------+              +------------------+             +--------------------+
|  Client App   |              |  Next.js Server  |             |  Payment Gateway   |
+-------+-------+              +--------+---------+             +---------+----------+
        |                               |                                 |
        | 1. Initiate Payment           |                                 |
        |------------------------------>| 2. Create Provider Order        |
        |                               |-------------------------------->|
        |                               | 3. Returns Order ID             |
        |                               |<--------------------------------|
        | 4. Return Order Details       |                                 |
        |<------------------------------|                                 |
        |                                                                 |
        | 5. Process Checkout (Gateway Modal / Hosted Page)               |
        |---------------------------------------------------------------->|
        | 6. Returns Payment Signature                                    |
        |<----------------------------------------------------------------|
        |                                                                 |
        | 7. Submit Verification Payload                                  |
        |------------------------------>| 8. Verify HMAC / Gateway API    |
        |                               |-------------------------------->|
        |                               | 9. Cryptographic match OK       |
        |                               |<--------------------------------|
        |                               |                                 |
        |                               | 10. Update DB (atomic tx):      |
        |                               |     - payments: 'paid'          |
        |                               |     - registrations: 'confirmed'|
        |                               |                                 |
        | 11. Confirmation & QR Pass    |                                 |
        |<------------------------------|                                 |
```

> [!IMPORTANT]
> Frontend success callbacks are treated as hints only. The database record is ONLY marked `confirmed` after the server validates the signature with the merchant secret or processes the authoritative webhook.
