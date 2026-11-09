import { DEFAULT_PLANS } from "@/config/plans";

/**
 * Only allow same-site relative redirects ("/path"), never "//host" or
 * "/\host" (protocol-relative tricks) or absolute URLs.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001F]/.test(next)) return fallback;
  return next;
}

/** A paid plan id selected on the pricing page, or null. */
export function safePlan(plan: string | null | undefined): string | null {
  if (!plan) return null;
  const p = DEFAULT_PLANS.find((x) => x.id === plan);
  return p && p.id !== "free" ? p.id : null;
}
