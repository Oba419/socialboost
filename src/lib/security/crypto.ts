import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { requireEncryptionKey } from "@/lib/env";

/**
 * AES-256-GCM envelope for secrets at rest (OAuth tokens, payment
 * authorizations). Format: v1.<iv>.<tag>.<ciphertext> (base64url).
 */
const VERSION = "v1";

export function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptWithKey(payload: string, key: Buffer): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== VERSION || !iv || !tag || data === undefined) throw new Error("Malformed encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export const encryptSecret = (plaintext: string) => encryptWithKey(plaintext, requireEncryptionKey());
export const decryptSecret = (payload: string) => decryptWithKey(payload, requireEncryptionKey());

export function hmacSha512Hex(secret: string, body: string): string {
  return createHmac("sha512", secret).update(body).digest("hex");
}

export function hmacSha256(secret: string | Buffer, body: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
