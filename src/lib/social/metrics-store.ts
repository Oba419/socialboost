import "server-only";
import type { AdminSupabaseClient } from "@/lib/supabase/admin";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { MetricSource } from "@/types/database";
import type { MetricValue } from "./types";

type Client = AdminSupabaseClient | ServerSupabaseClient;

/**
 * Upsert metric values. The uniqueness index uses an expression
 * (coalesce(social_account_id)), which PostgREST's onConflict cannot target,
 * so we replace matching rows: delete then insert, scoped tightly.
 */
export async function replaceMetrics(
  client: Client,
  params: {
    organizationId: string;
    platform: string;
    socialAccountId: string | null;
    source: MetricSource;
    createdBy?: string | null;
    values: MetricValue[];
  },
): Promise<number> {
  const values = dedupe(params.values);
  if (!values.length) return 0;
  const dates = [...new Set(values.map((v) => v.date))];
  const keys = [...new Set(values.map((v) => v.key))];

  let del = client
    .from("social_account_metrics")
    .delete()
    .eq("organization_id", params.organizationId)
    .eq("platform", params.platform)
    .eq("source", params.source)
    .in("metric_date", dates)
    .in("metric_key", keys);
  del = params.socialAccountId ? del.eq("social_account_id", params.socialAccountId) : del.is("social_account_id", null);
  const { error: delError } = await del;
  if (delError) throw new Error(`Failed to replace metrics: ${delError.message}`);

  const { error } = await client.from("social_account_metrics").insert(
    values.map((v) => ({
      organization_id: params.organizationId,
      social_account_id: params.socialAccountId,
      platform: params.platform,
      metric_date: v.date,
      metric_key: v.key,
      platform_metric_name: v.platformName,
      value: v.value,
      source: params.source,
      created_by: params.createdBy ?? null,
    })),
  );
  if (error) throw new Error(`Failed to insert metrics: ${error.message}`);
  return values.length;
}

/** Last value wins for duplicate (date, key) pairs. */
function dedupe(values: MetricValue[]): MetricValue[] {
  const map = new Map<string, MetricValue>();
  for (const v of values) if (Number.isFinite(v.value)) map.set(`${v.date}|${v.key}`, v);
  return [...map.values()];
}
