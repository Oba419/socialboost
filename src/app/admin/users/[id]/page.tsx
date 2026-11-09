import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTitle, fmtDateTime, StatusBadge } from "@/features/admin/ui";
import { UserStatusControl } from "@/features/admin/user-status-control";
import { SubscriptionAdminControl } from "@/features/admin/subscription-admin-control";
import { formatMoney } from "@/config/plans";
import { requireAdmin } from "@/lib/auth/session";
import { getEntitlements } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Admin · User" };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin();
  const parsed = z.string().uuid().safeParse((await params).id);
  if (!parsed.success) notFound();
  const id = parsed.data;
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const [ent, { data: sub }, { data: memberships }, { data: payments }, { data: activity }, { data: plans }] = await Promise.all([
    getEntitlements(id),
    admin.from("subscriptions").select("*").eq("user_id", id).maybeSingle(),
    admin.from("organization_members").select("role, organizations(id, name, type, owner_id)").eq("user_id", id),
    admin.from("payments").select("reference, amount, currency, status, plan_id, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    admin.from("activity_logs").select("id, action, created_at, metadata").eq("user_id", id).order("created_at", { ascending: false }).limit(15),
    admin.from("subscription_plans").select("id, name").order("sort_order"),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" /> Users
      </Link>
      <AdminTitle title={profile.full_name || profile.email} description={profile.email} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Status</span> <StatusBadge value={profile.status} />
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Role</span> {profile.role}
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Onboarded</span> {profile.onboarding_completed ? "Yes" : "No"}
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Timezone</span> {profile.timezone}
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Joined</span> {fmtDateTime(profile.created_at)}
            </p>
            {profile.id !== ctx.userId && profile.role !== "admin" && (
              <div className="pt-3">
                <UserStatusControl userId={profile.id} status={profile.status} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan & usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Effective plan</span> {ent.plan.name}
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Subscription</span>
              <span>
                {sub?.plan_id ?? "free"} {sub && <StatusBadge value={sub.status} />}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">Period ends</span> {fmtDateTime(sub?.current_period_end)}
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">AI credits</span>
              <span className="tabular-nums">
                {ent.aiCreditsUsed} / {ent.plan.limits.aiCreditsPerPeriod}
              </span>
            </p>
            <div className="pt-3">
              <SubscriptionAdminControl userId={profile.id} plans={plans ?? []} currentPlanId={sub?.plan_id ?? "free"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {(memberships ?? []).map((m, i) => {
                const org = m.organizations as unknown as { id: string; name: string; type: string; owner_id: string } | null;
                return org ? (
                  <li key={org.id ?? i} className="flex justify-between gap-2">
                    <span className="truncate">{org.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {org.type} · {m.role}
                    </span>
                  </li>
                ) : null;
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent payments</CardTitle>
          </CardHeader>
          <CardContent>
            {!payments?.length ? (
              <p className="text-muted-foreground text-sm">No payments.</p>
            ) : (
              <ul className="divide-y text-sm">
                {payments.map((p) => (
                  <li key={p.reference} className="flex items-center justify-between gap-2 py-2">
                    <span className="text-muted-foreground text-xs">{fmtDateTime(p.created_at)}</span>
                    <span>{p.plan_id}</span>
                    <span className="tabular-nums">{formatMoney(p.amount, p.currency)}</span>
                    <StatusBadge value={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!activity?.length ? (
              <p className="text-muted-foreground text-sm">No activity recorded.</p>
            ) : (
              <ul className="divide-y text-sm">
                {activity.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2 py-2">
                    <span>{a.action}</span>
                    <span className="text-muted-foreground text-xs">{fmtDateTime(a.created_at)}</span>
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
