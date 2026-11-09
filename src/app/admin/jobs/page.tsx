import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminTitle, fmtDateTime, Pager, StatusBadge } from "@/features/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Jobs" };
const PAGE_SIZE = 30;

function duration(start: string, end: string | null) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ failed?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const onlyFailed = sp.failed === "1";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  let query = createAdminClient()
    .from("job_runs")
    .select("*", { count: "exact" })
    .order("started_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (onlyFailed) query = query.eq("status", "failed");
  const { data: jobs, count } = await query;
  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-xs", active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent");

  return (
    <div className="space-y-4">
      <AdminTitle title="Background jobs" description="Cron runs for publishing, metrics sync and subscription renewals." />
      <div className="flex gap-2">
        <Link href="/admin/jobs" className={chip(!onlyFailed)}>
          All
        </Link>
        <Link href="/admin/jobs?failed=1" className={chip(onlyFailed)}>
          Failed
        </Link>
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {!jobs?.length ? (
            <EmptyState title="No job runs recorded" description="Runs appear once the cron endpoints are scheduled." className="m-4" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Details / error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium whitespace-nowrap">{j.job}</TableCell>
                    <TableCell>
                      <StatusBadge value={j.status} />
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(j.started_at)}</TableCell>
                    <TableCell className="text-xs tabular-nums">{duration(j.started_at, j.finished_at)}</TableCell>
                    <TableCell className="max-w-md">
                      <code className={cn("line-clamp-2 text-xs break-all", j.error ? "text-destructive" : "text-muted-foreground")}>
                        {j.error ?? JSON.stringify(j.details)}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Pager
        page={page}
        totalPages={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))}
        baseHref={(p) => `/admin/jobs?${new URLSearchParams({ ...(onlyFailed && { failed: "1" }), page: String(p) })}`}
      />
    </div>
  );
}
