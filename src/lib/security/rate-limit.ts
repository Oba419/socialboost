import "server-only";
import { AppError } from "@/lib/errors";
import { isServiceRoleConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Rate limiting backed by Postgres (`check_rate_limit`), so limits hold across
 * serverless instances. Falls back to a per-instance memory window when the
 * service role is not configured (local development).
 */
export const RATE_LIMITS = {
  ai: { max: 20, windowSeconds: 60 },
  auth: { max: 10, windowSeconds: 300 },
  contact: { max: 5, windowSeconds: 3600 },
  write: { max: 120, windowSeconds: 60 },
  checkout: { max: 10, windowSeconds: 600 },
  oauth: { max: 20, windowSeconds: 600 },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

const memory = new Map<string, { start: number; count: number }>();

export function memoryRateLimit(key: string, max: number, windowSeconds: number, now = Date.now()): boolean {
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSeconds * 1000) {
    memory.set(key, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export async function rateLimit(bucket: RateLimitBucket, identifier: string): Promise<void> {
  const { max, windowSeconds } = RATE_LIMITS[bucket];
  const key = `${bucket}:${identifier}`;
  let allowed = true;

  if (isServiceRoleConfigured()) {
    const { data, error } = await createAdminClient().rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      // Fail open on infrastructure errors, but log loudly.
      logger.error("Rate limit check failed", error.message);
    } else {
      allowed = data === true;
    }
  } else {
    allowed = memoryRateLimit(key, max, windowSeconds);
  }

  if (!allowed) {
    throw new AppError("RATE_LIMITED", "Too many requests. Please wait a moment and try again.");
  }
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
