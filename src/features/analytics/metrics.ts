/**
 * Internal metric model (client-safe, pure).
 *
 * Every platform's metrics are normalised to these keys while the original
 * platform metric name is preserved in `platform_metric_name`. Metrics are
 * either LEVELS (a running total at a point in time, e.g. followers) or FLOWS
 * (activity during a day, e.g. impressions). Levels are never summed over
 * time and nothing is ever summed across platforms.
 */
import type { MetricSource } from "@/types/database";

export const METRIC_LABELS: Record<string, string> = {
  followers: "Followers",
  reach: "Reach",
  impressions: "Impressions",
  views: "Views",
  video_views: "Video views",
  engagements: "Engagements",
  likes: "Likes",
  comments: "Comments",
  replies: "Replies",
  shares: "Shares",
  reposts: "Reposts",
  quotes: "Quotes",
  saves: "Saves",
  profile_views: "Profile visits",
  clicks: "Clicks",
  pin_clicks: "Pin clicks",
  outbound_clicks: "Outbound clicks",
  watch_time_minutes: "Watch time (min)",
  subscribers_gained: "Subscribers gained",
  likes_total: "Total likes (lifetime)",
  video_count: "Videos (lifetime)",
};

/** Point-in-time totals: show latest value and change; never sum. */
export const LEVEL_METRICS = new Set(["followers", "likes_total", "video_count"]);

/** Metric keys a user may enter manually. */
export const MANUAL_METRIC_KEYS = [
  "followers",
  "reach",
  "impressions",
  "views",
  "video_views",
  "likes",
  "comments",
  "shares",
  "saves",
  "profile_views",
  "clicks",
  "watch_time_minutes",
] as const;

export const ENGAGEMENT_INPUTS = ["likes", "comments", "shares", "saves"] as const;

