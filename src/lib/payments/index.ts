import { PaystackProvider } from "./paystack";
import type { PaymentProvider } from "./provider";

export * from "./provider";

let provider: PaymentProvider | null = null;

/** The active payment gateway. Swap/extend here to support more providers. */
export function getPaymentProvider(): PaymentProvider {
  if (!provider) provider = new PaystackProvider();
  return provider;
}
