import crypto from "crypto";
import { EasebuzzInitiateParams, EasebuzzInitiateResponse, EasebuzzResponseData } from "./types";

/**
 * Retrieves Easebuzz configuration credentials from environment variables
 */
export function getEasebuzzCredentials() {
  const key =
    process.env.EASEBUZZ_KEY ||
    process.env.NEXT_PUBLIC_EASEBUZZ_KEY ||
    process.env.EASEBUZZ_MERCHANT_KEY ||
    "";

  const salt =
    process.env.EASEBUZZ_SALT ||
    process.env.EASEBUZZ_MERCHANT_SALT ||
    "";

  const env = (
    process.env.EASEBUZZ_ENV ||
    process.env.NEXT_PUBLIC_EASEBUZZ_ENV ||
    "test"
  ).toLowerCase() as "test" | "prod";

  const merchantId = process.env.EASEBUZZ_MERCHANT_ID || "";
  const subMerchantId =
    process.env.EASEBUZZ_SUB_MERCHANT_ID ||
    process.env.EASEBUZZ_MERCHANT_ID ||
    "";

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  return { key, salt, env, merchantId, subMerchantId, baseUrl };
}

/**
 * Returns the appropriate API base URLs based on the environment ('test' | 'prod')
 */
export function getEasebuzzApiUrls(env: "test" | "prod" = "test") {
  const isProd = env === "prod";
  return {
    initiateUrl: isProd
      ? "https://pay.easebuzz.in/payment/initiateLink"
      : "https://testpay.easebuzz.in/payment/initiateLink",
    hostedPayUrl: isProd
      ? "https://pay.easebuzz.in/pay/"
      : "https://testpay.easebuzz.in/pay/",
    transactionRetrieveUrl: isProd
      ? "https://dashboard.easebuzz.in/transaction/v1/retrieve"
      : "https://testdashboard.easebuzz.in/transaction/v1/retrieve",
    refundUrl: isProd
      ? "https://dashboard.easebuzz.in/transaction/v1/refund"
      : "https://testdashboard.easebuzz.in/transaction/v1/refund",
  };
}

/**
 * Generates the SHA-512 Hash required for Easebuzz Payment Initiation.
 *
 * Sequence:
 * key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|udf6|udf7|udf8|udf9|udf10|salt
 */
export function generateEasebuzzHash(params: {
  key: string;
  txnid: string;
  amount: number | string;
  productinfo: string;
  firstname: string;
  email: string;
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
  salt: string;
}): string {
  const {
    key = "",
    txnid = "",
    amount = "",
    productinfo = "",
    firstname = "",
    email = "",
    udf1 = "",
    udf2 = "",
    udf3 = "",
    udf4 = "",
    udf5 = "",
    udf6 = "",
    udf7 = "",
    udf8 = "",
    udf9 = "",
    udf10 = "",
    salt = "",
  } = params;

  // Format amount to exact float representation (e.g. 200.0 or 200.00 as sent)
  const formattedAmount =
    typeof amount === "number" ? amount.toFixed(2) : String(amount).trim();

  // All parameters must be trimmed to avoid hash mismatches
  const hashString = [
    String(key).trim(),
    String(txnid).trim(),
    formattedAmount,
    String(productinfo).trim(),
    String(firstname).trim(),
    String(email).trim(),
    String(udf1).trim(),
    String(udf2).trim(),
    String(udf3).trim(),
    String(udf4).trim(),
    String(udf5).trim(),
    String(udf6).trim(),
    String(udf7).trim(),
    String(udf8).trim(),
    String(udf9).trim(),
    String(udf10).trim(),
    String(salt).trim(),
  ].join("|");

  return crypto.createHash("sha512").update(hashString).digest("hex");
}

/**
 * Validates the Easebuzz reverse SHA-512 Hash on received payment responses.
 *
 * Sequence:
 * salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
 */
export function verifyEasebuzzResponseHash(
  payload: Partial<EasebuzzResponseData> & {
    salt: string;
    key?: string;
  }
): boolean {
  try {
    const {
      salt = "",
      status = "",
      udf10 = "",
      udf9 = "",
      udf8 = "",
      udf7 = "",
      udf6 = "",
      udf5 = "",
      udf4 = "",
      udf3 = "",
      udf2 = "",
      udf1 = "",
      email = "",
      firstname = "",
      productinfo = "",
      amount = "",
      txnid = "",
      key = "",
      hash = "",
    } = payload;

    if (!hash || !salt) {
      return false;
    }

    const formattedAmount =
      typeof amount === "number" ? amount.toFixed(2) : String(amount).trim();

    const reverseHashString = [
      String(salt).trim(),
      String(status).trim(),
      String(udf10).trim(),
      String(udf9).trim(),
      String(udf8).trim(),
      String(udf7).trim(),
      String(udf6).trim(),
      String(udf5).trim(),
      String(udf4).trim(),
      String(udf3).trim(),
      String(udf2).trim(),
      String(udf1).trim(),
      String(email).trim(),
      String(firstname).trim(),
      String(productinfo).trim(),
      formattedAmount,
      String(txnid).trim(),
      String(key).trim(),
    ].join("|");

    const calculatedHash = crypto
      .createHash("sha512")
      .update(reverseHashString)
      .digest("hex");

    return calculatedHash.toLowerCase() === String(hash).trim().toLowerCase();
  } catch (err) {
    console.error("Error in verifyEasebuzzResponseHash:", err);
    return false;
  }
}

