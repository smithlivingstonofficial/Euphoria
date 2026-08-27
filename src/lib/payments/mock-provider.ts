import crypto from "crypto";
import {
  IPaymentProvider,
  PaymentOrderParams,
  PaymentOrderResult,
  PaymentVerificationParams,
  WebhookResult,
} from "./types";

const MOCK_SECRET = process.env.PAYMENT_SECRET || "euphoria-mock-payment-secret-2026";

export class MockPaymentProvider implements IPaymentProvider {
  name = "mock";

  async createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult> {
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return {
      orderId,
      provider: this.name,
      amount: params.amount,
      currency: params.currency,
      checkoutUrl: `/checkout/mock?orderId=${orderId}&amount=${params.amount}`,
    };
  }

  async verifyPayment(params: PaymentVerificationParams): Promise<boolean> {
    // Generate HMAC of orderId:paymentId using mock secret
    const expected = crypto
      .createHmac("sha256", MOCK_SECRET)
      .update(`${params.orderId}:${params.paymentId}`)
      .digest("hex");

    return params.signature === expected;
  }

  async handleWebhook(rawBody: string, signatureHeader: string): Promise<WebhookResult> {
    const expected = crypto
      .createHmac("sha256", MOCK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (expected !== signatureHeader) {
      return {
        success: false,
        orderId: "",
        paymentId: "",
        status: "failed",
        raw: null,
      };
    }

    const data = JSON.parse(rawBody);
    return {
      success: true,
      orderId: data.orderId,
      paymentId: data.paymentId,
      status: data.status === "SUCCESS" ? "paid" : "failed",
      raw: data,
    };
  }
}
