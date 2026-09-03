import { NextResponse } from "next/server";
import { getEasebuzzCredentials, getEasebuzzApiUrls, generateEasebuzzHash } from "@/lib/payments/easebuzz";

function maskSecret(val: string): string {
  if (!val) return "NOT CONFIGURED";
  if (val.length <= 6) return "****";
  return `${val.slice(0, 3)}****${val.slice(-3)}`;
}

export async function GET() {
  try {
    const creds = getEasebuzzCredentials();
    const urls = getEasebuzzApiUrls(creds.env);

    // Run test hash verification to ensure SHA-512 engine is functional
    const testSampleHash = generateEasebuzzHash({
      key: creds.key || "TESTKEY",
      txnid: "TEST_TXN_001",
      amount: 200,
      productinfo: "TEST PRODUCT",
      firstname: "Test User",
      email: "test@example.com",
      salt: creds.salt || "TESTSALT",
    });

    const isReady = Boolean(creds.key && creds.salt);

    return NextResponse.json({
      status: isReady ? "READY" : "CREDENTIALS_INCOMPLETE",
      provider: process.env.PAYMENT_PROVIDER || "easebuzz",
      environment: creds.env,
      configuration: {
        hasKey: Boolean(creds.key),
        maskedKey: maskSecret(creds.key),
        hasSalt: Boolean(creds.salt),
        saltLength: creds.salt ? creds.salt.length : 0,
        merchantId: creds.merchantId || "NOT_SET",
        subMerchantId: creds.subMerchantId || "NOT_SET",
        baseUrl: creds.baseUrl,
      },
      apiEndpoints: urls,
      hashEngineReady: Boolean(testSampleHash && testSampleHash.length === 128),
      instructions: !isReady
        ? "Please set EASEBUZZ_KEY, EASEBUZZ_SALT, and NEXT_PUBLIC_EASEBUZZ_KEY in .env.local"
        : "Easebuzz configuration is loaded and ready for transactions.",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: "ERROR", message: errorMsg },
      { status: 500 }
    );
  }
}
