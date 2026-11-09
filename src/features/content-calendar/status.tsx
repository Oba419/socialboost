import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SCHEDULE_STATUS: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "border-brand-blue/40 bg-brand-blue/10 text-brand-blue" },
  processing: { label: "Publishing…", className: "border-primary/40 bg-primary/10 text-primary" },
  published: { label: "Published", className: "border-success/40 bg-success/10 text-success" },
  failed: { label: "Failed", className: "border-destructive/40 bg-destructive/10 text-destructive" },
  manual_required: { label: "Post manually", className: "border-warning/50 bg-warning/10 text-warning" },
  cancelled: { label: "Cancelled", className: "text-muted-foreground line-through" },
};

const POST_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "text-muted-foreground" },
  ready: { label: "Ready", className: "border-brand-blue/40 text-brand-blue" },
  scheduled: { label: "Scheduled", className: "border-primary/40 text-primary" },
  published: { label: "Published", className: "border-success/40 text-success" },
  failed: { label: "Failed", className: "border-destructive/40 text-destructive" },
  archived: { label: "Archived", className: "text-muted-foreground" },
};

export function ScheduleStatusBadge({ status, manualPublished, className }: { status: string; manualPublished?: boolean; className?: string }) {
  const meta = SCHEDULE_STATUS[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={cn("font-normal", meta.className, className)}>
      {status === "published" && manualPublished ? "Marked as posted by you" : meta.label}
    </Badge>
  );
}

export function PostStatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = POST_STATUS[status] ?? { label: status, className: "" };
  return (
    <Badge variant="outline" className={cn("font-normal", meta.className, className)}>
      {meta.label}
    </Badge>
  );
}

/** Small coloured dot per platform (not a logo). */
export function PlatformDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 shrink-0 rounded-full", className)} style={{ backgroundColor: color }} />;
}

/** Classes for a calendar event chip by schedule status. */
export function eventChipClass(status: string): string {
  switch (status) {
    case "published":
      return "border-success/40 bg-success/10";
    case "failed":
      return "border-destructive/40 bg-destructive/10";
    case "manual_required":
      return "border-warning/50 bg-warning/10";
    case "cancelled":
      return "opacity-50 line-through";
    case "processing":
      return "border-primary/40 bg-primary/10";
    default:
      return "border-brand-blue/30 bg-brand-blue/5";
  }
}
