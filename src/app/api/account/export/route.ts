import { NextResponse } from "next/server";
import { route } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/services/audit";

/**
 * GET /api/account/export — the signed-in user's data as a JSON download.
 * Uses the RLS-bound client, so only rows the user may read are included.
 * OAuth tokens and payment authorizations are never readable here.
 */
export const GET = route(async () => {
  const ctx = await requireApiUser();
  await rateLimit("write", `export:${ctx.userId}`);
  const supabase = await createClient();

  const { data: memberships } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", ctx.userId);
  const orgIds = (memberships ?? []).map((m) => m.organization_id);
  const inOrgs = <T,>(p: PromiseLike<{ data: T | null }>) => p.then((r) => r.data ?? []);

  const orgScoped = [
    "generated_content",
    "content_ideas",
    "social_posts",
    "media_assets",
    "scheduled_posts",
    "growth_plans",
    "growth_plan_tasks",
    "saved_hashtags",
    "competitors",
    "competitor_snapshots",
    "social_account_metrics",
  ] as const;

  const [profile, preferences, organizations, socialAccounts, subscription, payments, notifications, aiUsage, activity, ...scoped] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name, avatar_url, timezone, created_at").eq("id", ctx.userId).maybeSingle().then((r) => r.data),
    supabase.from("user_preferences").select("theme, notification_settings").eq("user_id", ctx.userId).maybeSingle().then((r) => r.data),
    orgIds.length ? inOrgs(supabase.from("organizations").select("*").in("id", orgIds)) : [],
    // Account metadata only — tokens live in a table users can't read.
    orgIds.length
      ? inOrgs(supabase.from("social_accounts").select("id, organization_id, platform, username, display_name, status, created_at").in("organization_id", orgIds))
      : [],
    supabase.from("subscriptions").select("plan_id, status, billing_interval, current_period_start, current_period_end, created_at").eq("user_id", ctx.userId).maybeSingle().then((r) => r.data),
    inOrgs(supabase.from("payments").select("reference, plan_id, billing_interval, amount, currency, status, paid_at, created_at").eq("user_id", ctx.userId)),
    inOrgs(supabase.from("notifications").select("type, title, body, read_at, created_at").eq("user_id", ctx.userId)),
    inOrgs(supabase.from("ai_usage").select("service, credits, created_at").eq("user_id", ctx.userId)),
    inOrgs(supabase.from("activity_logs").select("action, entity_type, entity_id, created_at").eq("user_id", ctx.userId)),
    ...orgScoped.map((t) => (orgIds.length ? inOrgs(supabase.from(t).select("*").in("organization_id", orgIds).limit(10000)) : Promise.resolve([]))),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    profile,
    preferences,
    memberships,
    organizations,
    socialAccounts,
    subscription,
    payments,
    notifications,
    aiUsage,
    activity,
    ...Object.fromEntries(orgScoped.map((t, i) => [t, scoped[i]])),
  };

  await audit({ userId: ctx.userId, action: "account.data_exported" });
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="socialboost-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
