import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptWithKey, encryptWithKey, hmacSha512Hex, safeEqual } from "@/lib/security/crypto";
import { memoryRateLimit } from "@/lib/security/rate-limit";
import { redact } from "@/lib/logger";

describe("token encryption (AES-256-GCM)", () => {
  const key = randomBytes(32);

  it("round-trips plaintext", () => {
    const secret = "EAAB-very-secret-access-token";
    const enc = encryptWithKey(secret, key);
    expect(enc).not.toContain(secret);
    expect(enc.startsWith("v1.")).toBe(true);
    expect(decryptWithKey(enc, key)).toBe(secret);
  });

  it("uses a random IV so equal plaintexts differ", () => {
    expect(encryptWithKey("same", key)).not.toBe(encryptWithKey("same", key));
  });

  it("rejects tampered ciphertext", () => {
    const enc = encryptWithKey("hello", key);
    const parts = enc.split(".");
    const data = Buffer.from(parts[3], "base64url");
    data[0] ^= 0xff;
    parts[3] = data.toString("base64url");
    expect(() => decryptWithKey(parts.join("."), key)).toThrow();
  });

  it("rejects the wrong key", () => {
    const enc = encryptWithKey("hello", key);
    expect(() => decryptWithKey(enc, randomBytes(32))).toThrow();
  });

  it("rejects malformed payloads", () => {
    expect(() => decryptWithKey("garbage", key)).toThrow(/Malformed/);
  });
});

describe("signatures", () => {
  it("computes HMAC-SHA512 hex deterministically", () => {
    const a = hmacSha512Hex("secret", '{"event":"charge.success"}');
    expect(a).toMatch(/^[0-9a-f]{128}$/);
    expect(hmacSha512Hex("secret", '{"event":"charge.success"}')).toBe(a);
    expect(hmacSha512Hex("other", '{"event":"charge.success"}')).not.toBe(a);
  });
  it("compares in constant time and handles length mismatch", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("memory rate limiter", () => {
  it("allows up to max requests per window then blocks", () => {
    const key = `t-${Math.random()}`;
    const t0 = 1_000_000;
    expect(memoryRateLimit(key, 2, 60, t0)).toBe(true);
    expect(memoryRateLimit(key, 2, 60, t0 + 1)).toBe(true);
    expect(memoryRateLimit(key, 2, 60, t0 + 2)).toBe(false);
  });
  it("resets after the window", () => {
    const key = `t-${Math.random()}`;
    const t0 = 2_000_000;
    memoryRateLimit(key, 1, 10, t0);
    expect(memoryRateLimit(key, 1, 10, t0 + 1)).toBe(false);
    expect(memoryRateLimit(key, 1, 10, t0 + 11_000)).toBe(true);
  });
});

describe("log redaction", () => {
  it("redacts API keys, JWTs and token fields", () => {
    const line = redact(
      'key sk-proj_abcdefghijklmnop paystack sk_live_abc123 jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstuv {"access_token":"tok123","refresh_token":"ref456"}',
    );
    expect(line).not.toContain("sk-proj_abcdefghijklmnop");
    expect(line).not.toContain("sk_live_abc123");
    expect(line).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(line).not.toContain("tok123");
    expect(line).not.toContain("ref456");
  });
});
