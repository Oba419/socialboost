import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminTitle, fmtDateTime, Pager, StatusBadge } from "@/features/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Subscriptions" };
const PAGE_SIZE = 25;
const STATUSES = ["active", "non_renewing", "past_due", "cancelled", "expired"] as const;

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const admin = createAdminClient();
  const { data: plans } = await admin.from("subscription_plans").select("id, name").order("sort_order");
  const plan = plans?.some((p) => p.id === sp.plan) ? sp.plan : undefined;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status : undefined;

  let query = admin
    .from("subscriptions")
    .select("id, user_id, plan_id, status, billing_interval, current_period_end, cancel_at_period_end, pending_plan_id, renewal_attempts, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (plan) query = query.eq("plan_id", plan);
  if (status) query = query.eq("status", status as (typeof STATUSES)[number]);
  const { data: subs, count } = await query;

  const ids = (subs ?? []).map((s) => s.user_id);
  const { data: profiles } = ids.length ? await admin.from("profiles").select("id, email").in("id", ids) : { data: [] };
  const emails = new Map((profiles ?? []).map((p) => [p.id, p.email]));

  const href = (o: { plan?: string; status?: string; page?: number }) =>
    `/admin/subscriptions?${new URLSearchParams({
      ...((o.plan ?? plan) && { plan: (o.plan ?? plan)! }),
      ...((o.status ?? status) && { status: (o.status ?? status)! }),
      page: String(o.page ?? 1),
    })}`;
  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-xs", active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent");

  return (
    <div className="space-y-4">
      <AdminTitle title="Subscriptions" description={`${count ?? 0} matching`} />
      <div className="flex flex-wrap gap-2" aria-label="Filter by plan">
        <Link href="/admin/subscriptions" className={chip(!plan && !status)}>
          All
        </Link>
        {plans?.map((p) => (
          <Link key={p.id} href={href({ plan: p.id })} className={chip(plan === p.id)}>
            {p.name}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Filter by status">
        {STATUSES.map((s) => (
          <Link key={s} href={href({ status: s })} className={chip(status === s)}>
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {!subs?.length ? (
            <EmptyState title="No subscriptions match" className="m-4" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period end</TableHead>
                  <TableHead className="hidden lg:table-cell">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/admin/users/${s.user_id}`} className="hover:underline">
                        {emails.get(s.user_id) ?? s.user_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {s.plan_id} <span className="text-muted-foreground text-xs">· {s.billing_interval}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={s.status} />
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(s.current_period_end)}</TableCell>
                    <TableCell className="text-muted-foreground hidden text-xs lg:table-cell">
                      {[
                        s.cancel_at_period_end && "cancels at end",
                        s.pending_plan_id && `→ ${s.pending_plan_id}`,
                        s.renewal_attempts > 0 && `${s.renewal_attempts} failed renewals`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Pager page={page} totalPages={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))} baseHref={(p) => href({ page: p })} />
    </div>
  );
}
