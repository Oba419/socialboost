import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MetricSource } from "@/types/database";
import { cn } from "@/lib/utils";

const META: Record<MetricSource, { label: string; hint: string; className: string }> = {
  api: { label: "Live data", hint: "Retrieved from the platform's official API.", className: "border-success/40 text-success" },
  manual: { label: "Manual entry", hint: "Entered by you. Not verified by the platform.", className: "border-brand-blue/40 text-brand-blue" },
  import: { label: "Imported", hint: "Imported historical data. Not verified by the platform.", className: "border-chart-3/40 text-chart-3" },
  demo: { label: "Demo data", hint: "Sample data for demonstration only. Not real performance.", className: "border-warning/50 text-warning" },
};

/** Labels the provenance of every metric so fictional numbers are never mistaken for real ones. */
export function DataSourceBadge({ source, className }: { source: MetricSource; className?: string }) {
  const m = META[source];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("cursor-help font-normal", m.className, className)}>
          {m.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{m.hint}</TooltipContent>
    </Tooltip>
  );
}
