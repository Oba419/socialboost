import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { action, assertSameOrigin, toApiFailure } from "@/lib/api/handler";
import { AppError } from "@/lib/errors";
import { ConfigurationError } from "@/lib/env";

describe("toApiFailure", () => {
  it("maps AppError to its status and code", () => {
    const { status, body } = toApiFailure(new AppError("QUOTA_EXCEEDED", "Out of credits", { used: 30 }));
    expect(status).toBe(402);
    expect(body.error).toEqual({ code: "QUOTA_EXCEEDED", message: "Out of credits", details: { used: 30 } });
  });

  it("maps configuration errors to 503 NOT_CONFIGURED", () => {
    const { status, body } = toApiFailure(new ConfigurationError("OpenAI"));
    expect(status).toBe(503);
    expect(body.error.code).toBe("NOT_CONFIGURED");
  });

  it("maps Zod errors to 422 with issue paths", () => {
    const result = z.object({ email: z.string().email("Bad email") }).safeParse({ email: "nope" });
    const { status, body } = toApiFailure(result.error);
    expect(status).toBe(422);
    expect(body.error.message).toBe("Bad email");
    expect(body.error.details).toEqual({ issues: [{ path: "email", message: "Bad email" }] });
  });

  it("never leaks internals of unknown errors", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { status, body } = toApiFailure(new Error("connection string postgres://user:pw@host"));
    expect(status).toBe(500);
    expect(body.error.message).not.toContain("postgres");
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});

describe("action()", () => {
  it("wraps success and failure into the envelope", async () => {
    await expect(action(async () => 42)).resolves.toEqual({ ok: true, data: 42 });
    const failed = await action(async () => {
      throw new AppError("FORBIDDEN", "No");
    });
    expect(failed).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("re-throws Next.js control-flow errors (redirect/notFound)", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
    await expect(action(async () => { throw redirectError; })).rejects.toBe(redirectError);
  });
});

describe("assertSameOrigin", () => {
  const req = (origin: string | null, host = "app.example.com") =>
    new Request("https://app.example.com/api/x", {
      method: "POST",
      headers: { host, ...(origin ? { origin } : {}) },
    });

  it("allows same-origin and origin-less requests", () => {
    expect(() => assertSameOrigin(req("https://app.example.com"))).not.toThrow();
    expect(() => assertSameOrigin(req(null))).not.toThrow();
  });
  it("rejects cross-site requests", () => {
    expect(() => assertSameOrigin(req("https://evil.example"))).toThrow(AppError);
    expect(() => assertSameOrigin(req("not a url"))).toThrow(AppError);
  });
});