export function metricLabel(key: string): string {
  return METRIC_LABELS[key] ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export interface MetricRow {
  id?: string;
  platform: string;
  social_account_id: string | null;
  metric_date: string;
  metric_key: string;
  platform_metric_name?: string | null;
  value: number;
  source: MetricSource;
}

export interface MetricSummary {
  key: string;
  /** Latest value for levels; period total for flows. */
  value: number;
  /** Levels only: last - first within the period (null if a single point). */
  change: number | null;
  isLevel: boolean;
  sources: MetricSource[];
  platformNames: string[];
}

export interface PlatformSummary {
  platform: string;
  metrics: Record<string, MetricSummary>;
  engagementRate: number | null;
}

/** Summarise rows per platform. For levels with multiple accounts, sums the latest value per account (same platform, same metric = comparable). */
export function summarizeByPlatform(rows: MetricRow[]): PlatformSummary[] {
  const byPlatform = new Map<string, MetricRow[]>();
  for (const r of rows) {
    const list = byPlatform.get(r.platform) ?? [];
    list.push(r);
    byPlatform.set(r.platform, list);
  }
  const out: PlatformSummary[] = [];
  for (const [platform, list] of byPlatform) {
    const metrics: Record<string, MetricSummary> = {};
    const keys = [...new Set(list.map((r) => r.metric_key))];
    for (const key of keys) {
      const series = list.filter((r) => r.metric_key === key).sort((a, b) => a.metric_date.localeCompare(b.metric_date));
      const isLevel = LEVEL_METRICS.has(key);
      let value: number;
      let change: number | null = null;
      if (isLevel) {
        const byAccount = new Map<string, MetricRow[]>();
        for (const r of series) {
          const k = `${r.social_account_id ?? "manual"}:${r.source}`;
          byAccount.set(k, [...(byAccount.get(k) ?? []), r]);
        }
        // Prefer one source per account: api > import > manual > demo.
        const chosen = pickPreferredSource([...byAccount.values()]);
        value = chosen.reduce((s, pts) => s + Number(pts[pts.length - 1].value), 0);
        const multiPoint = chosen.filter((pts) => pts.length > 1);
        change = multiPoint.length ? multiPoint.reduce((s, pts) => s + Number(pts[pts.length - 1].value) - Number(pts[0].value), 0) : null;
      } else {
        value = series.reduce((s, r) => s + Number(r.value), 0);
      }
      metrics[key] = {
        key,
        value,
        change,
        isLevel,
        sources: [...new Set(series.map((r) => r.source))],
        platformNames: [...new Set(series.map((r) => r.platform_metric_name).filter((n): n is string => Boolean(n)))],
      };
    }
    out.push({ platform, metrics, engagementRate: engagementRate(metrics) });
  }
  return out.sort((a, b) => a.platform.localeCompare(b.platform));
}

const SOURCE_RANK: Record<MetricSource, number> = { api: 0, import: 1, manual: 2, demo: 3 };

function pickPreferredSource(groups: MetricRow[][]): MetricRow[][] {
  const byAccount = new Map<string, MetricRow[]>();
  for (const g of groups) {
    const acct = g[0].social_account_id ?? "manual";
    const existing = byAccount.get(acct);
    if (!existing || SOURCE_RANK[g[0].source] < SOURCE_RANK[existing[0].source]) byAccount.set(acct, g);
  }
  return [...byAccount.values()];
}

/**
 * Engagement rate = (likes + comments + shares + saves) / impressions × 100,
 * computed per platform for the period. Returns null unless impressions > 0
 * AND at least one interaction metric is reported by that platform.
 */
export function engagementRate(metrics: Record<string, Pick<MetricSummary, "value">>): number | null {
  const impressions = metrics.impressions?.value ?? 0;
  const present = ENGAGEMENT_INPUTS.filter((k) => metrics[k] !== undefined);
  if (impressions <= 0 || present.length === 0) return null;
  const interactions = present.reduce((s, k) => s + (metrics[k]?.value ?? 0), 0);
  return Math.round((interactions / impressions) * 10000) / 100;
}

/** Build chart points for one metric key: one series per platform, keyed by date. */
export function seriesByPlatform(rows: MetricRow[], key: string, dates: string[]): { points: Record<string, string | number | null>[]; platforms: string[] } {
  const filtered = rows.filter((r) => r.metric_key === key);
  const platforms = [...new Set(filtered.map((r) => r.platform))].sort();
  const isLevel = LEVEL_METRICS.has(key);
  const points = dates.map((date) => {
    const point: Record<string, string | number | null> = { date };
    for (const p of platforms) {
      const dayRows = filtered.filter((r) => r.platform === p && r.metric_date === date);
      if (!dayRows.length) {
        point[p] = null;
        continue;
      }
      if (isLevel) {
        // sum latest per account for that day (same platform, same metric)
        const perAccount = new Map<string, number>();
        for (const r of dayRows) perAccount.set(`${r.social_account_id ?? "manual"}`, Number(r.value));
        point[p] = [...perAccount.values()].reduce((s, v) => s + v, 0);
      } else {
        point[p] = dayRows.reduce((s, r) => s + Number(r.value), 0);
      }
    }
    return point;
  });
  return { points, platforms };
}

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && out.length < 400) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en", { notation: Math.abs(n) >= 100_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}

/** Resolves ?range=7|30|90|custom&from&to into an inclusive UTC date window. */
export function resolveRange(params: { range?: string; from?: string; to?: string }, now = new Date()): { from: string; to: string; label: string; range: string } {
  const today = now.toISOString().slice(0, 10);
  const isDate = (v?: string) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)));
  if (params.range === "custom" && isDate(params.from) && isDate(params.to) && params.from! <= params.to!) {
    const days = dateRange(params.from!, params.to!).length;
    if (days <= 366) return { from: params.from!, to: params.to!, label: `${params.from} → ${params.to}`, range: "custom" };
  }
  const n = params.range === "7" ? 7 : params.range === "90" ? 90 : 30;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (n - 1));
  return { from: start.toISOString().slice(0, 10), to: today, label: `Last ${n} days`, range: String(n) };
}

/** Clearly-labelled demo series (never persisted). Deterministic per seed. */
export function generateDemoRows(platforms: string[], dates: string[]): MetricRow[] {
  const rows: MetricRow[] = [];
  platforms.forEach((platform, pi) => {
    let followers = 1200 + pi * 850;
    dates.forEach((date, di) => {
      const wave = Math.sin((di + pi) / 3) * 0.3 + 1;
      followers += Math.round(4 + wave * 6);
      const impressions = Math.round((900 + pi * 300) * wave);
      const push = (key: string, value: number) =>
        rows.push({ platform, social_account_id: null, metric_date: date, metric_key: key, value, source: "demo", platform_metric_name: null });
      push("followers", followers);
      push("impressions", impressions);
      push("likes", Math.round(impressions * 0.045));
      push("comments", Math.round(impressions * 0.006));
      push("shares", Math.round(impressions * 0.004));
    });
  });
  return rows;
}
