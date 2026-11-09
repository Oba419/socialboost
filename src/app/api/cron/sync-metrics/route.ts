import { route } from "@/lib/api/handler";
import { assertCronAuth, runJob } from "@/lib/jobs";
import { syncAccount } from "@/lib/social/sync";
import { getAdapter } from "@/lib/social/registry";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformId } from "@/config/platforms";

export const maxDuration = 300;

const BATCH = 200;

/** Cron: pull the last 2 days of metrics for every connected account. */
async function handler(req: Request) {
  assertCronAuth(req);
  return runJob("sync_social_metrics", async () => {
    const admin = createAdminClient();
    const { data: accounts } = await admin
      .from("social_accounts")
      .select("*")
      .eq("status", "connected")
      .order("last_synced_at", { ascending: true, nullsFirst: true })
      .limit(BATCH);

    let ok = 0;
    let failed = 0;
    let expired = 0;
    let metrics = 0;
    let skipped = 0;
    for (const account of accounts ?? []) {
      if (!getAdapter(account.platform as PlatformId).isConfigured()) {
        skipped++;
        continue;
      }
      const r = await syncAccount(admin, account, 2);
      if (r.ok) ok++;
      else failed++;
      if (r.expired) expired++;
      metrics += r.metrics;
    }
    return { accounts: accounts?.length ?? 0, ok, failed, expired, skipped, metrics };
  });
}

export const GET = route(handler);
export const POST = route(handler);
