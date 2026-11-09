import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Topbar } from "@/components/layout/topbar";
import { SetupRequired } from "@/components/shared/setup-required";
import { requireOnboardedUser } from "@/lib/auth/session";
import { getContextEntitlements } from "@/lib/entitlements";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <SetupRequired integration="Supabase" envVars={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]} />
      </div>
    );
  }

  const ctx = await requireOnboardedUser();
  const supabase = await createClient();

  const [ent, memberships, unread] = await Promise.all([
    getContextEntitlements(ctx),
    supabase.from("organization_members").select("organization_id, organizations(id, name, type)").eq("user_id", ctx.userId),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("read_at", null),
  ]);

  const workspaces = (memberships.data ?? [])
    .map((m) => m.organizations as unknown as { id: string; name: string; type: string } | null)
    .filter((o): o is { id: string; name: string; type: string } => Boolean(o));

  return (
    <DashboardShell
      features={ent.plan.features}
      isAdmin={ctx.profile.role === "admin"}
      topbar={
        <Topbar
          user={{ name: ctx.profile.full_name ?? "", email: ctx.email, avatarUrl: ctx.profile.avatar_url }}
          workspaces={workspaces}
          currentWorkspaceId={ctx.organization.id}
          planName={ent.plan.name}
          credits={{ used: ent.aiCreditsUsed, limit: ent.plan.limits.aiCreditsPerPeriod }}
          unreadNotifications={unread.count ?? 0}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
