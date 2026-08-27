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
  gatewayKey?: string;
  checkoutUrl?: string;
  extraParams?: Record<string, unknown>;
}

export interface PaymentVerificationParams {
  orderId: string;
  paymentId: string;
  signature: string;
  rawPayload?: Record<string, unknown>;
}

export interface WebhookResult {
  success: boolean;
  orderId: string;
  paymentId: string;
  status: 'paid' | 'failed';
  raw: unknown;
}

export interface IPaymentProvider {
  name: string;
  createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: PaymentVerificationParams): Promise<boolean>;
  handleWebhook(rawBody: string, signatureHeader: string): Promise<WebhookResult>;
}
