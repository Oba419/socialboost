/**
 * Paystack implementation (https://paystack.com/docs/api/).
 *
 * Intentionally free of `server-only` / app imports other than env so it can be
 * unit tested; it is only ever imported from server code.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { publicEnv, serverEnv } from "@/lib/env";
import {
  PaymentProviderError,
  type ChargeAuthorizationParams,
  type InitializeParams,
  type InitializeResult,
  type PaymentProvider,
  type ProviderTxStatus,
  type VerifiedTransaction,
} from "./provider";

const BASE_URL = "https://api.paystack.co";
const TIMEOUT_MS = 20_000;

/** HMAC-SHA512 of the raw body with the secret key, compared in constant time. */
export function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function mapPaystackStatus(status: string | undefined | null): ProviderTxStatus {
  switch (status) {
    case "success":
      return "success";
    case "failed":
      return "failed";
    case "abandoned":
      return "abandoned";
    case "reversed":
      return "reversed";
    default:
      // ongoing, pending, processing, queued, send_otp, send_pin, ...
      return "pending";
  }
}

interface PaystackTxData {
  reference?: string;
  status?: string;
  amount?: number;
  currency?: string;
  paid_at?: string | null;
  paidAt?: string | null;
  channel?: string | null;
  gateway_response?: string | null;
  customer?: { customer_code?: string | null; email?: string | null } | null;
  authorization?: {
    authorization_code?: string;
    reusable?: boolean;
    last4?: string;
    card_type?: string;
    brand?: string;
    exp_month?: string;
    exp_year?: string;
    signature?: string;
  } | null;
}

export function normaliseTransaction(data: PaystackTxData, fallbackReference: string): VerifiedTransaction {
  const auth = data.authorization;
  return {
    reference: data.reference ?? fallbackReference,
    status: mapPaystackStatus(data.status),
    amount: Number(data.amount ?? 0),
    currency: (data.currency ?? "").toUpperCase(),
    paidAt: data.paid_at ?? data.paidAt ?? null,
    channel: data.channel ?? null,
    gatewayResponse: data.gateway_response ?? null,
    customerCode: data.customer?.customer_code ?? null,
    customerEmail: data.customer?.email ?? null,
    authorization: auth?.authorization_code
      ? {
          authorizationCode: auth.authorization_code,
          reusable: Boolean(auth.reusable),
          last4: auth.last4 ?? null,
          brand: auth.brand ?? auth.card_type ?? null,
          expMonth: auth.exp_month ?? null,
          expYear: auth.exp_year ?? null,
          signature: auth.signature ?? null,
        }
      : null,
  };
}

export class PaystackProvider implements PaymentProvider {
  readonly id = "paystack" as const;

  constructor(
    private readonly getSecret: () => string | undefined = () => serverEnv().PAYSTACK_SECRET_KEY,
    private readonly fetchImpl: typeof fetch = (...args) => fetch(...args),
  ) {}

  isConfigured(): boolean {
    return Boolean(this.getSecret() && publicEnv.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY);
  }

  private secret(): string {
    const s = this.getSecret();
    if (!s) throw new PaymentProviderError("PAYSTACK_SECRET_KEY is not set.");
    return s;
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await this.fetchImpl(`${BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.secret()}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (e) {
      throw new PaymentProviderError(
        e instanceof Error && e.name === "AbortError" ? "Paystack request timed out." : "Could not reach Paystack.",
      );
    } finally {
      clearTimeout(timer);
    }
    const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
    if (!res.ok || !json || json.status !== true || json.data === undefined) {
      // Paystack messages never contain secrets; safe to surface to logs.
      throw new PaymentProviderError(json?.message ?? `Paystack request failed (${res.status}).`, res.status);
    }
    return json.data;
  }

  async initializeTransaction(p: InitializeParams): Promise<InitializeResult> {
    const data = await this.request<{ authorization_url: string; reference: string }>("POST", "/transaction/initialize", {
      email: p.email,
      amount: p.amount,
      currency: p.currency,
      reference: p.reference,
      callback_url: p.callbackUrl,
      metadata: p.metadata,
    });
    return { authorizationUrl: data.authorization_url, reference: data.reference ?? p.reference };
  }

  async verifyTransaction(reference: string): Promise<VerifiedTransaction> {
    const data = await this.request<PaystackTxData>("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
    return normaliseTransaction(data, reference);
  }

  async chargeAuthorization(p: ChargeAuthorizationParams): Promise<VerifiedTransaction> {
    const data = await this.request<PaystackTxData>("POST", "/transaction/charge_authorization", {
      authorization_code: p.authorizationCode,
      email: p.email,
      amount: p.amount,
      currency: p.currency,
      reference: p.reference,
      metadata: p.metadata,
    });
    return normaliseTransaction(data, p.reference);
  }

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    const secret = this.getSecret();
    if (!secret) return false;
    return verifyPaystackSignature(rawBody, signature, secret);
  }
}
