"use client";

import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { cn } from "@/lib/utils";
import { formatNumber, metricLabel, type PlatformSummary } from "./metrics";

export const ENGAGEMENT_RATE_EXPLAINER =
  "Engagement rate = (likes + comments + shares + saves) ÷ impressions × 100 for this platform and period. Only interaction metrics the platform reports are counted. Shown only when impressions are available; otherwise 'Not available'.";

/** One card per platform; each metric shows only what that platform supplied, with its source. */
export function PlatformSummaryCards({ summaries }: { summaries: PlatformSummary[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {summaries.map((s) => {
        const name = isPlatformId(s.platform) ? PLATFORMS[s.platform].name : s.platform;
        const color = isPlatformId(s.platform) ? PLATFORMS[s.platform].color : undefined;
        const metrics = Object.values(s.metrics).sort((a, b) => Number(b.isLevel) - Number(a.isLevel) || a.key.localeCompare(b.key));
        return (
          <Card key={s.platform} className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
                {name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                {metrics.map((m) => (
                  <div key={m.key} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <dt className="text-muted-foreground flex items-center gap-1">
                      {metricLabel(m.key)}
                      {m.platformNames.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger aria-label={`Platform metric name for ${metricLabel(m.key)}`}>
                            <Info className="size-3 opacity-60" />
                          </TooltipTrigger>
                          <TooltipContent>Platform metric: {m.platformNames.join(", ")}</TooltipContent>
                        </Tooltip>
                      )}
                    </dt>
                    <dd className="flex flex-wrap items-center justify-end gap-1.5">
                      <span className="font-medium tabular-nums">{formatNumber(m.value)}</span>
                      {m.isLevel && m.change !== null && m.change !== 0 && (
                        <span className={cn("flex items-center gap-0.5 text-xs tabular-nums", m.change > 0 ? "text-success" : "text-destructive")}>
                          {m.change > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          {m.change > 0 ? "+" : ""}
                          {formatNumber(m.change)}
                        </span>
                      )}
                      {!m.isLevel && <span className="text-muted-foreground text-xs">total</span>}
                      {m.sources.map((src) => (
                        <DataSourceBadge key={src} source={src} />
                      ))}
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 py-2 text-sm">
                  <dt className="text-muted-foreground flex items-center gap-1">
                    Engagement rate
                    <Tooltip>
                      <TooltipTrigger aria-label="How engagement rate is calculated">
                        <Info className="size-3 opacity-60" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">{ENGAGEMENT_RATE_EXPLAINER}</TooltipContent>
                    </Tooltip>
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {s.engagementRate === null ? <span className="text-muted-foreground font-normal">Not available</span> : `${s.engagementRate}%`}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
