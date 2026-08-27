import { IPaymentProvider } from "./types";
import { MockPaymentProvider } from "./mock-provider";

export * from "./types";
export * from "./mock-provider";

export function getPaymentProvider(): IPaymentProvider {
  const providerName = process.env.PAYMENT_PROVIDER || "mock";

  switch (providerName.toLowerCase()) {
    case "mock":
    default:
      return new MockPaymentProvider();
  }
}
