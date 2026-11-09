/**
 * Payment provider abstraction. Paystack is the first implementation; add
 * other gateways by implementing this interface and registering them in
 * ./index.ts. Amounts are always in the smallest currency unit (kobo).
 */

export interface InitializeParams {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface InitializeResult {
  authorizationUrl: string;
  reference: string;
}

export interface PaymentAuthorization {
  authorizationCode: string;
  reusable: boolean;
  last4: string | null;
  brand: string | null;
  expMonth: string | null;
  expYear: string | null;
  signature: string | null;
}

export type ProviderTxStatus = "success" | "failed" | "abandoned" | "reversed" | "pending";

export interface VerifiedTransaction {
  reference: string;
  status: ProviderTxStatus;
  amount: number;
  currency: string;
  paidAt: string | null;
  channel: string | null;
  gatewayResponse: string | null;
  customerCode: string | null;
  customerEmail: string | null;
  authorization: PaymentAuthorization | null;
}

export interface ChargeAuthorizationParams {
  email: string;
  amount: number;
  currency: string;
  authorizationCode: string;
  reference: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface PaymentProvider {
  readonly id: "paystack";
  isConfigured(): boolean;
  initializeTransaction(params: InitializeParams): Promise<InitializeResult>;
  verifyTransaction(reference: string): Promise<VerifiedTransaction>;
  chargeAuthorization(params: ChargeAuthorizationParams): Promise<VerifiedTransaction>;
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
