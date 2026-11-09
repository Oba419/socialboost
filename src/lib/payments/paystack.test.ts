import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { mapPaystackStatus, normaliseTransaction, PaystackProvider, verifyPaystackSignature } from "./paystack";

const SECRET = "sk_test_unit_secret";
const sign = (body: string, secret = SECRET) => createHmac("sha512", secret).update(body).digest("hex");

describe("verifyPaystackSignature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "sb_abc", amount: 500000 } });

  it("accepts a valid signature", () => {
    expect(verifyPaystackSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a missing or empty signature", () => {
    expect(verifyPaystackSignature(body, null, SECRET)).toBe(false);
    expect(verifyPaystackSignature(body, "", SECRET)).toBe(false);
  });

  it("rejects a signature made with another secret", () => {
    expect(verifyPaystackSignature(body, sign(body, "sk_test_other"), SECRET)).toBe(false);
  });

  it("rejects a tampered body", () => {
    const sig = sign(body);
    const tampered = body.replace("500000", "1");
    expect(verifyPaystackSignature(tampered, sig, SECRET)).toBe(false);
  });

  it("rejects malformed signatures of different length", () => {
    expect(verifyPaystackSignature(body, "abc", SECRET)).toBe(false);
  });
});

describe("mapPaystackStatus", () => {
  it("maps final and in-flight statuses", () => {
    expect(mapPaystackStatus("success")).toBe("success");
    expect(mapPaystackStatus("failed")).toBe("failed");
    expect(mapPaystackStatus("abandoned")).toBe("abandoned");
    expect(mapPaystackStatus("reversed")).toBe("reversed");
    expect(mapPaystackStatus("ongoing")).toBe("pending");
    expect(mapPaystackStatus("send_otp")).toBe("pending");
    expect(mapPaystackStatus(undefined)).toBe("pending");
  });
});

describe("normaliseTransaction", () => {
  it("extracts amount, currency, customer and reusable authorization", () => {
    const tx = normaliseTransaction(
      {
        reference: "sb_1",
        status: "success",
        amount: 1200000,
        currency: "ngn",
        paid_at: "2026-11-09T10:00:00.000Z",
        channel: "card",
        customer: { customer_code: "CUS_1", email: "a@b.co" },
        authorization: { authorization_code: "AUTH_1", reusable: true, last4: "4081", card_type: "visa", exp_month: "12", exp_year: "2030" },
      },
      "sb_1",
    );
    expect(tx).toMatchObject({ status: "success", amount: 1200000, currency: "NGN", customerCode: "CUS_1" });
    expect(tx.authorization).toMatchObject({ authorizationCode: "AUTH_1", reusable: true, last4: "4081", brand: "visa" });
  });

  it("returns null authorization when none is present", () => {
    expect(normaliseTransaction({ status: "failed" }, "sb_2").authorization).toBeNull();
  });
});

describe("PaystackProvider.verifyTransaction", () => {
  it("calls the verify endpoint with the secret key and normalises the response", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: true, data: { reference: "sb_x", status: "success", amount: 500000, currency: "NGN" } }), {
        status: 200,
      }),
    );
    const provider = new PaystackProvider(() => SECRET, fetchMock as unknown as typeof fetch);
    const tx = await provider.verifyTransaction("sb_x");
    expect(tx.status).toBe("success");
    expect(tx.amount).toBe(500000);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.paystack.co/transaction/verify/sb_x");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${SECRET}`);
  });

  it("throws on an error envelope", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: false, message: "Transaction reference not found" }), { status: 400 }));
    const provider = new PaystackProvider(() => SECRET, fetchMock as unknown as typeof fetch);
    await expect(provider.verifyTransaction("sb_missing")).rejects.toThrow("Transaction reference not found");
  });

  it("verifyWebhookSignature fails closed without a secret", () => {
    const provider = new PaystackProvider(() => undefined);
    expect(provider.verifyWebhookSignature("{}", sign("{}"))).toBe(false);
  });
});
