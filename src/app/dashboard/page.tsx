import Link from "next/link";
import {
  Activity,
  CalendarClock,
  Eye,
  LayoutDashboard,
  Send,
  Share2,
  Sparkles,
  Target,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { readFilters, type SearchParams } from "@/features/analytics/load";
import { formatNumber, metricLabel } from "@/features/analytics/metrics";
import { RangeFilter } from "@/features/analytics/range-filter";
import { KpiCard } from "@/features/overview/kpi-card";
import { loadOverview } from "@/features/overview/load-overview";
import { loadDashboardPage } from "@/lib/auth/page";

export const metadata = { title: "Overview" };

const platformName = (p: string) => (isPlatformId(p) ? PLATFORMS[p].name : p);

function fmtDate(iso: string, tz: string, withTime = true) {
  try {
    return new Intl.DateTimeFormat("en", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}), timeZone: tz }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

const ACTION_LABELS: Record<string, string> = {
  "social.connected": "Connected a social account",
  "social.disconnected": "Disconnected a social account",
  "auth.sign_in": "Signed in",
  "auth.password_changed": "Changed password",
};

const SERVICE_LABELS: Record<string, string> = {
  content_studio: "AI Studio post",
  content_ideas: "Content ideas",
  captions: "Captions",
  hashtags: "Hashtags",
  video_script: "Video script",
  repurpose: "Repurposed content",
  profile_optimizer: "Profile review",
  growth_coach: "Coach conversation",
  trends: "Trend ideas",
  engagement: "Engagement ideas",
  competitor_analysis: "Competitor analysis",
  growth_plan: "Growth plan",
  growth_assessment: "Growth assessment",
};

export default async function OverviewPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { ctx } = await loadDashboardPage();
  const f = readFilters(await searchParams);
  const data = await loadOverview(ctx, f);
  const tz = ctx.profile.timezone;
  const firstName = (ctx.profile.full_name ?? "").split(" ")[0];
  const hasMetrics = data.rows.length > 0;
  const review = data.review?.content as { headline?: string; recommendations?: { action: string }[] } | undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title={firstName ? `Welcome back, ${firstName}` : "Overview"}
        description={`${ctx.organization.name} · ${f.label}`}
        actions={<RangeFilter range={f.range} from={f.from} to={f.to} />}
      />

      {!hasMetrics && (
        <Card className="bg-hero-glow border-primary/20">
          <CardContent className="flex flex-col gap-4 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">No performance data for this period yet</p>
              <p className="text-muted-foreground text-sm">
                Connect an account to pull live metrics, or add figures from your platforms&apos; native analytics. We never show made-up numbers.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild>
                <Link href="/dashboard/accounts">Connect accounts</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/analytics">Add figures</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Share2}
          label="Connected accounts"
          value={data.connectedCount}
          hint={data.accounts.length > data.connectedCount ? `${data.accounts.length - data.connectedCount} need attention` : "Via official OAuth"}
        />
        <KpiCard
          icon={Users}
          label="Followers"
          value={data.combinedFollowers === null ? "—" : formatNumber(data.combinedFollowers)}
          hint={
            data.combinedFollowers === null
              ? "Not available yet"
              : `Combined where available (${data.followerPlatformCount} platform${data.followerPlatformCount === 1 ? "" : "s"})`
          }
          sources={data.followerSources}
        />
        <KpiCard
          icon={UserPlus}
          label="New followers"
          value={data.newFollowers === null ? "—" : `${data.newFollowers >= 0 ? "+" : ""}${formatNumber(data.newFollowers)}`}
          hint={data.newFollowers === null ? "Needs at least two data points in the period" : "Net change in the period"}
          sources={data.newFollowers === null ? [] : data.followerSources}
        />
        <KpiCard icon={Send} label="Content published" value={data.publishedCount} hint="Confirmed by the platform or marked published by you" />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Engagement by platform</CardTitle>
            <CardDescription>Per platform only — metrics aren&apos;t comparable across platforms.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.summaries.length === 0 ? (
              <EmptyState title="No engagement data" description="It appears here once metrics are synced or entered." className="py-8" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Engagement rate</TableHead>
                      <TableHead className="text-right">Interactions</TableHead>
                      <TableHead className="text-right">Video views</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.summaries.map((s) => {
                      const interactions = ["likes", "comments", "shares", "saves"].filter((k) => s.metrics[k]);
                      const views = s.metrics.video_views ?? s.metrics.views;
                      const sources = [...new Set(Object.values(s.metrics).flatMap((m) => m.sources))];
                      return (
                        <TableRow key={s.platform}>
                          <TableCell className="font-medium">{platformName(s.platform)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.engagementRate === null ? <span className="text-muted-foreground">Not available</span> : `${s.engagementRate}%`}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {interactions.length ? formatNumber(interactions.reduce((sum, k) => sum + s.metrics[k].value, 0)) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {views ? formatNumber(views.value) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {sources.map((src) => (
                                <DataSourceBadge key={src} source={src} />
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {data.summaries.length > 0 && (
              <p className="text-muted-foreground mt-3 text-xs">
                Engagement rate = (likes + comments + shares + saves) ÷ impressions × 100, per platform, when impressions are reported.{" "}
                <Link href="/dashboard/analytics" className="text-primary hover:underline">
                  Full analytics →
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="text-primary size-4" /> AI recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {data.plan && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Target className="size-4" />
                  <Link href="/dashboard/growth-plans" className="font-medium hover:underline">
                    {data.plan.title}
                  </Link>
                </div>
                <p className="text-muted-foreground line-clamp-4">{data.plan.summary}</p>
                {data.plan.is_hypothesis && (
                  <Badge variant="outline" className="font-normal">
                    Initial hypothesis — no historical data
                  </Badge>
                )}
              </div>
            )}
            {review?.headline && (
              <div className="space-y-1">
                <p className="font-medium">{review.headline}</p>
                <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                  {(review.recommendations ?? []).slice(0, 3).map((r, i) => (
                    <li key={i}>{r.action}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">Performance review · {fmtDate(data.review!.created_at, tz, false)}</p>
              </div>
            )}
            {!data.plan && !review?.headline && (
              <EmptyState
                title="No recommendations yet"
                description="Generate a growth plan or an AI performance review to get personalised next steps."
                className="py-6"
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" asChild>
                      <Link href="/dashboard/growth-plans">Create a plan</Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/dashboard/coach">Ask the coach</Link>
                    </Button>
                  </div>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accounts</CardTitle>
          <CardDescription>Account-specific performance for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.accounts.length === 0 ? (
            <EmptyState
              icon={Share2}
              title="No connected accounts"
              description="Connect Instagram, TikTok, YouTube and more using each platform's official login."
              action={
                <Button asChild>
                  <Link href="/dashboard/accounts">Connect an account</Link>
                </Button>
              }
              className="py-8"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Followers</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.display_name ?? a.username ?? "—"}</TableCell>
                      <TableCell>{platformName(a.platform)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {a.followers === null ? (
                          <span className="text-muted-foreground">Not available</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            {formatNumber(a.followers)} {a.followerSource && <DataSourceBadge source={a.followerSource} />}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {a.followerChange === null ? "—" : `${a.followerChange >= 0 ? "+" : ""}${formatNumber(a.followerChange)}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal capitalize">
                          {a.status === "expired" ? "Needs reconnect" : a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{a.last_synced_at ? fmtDate(a.last_synced_at, tz) : "Never"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4" /> Upcoming posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcoming.length === 0 ? (
              <EmptyState
                title="Nothing scheduled"
                description="Plan your next posts in the content calendar."
                action={
                  <Button size="sm" asChild>
                    <Link href="/dashboard/calendar">Open calendar</Link>
                  </Button>
                }
                className="py-6"
              />
            ) : (
              <ul className="space-y-3">
                {data.upcoming.map((u) => {
                  const post = u.social_posts as unknown as { title: string | null; body: string } | null;
                  return (
                    <li key={u.id} className="space-y-0.5">
                      <p className="line-clamp-1 text-sm font-medium">{post?.title || post?.body || "Untitled post"}</p>
                      <p className="text-muted-foreground text-xs">
                        {platformName(u.platform)} · {fmtDate(u.scheduled_at, tz)} · {u.publish_mode === "manual" ? "Manual publish" : "Auto-publish"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4" /> Best-performing content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No post-level data yet"
              description="Rankings appear once a connected platform provides per-post insights. We never estimate post performance."
              className="py-6"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4" /> Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.activity.length === 0 && data.generations.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Generate your first piece of content in AI Studio."
                action={
                  <Button size="sm" asChild>
                    <Link href="/dashboard/studio">Open AI Studio</Link>
                  </Button>
                }
                className="py-6"
              />
            ) : (
              <ul className="space-y-3 text-sm">
                {data.generations.map((g) => (
                  <li key={g.id} className="flex items-start gap-2">
                    <Sparkles className="text-primary mt-0.5 size-3.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="line-clamp-1">{g.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {SERVICE_LABELS[g.service] ?? metricLabel(g.service)} · {fmtDate(g.created_at, tz)}
                      </p>
                    </div>
                  </li>
                ))}
                {data.activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-2">
                    <Eye className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="line-clamp-1">
                        {ACTION_LABELS[a.action] ?? a.action.replace(/[._]/g, " ")}
                        {typeof (a.metadata as Record<string, unknown>)?.platform === "string"
                          ? ` · ${platformName((a.metadata as Record<string, string>).platform)}`
                          : ""}
                      </p>
                      <p className="text-muted-foreground text-xs">{fmtDate(a.created_at, tz)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
