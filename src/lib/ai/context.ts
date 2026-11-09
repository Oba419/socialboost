import "server-only";
import { subDays, format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { AuthContext } from "@/lib/auth/session";
import { platformName } from "./services/shared";
import type { BrandContext } from "./types";

/**
 * Build the non-sensitive brand context for prompts. Only real data
 * (api/manual/import) is summarised — demo fixtures are never sent.
 */
export async function buildBrandContext(ctx: AuthContext, opts: { withPerformance?: boolean } = {}): Promise<BrandContext> {
  const org = ctx.organization;
  return {
    userType: org.user_type,
    niche: org.niche,
    targetAudience: org.target_audience,
    location: org.location,
    brandVoice: org.brand_voice,
    goals: org.goals,
    platforms: org.platforms.map(platformName),
    preferredFormats: org.preferred_formats,
    postingFrequency: org.posting_frequency,
    contentResources: org.content_resources,
    performanceSummary: opts.withPerformance ? await summarisePerformance(org.id) : null,
  };
}

export async function summarisePerformance(organizationId: string, days = 30): Promise<string | null> {
  const supabase = await createClient();
  const since = format(subDays(new Date(), days), "yyyy-MM-dd");
  const { data } = await supabase
    .from("social_account_metrics")
    .select("platform, metric_key, metric_date, value, source")
    .eq("organization_id", organizationId)
    .in("source", ["api", "manual", "import"])
    .gte("metric_date", since)
    .order("metric_date", { ascending: true })
    .limit(5000);

  if (!data?.length) return null;
  return formatPerformanceSummary(data, days);
}

type MetricPoint = { platform: string; metric_key: string; metric_date: string; value: number; source: string };

/** Pure: summarise metrics per platform without mixing incomparable metrics. */
export function formatPerformanceSummary(rows: MetricPoint[], days: number): string {
  const byPlatform = new Map<string, MetricPoint[]>();
  for (const r of rows) {
    const list = byPlatform.get(r.platform) ?? [];
    list.push(r);
    byPlatform.set(r.platform, list);
  }
  const lines: string[] = [`Window: last ${days} days. Metrics are per platform and not comparable across platforms.`];
  for (const [platform, points] of byPlatform) {
    const sources = [...new Set(points.map((p) => p.source))].join("/");
    const keys = [...new Set(points.map((p) => p.metric_key))];
    const parts = keys.map((key) => {
      const series = points.filter((p) => p.metric_key === key);
      // Followers-type metrics are levels (show first→last); others are flows (sum).
      if (key === "followers" || key === "subscribers") {
        const first = series[0].value;
        const last = series[series.length - 1].value;
        return `${key}: ${first} → ${last} (${last - first >= 0 ? "+" : ""}${last - first})`;
      }
      const total = series.reduce((s, p) => s + Number(p.value), 0);
      return `${key}: ${total} total`;
    });
    lines.push(`- ${platformName(platform)} [source: ${sources}]: ${parts.join("; ")}`);
  }
  return lines.join("\n");
}
