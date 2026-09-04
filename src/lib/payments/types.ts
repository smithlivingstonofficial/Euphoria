export interface EasebuzzInitiateParams {
  key: string;
  txnid: string;
  amount: number; // in INR e.g. 200.00
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  udf1?: string; // userId
  udf2?: string; // pass purpose / tier ("Euphoria 2026 Regular Pass" | "Euphoria 2026 Flagship Pass")
  udf3?: string; // registered event names
  udf4?: string; // needsAccommodation ('yes' | 'no')
  udf5?: string; // txnid / merchant order reference
  udf6?: string; // candidate unique registration number or candidate unique ID (Auditor requirement)
  udf7?: string; // audit event key: "Euphoria 2026" (Auditor requirement)
  udf8?: string; // college / institution name
  udf9?: string; // participant type & department
  udf10?: string; // city / location
  sub_merchant_id?: string;
  address1?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
}

export interface EasebuzzInitiateResponse {
  status: number; // 1 = success, 0 = failure
  data: string; // access_key on success, error message on failure
  error_desc?: string;
}

export interface EasebuzzResponseData {
  txnid: string;
  firstname: string;
  email: string;
  phone: string;
  key: string;
  mode?: string;
  status: string; // 'success' | 'failure' | 'userCancelled' | 'bounced'
  unmappedstatus?: string;
  cardCategory?: string;
  addedon?: string;
  payment_source?: string;
  bank_ref_num?: string;
  bankcode?: string;
  error?: string;
  error_Message?: string;
  net_amount_debit?: string | number;
  amount: string | number;
  easepayid: string; // Easebuzz Payment Transaction ID
  hash: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  udf6?: string;
  udf7?: string;
  udf8?: string;
  udf9?: string;
  udf10?: string;
  productinfo?: string;
  surl?: string;
  furl?: string;
}

export interface EasebuzzVerifyPayload {
  easepayid: string;
  txnid: string;
  amount: number | string;
  status: string;
  hash: string;
  eventIds: string[];
  needsAccommodation?: boolean;
  isTestPayment?: boolean;
  rawPayload?: Record<string, unknown>;
}

export interface CreateEasebuzzOrderResult {
  success: boolean;
  accessKey?: string;
  txnid?: string;
  amount?: number; // In rupees
  currency?: string;
  key?: string;
  env?: "test" | "prod";
  isTestPayment?: boolean;
  userProfile?: {
    name: string;
    email: string;
    phone: string;
  };
  error?: string;
  redirect?: string;
}

export interface VerifyEasebuzzPaymentResult {
  success: boolean;
  masterCode?: string;
  passTier?: string;
  totalRegistered?: number;
  totalPayable?: number;
  paymentId?: string;
  orderId?: string;
  orderNumber?: string;
  error?: string;
  redirect?: string;
}

// Generic / Mock Provider Interfaces
export interface PaymentOrderParams {
  registrationId: string;
  userId: string;
  amount: number; // in INR
  currency: "INR";
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
  status: "paid" | "failed";
  raw: unknown;
}

export interface IPaymentProvider {
  name: string;
  createOrder(params: PaymentOrderParams): Promise<PaymentOrderResult>;
  verifyPayment(params: PaymentVerificationParams): Promise<boolean>;
  handleWebhook(rawBody: string, signatureHeader: string): Promise<WebhookResult>;
}
