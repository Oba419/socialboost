import { Share2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SetupRequired } from "@/components/shared/setup-required";
import { loadDashboardPage } from "@/lib/auth/page";
import { isServiceRoleConfigured, serverEnv } from "@/lib/env";
import { integrationStatus } from "@/lib/social/registry";
import { createClient } from "@/lib/supabase/server";
import { AccountsManager, type ConnectedAccountView } from "@/features/social-accounts/accounts-manager";

export const metadata = { title: "Social Accounts" };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { ctx, ent } = await loadDashboardPage();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  const flash = { connected: one(sp.connected), error: one(sp.error), skipped: one(sp.skipped) };
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, platform, username, display_name, avatar_url, account_type, status, scopes, last_synced_at, last_error, created_at")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: true });

  const infraMissing = [
    !isServiceRoleConfigured() && "SUPABASE_SERVICE_ROLE_KEY",
    !serverEnv().TOKEN_ENCRYPTION_KEY && "TOKEN_ENCRYPTION_KEY",
    !serverEnv().OAUTH_STATE_SECRET && "OAUTH_STATE_SECRET",
  ].filter((v): v is string => Boolean(v));

  const status = integrationStatus();
  if (infraMissing.length) {
    for (const k of Object.keys(status) as (keyof typeof status)[]) status[k] = { ...status[k], configured: false };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Share2}
        title="Social Accounts"
        description="Connect accounts through each platform's official OAuth. We never ask for or store your social media passwords."
      />
      {infraMissing.length > 0 && <SetupRequired integration="Secure account connections" envVars={infraMissing} />}
      <AccountsManager
        accounts={(accounts ?? []) as ConnectedAccountView[]}
        status={status}
        limit={ent.plan.limits.socialAccounts}
        planName={ent.plan.name}
        canEdit={ctx.role !== "viewer"}
        timezone={ctx.profile.timezone}
        flash={flash}
      />
    </div>
  );
}
