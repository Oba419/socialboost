import "server-only";
import { AppError } from "@/lib/errors";
import { serverEnv } from "@/lib/env";
import { safeEqual } from "@/lib/security/crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Json } from "@/types/database";

/**
 * Background jobs run as Vercel Cron (or any scheduler) hitting /api/cron/*
 * with `Authorization: Bearer <CRON_SECRET>`.
 */
export function assertCronAuth(req: Request) {
  const secret = serverEnv().CRON_SECRET;
  if (!secret) throw new AppError("NOT_CONFIGURED", "CRON_SECRET is not set.");
  const header = req.headers.get("authorization") ?? "";
  if (!safeEqual(header, `Bearer ${secret}`)) throw new AppError("UNAUTHENTICATED", "Invalid cron credentials.");
}

/** Records a job run in `job_runs` (visible in the admin console). */
export async function runJob<T extends Record<string, Json>>(job: string, fn: () => Promise<T>): Promise<T> {
  const admin = createAdminClient();
  const { data: run } = await admin.from("job_runs").insert({ job, status: "running" }).select("id").single();
  try {
    const details = await fn();
    if (run) await admin.from("job_runs").update({ status: "success", details, finished_at: new Date().toISOString() }).eq("id", run.id);
    return details;
  } catch (error) {
    logger.error(`Job ${job} failed`, error);
    if (run) {
      await admin
        .from("job_runs")
        .update({ status: "failed", error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown error", finished_at: new Date().toISOString() })
        .eq("id", run.id);
    }
    throw error;
  }
}