/**
 * Initiates an Easebuzz payment by POSTing to the initiateLink endpoint.
 * Returns the access_key (token) on success.
 */
export async function initiateEasebuzzPayment(
  params: EasebuzzInitiateParams,
  salt: string,
  env: "test" | "prod" = "test"
): Promise<EasebuzzInitiateResponse> {
  try {
    const hash = generateEasebuzzHash({
      key: params.key,
      txnid: params.txnid,
      amount: params.amount,
      productinfo: params.productinfo,
      firstname: params.firstname,
      email: params.email,
      udf1: params.udf1,
      udf2: params.udf2,
      udf3: params.udf3,
      udf4: params.udf4,
      udf5: params.udf5,
      udf6: params.udf6,
      udf7: params.udf7,
      udf8: params.udf8,
      udf9: params.udf9,
      udf10: params.udf10,
      salt: salt,
    });

    const formData = new URLSearchParams();
    formData.append("key", String(params.key).trim());
    formData.append("txnid", String(params.txnid).trim());
    formData.append("amount", params.amount.toFixed(2));
    formData.append("productinfo", String(params.productinfo).trim());
    formData.append("firstname", String(params.firstname).trim());
    formData.append("phone", String(params.phone).trim());
    formData.append("email", String(params.email).trim());
    formData.append("surl", String(params.surl).trim());
    formData.append("furl", String(params.furl).trim());
    formData.append("hash", hash);

    if (params.udf1) formData.append("udf1", String(params.udf1).trim());
    if (params.udf2) formData.append("udf2", String(params.udf2).trim());
    if (params.udf3) formData.append("udf3", String(params.udf3).trim());
    if (params.udf4) formData.append("udf4", String(params.udf4).trim());
    if (params.udf5) formData.append("udf5", String(params.udf5).trim());
    if (params.udf6) formData.append("udf6", String(params.udf6).trim());
    if (params.udf7) formData.append("udf7", String(params.udf7).trim());
    if (params.udf8) formData.append("udf8", String(params.udf8).trim());
    if (params.udf9) formData.append("udf9", String(params.udf9).trim());
    if (params.udf10) formData.append("udf10", String(params.udf10).trim());
    if (params.sub_merchant_id)
      formData.append("sub_merchant_id", String(params.sub_merchant_id).trim());
    if (params.address1) formData.append("address1", String(params.address1).trim());
    if (params.city) formData.append("city", String(params.city).trim());
    if (params.state) formData.append("state", String(params.state).trim());
    if (params.country) formData.append("country", String(params.country).trim());
    if (params.zipcode) formData.append("zipcode", String(params.zipcode).trim());

    const { initiateUrl } = getEasebuzzApiUrls(env);

    const response = await fetch(initiateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Easebuzz initiate API HTTP error:", response.status, errText);
      return {
        status: 0,
        data: `Easebuzz API Error (${response.status}): ${errText}`,
      };
    }

    const jsonResult: EasebuzzInitiateResponse = await response.json();
    return jsonResult;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error initiating Easebuzz payment";
    console.error("Easebuzz initiate exception:", msg);
    return {
      status: 0,
      data: msg,
    };
  }
}

/**
 * Server-to-server transaction status check using Easebuzz Transaction Retrieve API.
 */
export async function checkEasebuzzTransactionStatus(params: {
  key: string;
  txnid: string;
  amount: number | string;
  email: string;
  phone: string;
  salt: string;
  env?: "test" | "prod";
}) {
  try {
    const { key, txnid, amount, email, phone, salt, env = "test" } = params;

    const formattedAmount =
      typeof amount === "number" ? amount.toFixed(2) : String(amount).trim();

    // Retrieve hash sequence: key|txnid|amount|email|phone|salt
    const hashString = [
      String(key).trim(),
      String(txnid).trim(),
      formattedAmount,
      String(email).trim(),
      String(phone).trim(),
      String(salt).trim(),
    ].join("|");

    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    const formData = new URLSearchParams();
    formData.append("key", String(key).trim());
    formData.append("txnid", String(txnid).trim());
    formData.append("amount", formattedAmount);
    formData.append("email", String(email).trim());
    formData.append("phone", String(phone).trim());
    formData.append("hash", hash);

    const { transactionRetrieveUrl } = getEasebuzzApiUrls(env);

    const response = await fetch(transactionRetrieveUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return { status: false, msg: `HTTP error ${response.status}` };
    }

    return await response.json();
  } catch (err) {
    console.error("Error retrieving Easebuzz transaction:", err);
    return { status: false, msg: "Failed to retrieve transaction" };
  }
}
