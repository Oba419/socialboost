import "server-only";
import type { AuthContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { loadMetricRows } from "@/features/analytics/load";
import { summarizeByPlatform, type MetricRow } from "@/features/analytics/metrics";
import type { MetricSource } from "@/types/database";

export async function loadOverview(ctx: AuthContext, f: { from: string; to: string }) {
  const supabase = await createClient();
  const orgId = ctx.organization.id;
  const nowIso = new Date().toISOString();
  const toExclusive = new Date(`${f.to}T00:00:00Z`);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  const [rows, accounts, published, upcoming, activity, generations, plan, review] = await Promise.all([
    loadMetricRows(supabase, orgId, f),
    supabase
      .from("social_accounts")
      .select("id, platform, username, display_name, status, last_synced_at")
      .eq("organization_id", orgId)
      .order("created_at"),
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "published")
      .gte("published_at", `${f.from}T00:00:00Z`)
      .lt("published_at", toExclusive.toISOString()),
    supabase
      .from("scheduled_posts")
      .select("id, platform, scheduled_at, status, publish_mode, social_posts(title, body)")
      .eq("organization_id", orgId)
      .in("status", ["scheduled", "manual_required"])
      .gte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .limit(5),
    supabase
      .from("activity_logs")
      .select("id, action, entity_type, metadata, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("generated_content")
      .select("id, service, title, created_at")
      .eq("organization_id", orgId)
      .neq("service", "performance_review")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("growth_plans")
      .select("id, title, summary, duration_days, is_hypothesis, created_at")
      .eq("organization_id", orgId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("generated_content")
      .select("id, title, content, created_at")
      .eq("organization_id", orgId)
      .eq("service", "performance_review")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const summaries = summarizeByPlatform(rows);
  const followerPlatforms = summaries.filter((s) => s.metrics.followers);
  const combinedFollowers = followerPlatforms.reduce((sum, s) => sum + s.metrics.followers.value, 0);
  const followerChanges = followerPlatforms.map((s) => s.metrics.followers.change).filter((c): c is number => c !== null);
  const followerSources = [...new Set(followerPlatforms.flatMap((s) => s.metrics.followers.sources))] as MetricSource[];

  const videoViews = summaries
    .map((s) => ({ platform: s.platform, metric: s.metrics.video_views ?? s.metrics.views }))
    .filter((v) => Boolean(v.metric));

  const accountRows = (accounts.data ?? []).map((a) => {
    const followerSeries = rows
      .filter((r: MetricRow) => r.social_account_id === a.id && r.metric_key === "followers")
      .sort((x, y) => x.metric_date.localeCompare(y.metric_date));
    const last = followerSeries.at(-1);
    const first = followerSeries[0];
    return {
      ...a,
      followers: last ? last.value : null,
      followerChange: last && first && followerSeries.length > 1 ? last.value - first.value : null,
      followerSource: last?.source ?? null,
    };
  });

  return {
    rows,
    summaries,
    accounts: accountRows,
    connectedCount: (accounts.data ?? []).filter((a) => a.status === "connected").length,
    combinedFollowers: followerPlatforms.length ? combinedFollowers : null,
    followerPlatformCount: followerPlatforms.length,
    newFollowers: followerChanges.length ? followerChanges.reduce((s, c) => s + c, 0) : null,
    followerSources,
    videoViews,
    publishedCount: published.count ?? 0,
    upcoming: upcoming.data ?? [],
    activity: activity.data ?? [],
    generations: generations.data ?? [],
    plan: plan.data,
    review: review.data,
  };
}
