import "server-only";
import { isPlatformId, type PlatformId } from "@/config/platforms";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { resolveRange, type MetricRow } from "./metrics";

export type SearchParams = Record<string, string | string[] | undefined>;

export function readFilters(sp: SearchParams) {
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const range = resolveRange({ range: one(sp.range), from: one(sp.from), to: one(sp.to) });
  const platformRaw = one(sp.platform);
  const platform: PlatformId | undefined = platformRaw && isPlatformId(platformRaw) ? platformRaw : undefined;
  const accountRaw = one(sp.account);
  const accountId = accountRaw && /^[0-9a-f-]{36}$/i.test(accountRaw) ? accountRaw : undefined;
  return { ...range, platform, accountId };
}

/** Real metrics only (api/manual/import). Demo data is never read from the DB. */
export async function loadMetricRows(
  supabase: ServerSupabaseClient,
  organizationId: string,
  f: { from: string; to: string; platform?: string; accountId?: string },
): Promise<MetricRow[]> {
  let q = supabase
    .from("social_account_metrics")
    .select("id, platform, social_account_id, metric_date, metric_key, platform_metric_name, value, source")
    .eq("organization_id", organizationId)
    .in("source", ["api", "manual", "import"])
    .gte("metric_date", f.from)
    .lte("metric_date", f.to)
    .order("metric_date", { ascending: true })
    .limit(10000);
  if (f.platform) q = q.eq("platform", f.platform);
  if (f.accountId) q = q.eq("social_account_id", f.accountId);
  const { data } = await q;
  return (data ?? []).map((r) => ({ ...r, value: Number(r.value) }));
}
