"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BarChart3, Download, FlaskConical, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { OptionSelect } from "@/components/forms/option-select";
import { PLATFORMS, isPlatformId, type PlatformId } from "@/config/platforms";
import { apiFetch, toastError } from "@/hooks/use-api";
import { AIReviewPanel } from "./ai-review-panel";
import { ManualEntryDialog } from "./manual-entry-dialog";
import { MetricChart } from "./metric-chart";
import { ENGAGEMENT_RATE_EXPLAINER, PlatformSummaryCards } from "./platform-summary";
import {
  LEVEL_METRICS,
  dateRange,
  generateDemoRows,
  metricLabel,
  seriesByPlatform,
  summarizeByPlatform,
  type MetricRow,
} from "./metrics";
import type { MetricSource } from "@/types/database";

interface ManualEntry {
  id: string;
  platform: string;
  social_account_id: string | null;
  metric_date: string;
  metric_key: string;
  value: number;
  source: MetricSource;
}

export function AnalyticsView({
  rows,
  from,
  to,
  rangeLabel,
  platformFilter,
  accountFilter,
  platforms,
  accounts,
  manualEntries,
  canEdit,
  canExport,
  aiReady,
  demoMode,
}: {
  rows: MetricRow[];
  from: string;
  to: string;
  rangeLabel: string;
  platformFilter?: string;
  accountFilter?: string;
  platforms: PlatformId[];
  accounts: { id: string; label: string; platform: string }[];
  manualEntries: ManualEntry[];
  canEdit: boolean;
  canExport: boolean;
  aiReady: boolean;
  demoMode: boolean;
}) {
  const router = useRouter();
  const dates = useMemo(() => dateRange(from, to), [from, to]);
  // Demo series only when explicitly enabled AND there is no real data — never mixed with real rows.
  const usingDemo = demoMode && rows.length === 0;
  const data = useMemo(
    () => (usingDemo ? generateDemoRows(platformFilter ? [platformFilter] : platforms.slice(0, 3), dates) : rows),
    [usingDemo, rows, platformFilter, platforms, dates],
  );
  const summaries = useMemo(() => summarizeByPlatform(data), [data]);
  const metricKeys = useMemo(() => {
    const keys = [...new Set(data.map((r) => r.metric_key))];
    return keys.sort((a, b) => Number(LEVEL_METRICS.has(b)) - Number(LEVEL_METRICS.has(a)) || a.localeCompare(b));
  }, [data]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey = selectedKey && metricKeys.includes(selectedKey) ? selectedKey : metricKeys[0];
  const chart = useMemo(() => (activeKey ? seriesByPlatform(data, activeKey, dates) : null), [data, activeKey, dates]);
  const chartSources = useMemo(() => [...new Set(data.filter((r) => r.metric_key === activeKey).map((r) => r.source))], [data, activeKey]);

  const exportHref = `/api/analytics/export?${new URLSearchParams({
    from,
    to,
    ...(platformFilter ? { platform: platformFilter } : {}),
    ...(accountFilter ? { accountId: accountFilter } : {}),
  })}`;

  async function deleteEntry(id: string) {
    const res = await apiFetch(`/api/analytics/manual?id=${id}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    toast.success("Entry deleted");
    router.refresh();
  }

  const accountLabel = (id: string | null) => (id ? accounts.find((a) => a.id === id)?.label ?? "Account" : "—");

  return (
    <div className="space-y-6">
      {usingDemo && (
        <Alert className="border-warning/50 bg-warning/5 sticky top-20 z-10">
          <FlaskConical className="text-warning" />
          <AlertTitle>Demo data — not your real performance</AlertTitle>
          <AlertDescription>
            Demo mode is on and this workspace has no real metrics for the selected range. These sample figures are generated in your browser for
            illustration only and are never saved.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">{rangeLabel}</p>
        <div className="flex flex-wrap gap-2">
          {canEdit && <ManualEntryDialog accounts={accounts} defaultPlatform={platformFilter ?? platforms[0]} />}
          {canExport ? (
            <Button variant="outline" size="sm" asChild disabled={rows.length === 0}>
              <a href={exportHref} download>
                <Download className="size-4" /> Export CSV
              </a>
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="outline" size="sm" disabled>
                    <Download className="size-4" /> Export CSV
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Report export is available on Business and Agency plans</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No performance data for this period"
          description="Connect an account on the Social Accounts page to pull live metrics, or add figures manually from your platforms' native analytics."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <a href="/dashboard/accounts">Connect accounts</a>
              </Button>
              {canEdit && <ManualEntryDialog accounts={accounts} defaultPlatform={platformFilter ?? platforms[0]} />}
            </div>
          }
        />
      ) : (
        <>
          <PlatformSummaryCards summaries={summaries} />

          <Card>
            <CardHeader className="flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Trend by platform</CardTitle>
                <CardDescription>
                  Compares the same metric across platforms. {activeKey && LEVEL_METRICS.has(activeKey) ? "Running total per day." : "Daily activity."}
                </CardDescription>
                <div className="flex flex-wrap gap-1">
                  {chartSources.map((s) => (
                    <DataSourceBadge key={s} source={s} />
                  ))}
                </div>
              </div>
              <OptionSelect
                className="w-48"
                value={activeKey}
                onChange={setSelectedKey}
                options={metricKeys.map((k) => ({ value: k, label: metricLabel(k) }))}
              />
            </CardHeader>
            <CardContent>
              {chart && activeKey && (
                <MetricChart points={chart.points} platforms={chart.platforms} isLevel={LEVEL_METRICS.has(activeKey)} label={metricLabel(activeKey)} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4" /> Best-performing content
            </CardTitle>
            <CardDescription>Ranked by real post-level metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="No post-level data yet"
              description="Post rankings appear once a connected platform provides per-post insights for content published through this app. We don't estimate or invent post performance."
              className="py-8"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How we calculate metrics</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>
              <span className="text-foreground font-medium">Engagement rate.</span> {ENGAGEMENT_RATE_EXPLAINER}
            </p>
            <p>
              <span className="text-foreground font-medium">Followers</span> are a point-in-time total: we show the latest value and the change within
              the period. Daily activity metrics (impressions, likes…) are summed over the period.
            </p>
            <p>
              <span className="text-foreground font-medium">No cross-platform totals.</span> Platforms define metrics differently (e.g. a TikTok view
              is not an Instagram impression), so we compare platforms side by side instead of adding them up.
            </p>
          </CardContent>
        </Card>
      </div>

      <AIReviewPanel aiReady={aiReady} hasData={rows.length > 0} />

      {manualEntries.length > 0 && (
        <Collapsible>
          <Card>
            <CardHeader>
              <CollapsibleTrigger className="text-left">
                <CardTitle className="text-base underline-offset-4 hover:underline">Recent manual & imported entries ({manualEntries.length})</CardTitle>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead>Source</TableHead>
                      {canEdit && <TableHead className="sr-only">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manualEntries.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="tabular-nums">{m.metric_date}</TableCell>
                        <TableCell>{isPlatformId(m.platform) ? PLATFORMS[m.platform].name : m.platform}</TableCell>
                        <TableCell>{accountLabel(m.social_account_id)}</TableCell>
                        <TableCell>{metricLabel(m.metric_key)}</TableCell>
                        <TableCell className="text-right tabular-nums">{m.value.toLocaleString()}</TableCell>
                        <TableCell>
                          <DataSourceBadge source={m.source} />
                        </TableCell>
                        {canEdit && (
                          <TableCell>
                            <ConfirmDialog
                              trigger={
                                <Button size="icon" variant="ghost" className="size-8" aria-label="Delete entry">
                                  <Trash2 className="size-4" />
                                </Button>
                              }
                              title="Delete this entry?"
                              description="This removes the manually entered figure from your analytics."
                              confirmLabel="Delete"
                              destructive
                              onConfirm={() => deleteEntry(m.id)}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {rows.some((r) => r.source !== "api") && rows.some((r) => r.source === "api") && (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <AlertTriangle className="size-3" /> This view mixes live and manually entered figures. Each metric is labelled with its source.
        </p>
      )}
    </div>
  );
}
