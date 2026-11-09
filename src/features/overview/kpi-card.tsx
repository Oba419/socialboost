import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DataSourceBadge } from "@/components/shared/data-source-badge";
import type { MetricSource } from "@/types/database";
import { cn } from "@/lib/utils";

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  delta,
  sources = [],
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: number | null;
  sources?: MetricSource[];
  className?: string;
}) {
  return (
    <Card className={cn("gap-2 py-5", className)}>
      <CardContent className="space-y-2 px-5">
        <div className="text-muted-foreground flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <Icon className="size-4" /> {label}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {typeof delta === "number" && delta !== 0 && (
            <span className={cn("text-xs font-medium tabular-nums", delta > 0 ? "text-success" : "text-destructive")}>
              {delta > 0 ? "+" : ""}
              {delta.toLocaleString()}
            </span>
          )}
        </div>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        {sources.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {sources.map((s) => (
              <DataSourceBadge key={s} source={s} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
