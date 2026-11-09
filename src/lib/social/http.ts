import "server-only";
import type { PlatformId } from "@/config/platforms";
import { SocialApiError } from "./types";

/**
 * fetch wrapper for platform APIs: timeout, JSON/form bodies and consistent
 * error mapping to SocialApiError. Error messages are truncated and never
 * include request bodies (which may contain tokens).
 */
export interface SocialFetchInit extends Omit<RequestInit, "body"> {
  json?: unknown;
  form?: Record<string, string>;
  body?: BodyInit;
  timeoutMs?: number;
  bearer?: string;
}

export interface SocialResponse<T> {
  data: T;
  headers: Headers;
  status: number;
}

export async function socialRequest<T>(platform: PlatformId, url: string, init: SocialFetchInit = {}): Promise<SocialResponse<T>> {
  const { json, form, timeoutMs = 20_000, bearer, headers, ...rest } = init;
  const h = new Headers(headers);
  let body: BodyInit | undefined = init.body;
  if (json !== undefined) {
    h.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  } else if (form) {
    h.set("Content-Type", "application/x-www-form-urlencoded");
    body = new URLSearchParams(form).toString();
  }
  if (bearer) h.set("Authorization", `Bearer ${bearer}`);
  h.set("Accept", "application/json");

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers: h, body, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new SocialApiError(timedOut ? "Request to the platform timed out." : "Could not reach the platform.", platform, true);
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok || hasGraphError(parsed)) {
    throw toSocialError(platform, res.status, parsed);
  }
  return { data: parsed as T, headers: res.headers, status: res.status };
}

export async function socialFetch<T>(platform: PlatformId, url: string, init: SocialFetchInit = {}): Promise<T> {
  return (await socialRequest<T>(platform, url, init)).data;
}

function hasGraphError(body: unknown): boolean {
  return Boolean(body && typeof body === "object" && "error" in body && (body as { error: unknown }).error && typeof (body as { error: unknown }).error === "object");
}

function extractMessage(body: unknown): { message: string; code?: number | string } {
  if (!body) return { message: "" };
  if (typeof body === "string") return { message: body.slice(0, 200) };
  const b = body as Record<string, unknown>;
  const err = b.error;
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    return { message: String(e.message ?? e.error_description ?? e.code ?? ""), code: (e.code as number | string | undefined) ?? undefined };
  }
  if (typeof err === "string") return { message: String(b.error_description ?? err), code: err };
  if (typeof b.detail === "string") return { message: b.detail };
  if (typeof b.message === "string") return { message: b.message, code: b.code as string | undefined };
  if (Array.isArray(b.errors) && b.errors[0] && typeof b.errors[0] === "object") {
    return { message: String((b.errors[0] as Record<string, unknown>).message ?? "") };
  }
  return { message: "" };
}

export function toSocialError(platform: PlatformId, status: number, body: unknown): SocialApiError {
  const { message, code } = extractMessage(body);
  const safeMessage = (message || `Platform API error (${status})`).replace(/[A-Za-z0-9_\-]{40,}/g, "[redacted]").slice(0, 300);
  // Meta: code 190 = invalid/expired token; 10/200-range = permission errors.
  const authExpired =
    status === 401 ||
    code === 190 ||
    code === "invalid_grant" ||
    code === "access_token_invalid" ||
    code === "invalid_token";
  const retryable = !authExpired && (status === 429 || status >= 500 || code === 4 || code === 17 || code === 32 || code === 613);
  return new SocialApiError(safeMessage, platform, retryable, status, authExpired);
}

export const basicAuth = (id: string, secret: string) => `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;

export function expiresFromNow(seconds: number | undefined | null): Date | null {
  return typeof seconds === "number" && seconds > 0 ? new Date(Date.now() + seconds * 1000) : null;
}

export const ymd = (d: Date) => d.toISOString().slice(0, 10);
