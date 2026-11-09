import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint && <CardContent className="text-muted-foreground text-xs">{hint}</CardContent>}
    </Card>
  );
}

export function StatusBadge({ value }: { value: string }) {
  const cls =
    value === "active" || value === "success" || value === "resolved"
      ? "border-success/40 text-success"
      : value === "past_due" || value === "failed" || value === "suspended"
        ? "border-destructive/40 text-destructive"
        : value === "pending" || value === "running" || value === "non_renewing" || value === "open" || value === "in_progress"
          ? "border-warning/50 text-warning"
          : "text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("font-normal", cls)}>
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

/** Simple server-rendered pager driven by ?page=. */
export function Pager({ page, totalPages, baseHref }: { page: number; totalPages: number; baseHref: (p: number) => string }) {
  if (totalPages <= 1) return null;
  const link = "rounded-md border px-3 py-1.5 text-sm hover:bg-accent";
  return (
    <div className="flex items-center justify-end gap-2">
      {page > 1 ? (
        <Link className={link} href={baseHref(page - 1)}>
          Previous
        </Link>
      ) : (
        <span className={cn(link, "pointer-events-none opacity-50")}>Previous</span>
      )}
      <span className="text-muted-foreground text-sm tabular-nums">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link className={link} href={baseHref(page + 1)}>
          Next
        </Link>
      ) : (
        <span className={cn(link, "pointer-events-none opacity-50")}>Next</span>
      )}
    </div>
  );
}

export function fmtDateTime(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export function AdminTitle({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
