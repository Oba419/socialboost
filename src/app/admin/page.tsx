import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminTitle, fmtDateTime, StatCard, StatusBadge } from "@/features/admin/ui";
import { formatMoney } from "@/config/plans";
import { PLATFORMS } from "@/config/platforms";
import { requireAdmin } from "@/lib/auth/session";
import { isEmailConfigured, isOpenAIConfigured, isPaystackConfigured, isServiceRoleConfigured, serverEnv } from "@/lib/env";
import { integrationStatus } from "@/lib/social/registry";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Admin overview" };

const DAY = 86_400_000;

function groupCount<T>(rows: T[], key: (r: T) => string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Data loading + aggregation (outside the component so render stays pure). */
async function loadOverview() {
  const admin = createAdminClient();
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const since365 = new Date(now - 365 * DAY).toISOString();

  const [users, usageRows, activityRows, subs, payments, failedJobs, openSupport] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("ai_usage").select("user_id, service, credits, input_tokens, output_tokens").gte("created_at", since30).limit(20000),
    admin.from("activity_logs").select("user_id").gte("created_at", since30).limit(20000),
    admin.from("subscriptions").select("plan_id, status").limit(20000),
    admin
      .from("payments")
      .select("amount, currency, paid_at, verified_at")
      .eq("status", "success")
      .not("verified_at", "is", null)
      .gte("created_at", since365)
      .limit(20000),
    admin.from("job_runs").select("id, job, error, started_at").eq("status", "failed").order("started_at", { ascending: false }).limit(8),
    admin.from("contact_messages").select("id", { count: "exact", head: true }).neq("status", "resolved"),
  ]);

  const activeUsers = new Set<string>([
    ...(usageRows.data ?? []).map((r) => r.user_id),
    ...(activityRows.data ?? []).map((r) => r.user_id).filter((v): v is string => Boolean(v)),
  ]).size;

  const byPlan = groupCount(subs.data ?? [], (s) => s.plan_id);
  const byStatus = groupCount(subs.data ?? [], (s) => s.status);

  // Revenue by month from VERIFIED successful payments only.
  const revenue = new Map<string, number>();
  for (const p of payments.data ?? []) {
    const d = new Date(p.paid_at ?? p.verified_at ?? now);
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    revenue.set(k, (revenue.get(k) ?? 0) + Number(p.amount));
  }
  const revenueRows = [...revenue.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  const maxRevenue = Math.max(1, ...revenueRows.map((r) => r[1]));
  const revenue30 = (payments.data ?? [])
    .filter((p) => new Date(p.paid_at ?? p.verified_at ?? 0).getTime() >= now - 30 * DAY)
    .reduce((s, p) => s + Number(p.amount), 0);

  const aiByService = new Map<string, { calls: number; credits: number; tokens: number }>();
  for (const r of usageRows.data ?? []) {
    const e = aiByService.get(r.service) ?? { calls: 0, credits: 0, tokens: 0 };
    e.calls += 1;
    e.credits += r.credits;
    e.tokens += (r.input_tokens ?? 0) + (r.output_tokens ?? 0);
    aiByService.set(r.service, e);
  }
  const aiRows = [...aiByService.entries()].sort((a, b) => b[1].credits - a[1].credits);
  const totalCredits = aiRows.reduce((s, [, v]) => s + v.credits, 0);

  const env = serverEnv();
  const core = [
    { name: "Supabase service role", ok: isServiceRoleConfigured() },
    { name: "OpenAI", ok: isOpenAIConfigured() },
    { name: "Paystack", ok: isPaystackConfigured() },
    { name: "Email (Resend)", ok: isEmailConfigured() },
    { name: "Cron secret", ok: Boolean(env.CRON_SECRET) },
    { name: "Token encryption key", ok: Boolean(env.TOKEN_ENCRYPTION_KEY) },
    { name: "OAuth state secret", ok: Boolean(env.OAUTH_STATE_SECRET) },
  ];
  const social = Object.entries(integrationStatus()).map(([id, s]) => ({
    name: PLATFORMS[id as keyof typeof PLATFORMS].name,
    ok: s.configured,
  }));

  return {
    totalUsers: users.count ?? 0,
    activeUsers,
    revenue30,
    openSupport: openSupport.count ?? 0,
    revenueRows,
    maxRevenue,
    byPlan,
    byStatus,
    aiRows,
    totalCredits,
    core,
    social,
    failedJobs: failedJobs.data ?? [],
  };
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const {
    totalUsers,
    activeUsers,
    revenue30,
    openSupport,
    revenueRows,
    maxRevenue,
    byPlan,
    byStatus,
    aiRows,
    totalCredits,
    core,
    social,
    failedJobs,
  } = await loadOverview();

  return (
    <div className="space-y-6">
      <AdminTitle title="Overview" description="Platform health, usage and verified revenue." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered users" value={totalUsers} />
        <StatCard label="Active users (30d)" value={activeUsers} hint="Users with AI usage or logged activity" />
        <StatCard label="Verified revenue (30d)" value={formatMoney(revenue30)} hint="Successful, server-verified payments only" />
        <StatCard
          label="Open support requests"
          value={<Link href="/admin/support" className="hover:underline">{openSupport}</Link>}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by month (verified)</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">No verified payments yet.</p>
            ) : (
              <ul className="space-y-2">
                {revenueRows.map(([month, amount]) => (
                  <li key={month} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 text-sm">
                    <span className="text-muted-foreground tabular-nums">{month}</span>
                    <span className="bg-muted h-2 overflow-hidden rounded-full">
                      <span className="bg-brand-gradient block h-full rounded-full" style={{ width: `${(amount / maxRevenue) * 100}%` }} />
                    </span>
                    <span className="tabular-nums">{formatMoney(amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">By plan</p>
              <ul className="space-y-1 text-sm">
                {byPlan.map(([k, v]) => (
                  <li key={k} className="flex justify-between">
                    <span>{k}</span>
                    <span className="tabular-nums">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">By status</p>
              <ul className="space-y-1 text-sm">
                {byStatus.map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between">
                    <StatusBadge value={k} />
                    <span className="tabular-nums">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI usage (30d) · {totalCredits} credits</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {aiRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">No AI usage recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiRows.map(([service, v]) => (
                    <TableRow key={service}>
                      <TableCell>{service.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.calls}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.credits}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.tokens.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integration status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            {[
              { title: "Core", rows: core },
              { title: "Social platforms", rows: social },
            ].map((group) => (
              <div key={group.title}>
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">{group.title}</p>
                <ul className="space-y-1.5 text-sm">
                  {group.rows.map((r) => (
                    <li key={r.name} className="flex items-center justify-between gap-2">
                      <span>{r.name}</span>
                      <StatusBadge value={r.ok ? "active" : "not configured"} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent failed background jobs</CardTitle>
          <Link href="/admin/jobs" className="text-muted-foreground text-sm hover:underline">
            All jobs
          </Link>
        </CardHeader>
        <CardContent>
          {!failedJobs.length ? (
            <p className="text-muted-foreground text-sm">No failed jobs. 🎉</p>
          ) : (
            <ul className="divide-y text-sm">
              {failedJobs.map((j) => (
                <li key={j.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{j.job}</span>
                  <span className="text-muted-foreground truncate sm:max-w-md">{j.error}</span>
                  <span className="text-muted-foreground text-xs">{fmtDateTime(j.started_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
