import { Settings } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsTabs, type SettingsTab } from "@/features/settings/components/settings-tabs";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { BrandForm } from "@/features/settings/components/brand-form";
import { AppearanceForm } from "@/features/settings/components/appearance-form";
import { NotificationForm } from "@/features/settings/components/notification-form";
import { WorkspacesPanel, type MemberItem, type WorkspaceItem } from "@/features/settings/components/workspaces-panel";
import { SecurityPanel } from "@/features/settings/components/security-panel";
import { loadDashboardPage } from "@/lib/auth/page";
import { getAuthUser } from "@/lib/auth/session";
import { getEntitlements, hasFeature } from "@/lib/entitlements";
import { isEmailConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { NotificationSettings, OrgRole, UserType } from "@/types/database";
import type { PlatformId } from "@/config/platforms";

export const metadata = { title: "Settings" };

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  in_app: {
    scheduled_posts: true,
    publish_success: true,
    publish_failure: true,
    subscription: true,
    ai_limits: true,
    weekly_report: true,
    integrations: true,
  },
  email: { publish_failure: true, subscription: true, weekly_report: false },
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { ctx, ent } = await loadDashboardPage();
  const supabase = await createClient();
  const org = ctx.organization;
  const canManage = ctx.role === "owner" || ctx.role === "admin";

  const [prefsRes, membershipsRes, membersRes, ownEnt, authUser] = await Promise.all([
    supabase.from("user_preferences").select("*").eq("user_id", ctx.userId).maybeSingle(),
    supabase.from("organization_members").select("role, organizations(id, name, type, owner_id)").eq("user_id", ctx.userId),
    supabase.from("organization_members").select("id, user_id, role, profiles(full_name, email)").eq("organization_id", org.id).order("created_at"),
    getEntitlements(ctx.userId),
    getAuthUser(),
  ]);

  type OrgEmbed = { id: string; name: string; type: string; owner_id: string } | null;
  const workspaces: WorkspaceItem[] = (membershipsRes.data ?? [])
    .map((m) => ({ role: m.role as OrgRole, org: m.organizations as unknown as OrgEmbed }))
    .filter((m): m is { role: OrgRole; org: NonNullable<OrgEmbed> } => Boolean(m.org))
    .map(({ role, org: o }) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      role,
      isOwner: o.owner_id === ctx.userId,
      isCurrent: o.id === org.id,
    }));

  type ProfileEmbed = { full_name: string | null; email: string } | null;
  const members: MemberItem[] = (membersRes.data ?? []).map((m) => {
    const p = m.profiles as unknown as ProfileEmbed;
    return { id: m.id, userId: m.user_id, role: m.role as OrgRole, name: p?.full_name ?? "", email: p?.email ?? "" };
  });

  const providers = (authUser?.app_metadata?.providers as string[] | undefined) ?? [authUser?.app_metadata?.provider as string];
  const hasPassword = providers.includes("email");
  const prefs = prefsRes.data;

  return (
    <div className="space-y-6">
      <PageHeader icon={Settings} title="Settings" description="Manage your profile, brand, preferences, team and data." />
      <SettingsTabs
        initialTab={(tab as SettingsTab) ?? "profile"}
        panels={{
          profile: (
            <ProfileForm
              email={ctx.email}
              initial={{ fullName: ctx.profile.full_name ?? "", avatarUrl: ctx.profile.avatar_url ?? "", timezone: ctx.profile.timezone }}
            />
          ),
          brand: (
            <BrandForm
              canManage={canManage}
              initial={{
                name: org.name,
                userType: (org.user_type as UserType | null) ?? null,
                niche: org.niche ?? "",
                targetAudience: org.target_audience ?? "",
                location: org.location ?? "",
                brandVoice: org.brand_voice ?? "",
                platforms: org.platforms as PlatformId[],
                goals: org.goals,
                postingFrequency: org.posting_frequency ?? "",
                contentResources: org.content_resources ?? "",
                preferredFormats: org.preferred_formats,
              }}
            />
          ),
          appearance: <AppearanceForm savedTheme={prefs?.theme ?? "system"} />,
          notifications: (
            <NotificationForm initial={(prefs?.notification_settings as NotificationSettings | undefined) ?? DEFAULT_NOTIFICATIONS} emailConfigured={isEmailConfigured()} />
          ),
          workspaces: (
            <WorkspacesPanel
              workspaces={workspaces}
              members={members}
              currentUserId={ctx.userId}
              currentWorkspaceName={org.name}
              canManage={canManage}
              canCreateBrand={hasFeature(ownEnt.plan, "multi_brand")}
              canCreateClient={hasFeature(ownEnt.plan, "client_workspaces")}
              canAddMembers={hasFeature(ent.plan, "team_members")}
              workspaceLimit={ownEnt.plan.limits.workspaces}
              ownedCount={workspaces.filter((w) => w.isOwner).length}
              memberLimit={ent.plan.limits.teamMembers}
            />
          ),
          security: <SecurityPanel hasPassword={hasPassword} />,
        }}
      />
    </div>
  );
}
