import "server-only";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { PlatformId } from "@/config/platforms";
import type { SocialAccountRow } from "@/types/database";
import { notify } from "@/services/notifications";
import { PLATFORMS } from "@/config/platforms";
import { getAdapter } from "./registry";
import { getValidTokens, toProviderAccount } from "./tokens";
import { replaceMetrics } from "./metrics-store";
import { ymd } from "./http";
import { SocialApiError, type MetricValue } from "./types";

export interface SyncResult {
  accountId: string;
  ok: boolean;
  metrics: number;
  error?: string;
  expired?: boolean;
}

/**
 * Pull metrics for one account from the platform's official API and store
 * them with source "api". Marks the account expired when the token is no
 * longer valid and notifies the workspace owner.
 */
export async function syncAccount(admin: AdminSupabaseClient, account: SocialAccountRow, days = 2): Promise<SyncResult> {
  const platform = account.platform as PlatformId;
  const adapter = getAdapter(platform);
  const until = new Date();
  const since = new Date(until.getTime() - days * 86_400_000);

  try {
    const tokens = await getValidTokens(admin, account);
    const provider = toProviderAccount(account);
    const values: MetricValue[] = adapter.fetchMetrics ? await adapter.fetchMetrics(tokens, provider, since, until) : [];
    if (!values.some((v) => v.key === "followers") && adapter.fetchFollowers) {
      const followers = await adapter.fetchFollowers(tokens, provider);
      if (followers !== null) values.push({ date: ymd(until), key: "followers", platformName: "followers", value: followers });
    }
    const count = await replaceMetrics(admin, {
      organizationId: account.organization_id,
      platform,
      socialAccountId: account.id,
      source: "api",
      values,
    });
    await admin
      .from("social_accounts")
      .update({ last_synced_at: new Date().toISOString(), last_error: null, status: "connected" })
      .eq("id", account.id);
    return { accountId: account.id, ok: true, metrics: count };
  } catch (error) {
    const expired = error instanceof SocialApiError && error.authExpired;
    const message = error instanceof SocialApiError ? error.message : "Sync failed.";
    await admin
      .from("social_accounts")
      .update({ last_error: message.slice(0, 300), ...(expired ? { status: "expired" } : {}) })
      .eq("id", account.id);
    if (expired && account.status !== "expired") {
      const { data: org } = await admin.from("organizations").select("owner_id").eq("id", account.organization_id).single();
      if (org) {
        await notify({
          userId: org.owner_id,
          organizationId: account.organization_id,
          category: "integrations",
          title: `Reconnect your ${PLATFORMS[platform].name} account`,
          body: `Access to ${account.display_name ?? account.username ?? "your account"} has expired or was revoked.`,
          link: "/dashboard/accounts",
          dedupeHours: 24,
        });
      }
    }
    return { accountId: account.id, ok: false, metrics: 0, error: message, expired };
  }
}
