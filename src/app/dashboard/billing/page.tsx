import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SetupRequired } from "@/components/shared/setup-required";
import { loadDashboardPage } from "@/lib/auth/page";
import { getEntitlements } from "@/lib/entitlements";
import { effectivePlanId } from "@/lib/entitlements/core";
import { isPaystackConfigured, isServiceRoleConfigured } from "@/lib/env";
import { decryptSecret } from "@/lib/security/crypto";
import { createClient } from "@/lib/supabase/server";
import { countSavedItems } from "@/services/content";
import { BillingOverview } from "@/features/subscriptions/billing-overview";
import { PaymentHistory } from "@/features/subscriptions/payment-history";
import type { PlanCardData, SubscriptionView } from "@/features/subscriptions/types";

export const metadata = { title: "Subscription & Billing" };

function cardSummary(enc: string | null): string | null {
  if (!enc) return null;
  try {
    const a = JSON.parse(decryptSecret(enc)) as { brand?: string | null; last4?: string | null; exp?: string | null };
    if (!a.last4) return null;
    return `${(a.brand ?? "Card").trim()} •••• ${a.last4}${a.exp ? ` · exp ${a.exp}` : ""}`;
  } catch {
    return null;
  }
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ status?: string; plan?: string }> }) {
  const { ctx } = await loadDashboardPage();
  const sp = await searchParams;
  const supabase = await createClient();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();

  const [own, workspaceEnt, { data: sub }, { data: plans }, savedItems, accounts, scheduled] = await Promise.all([
    getEntitlements(ctx.userId),
    getEntitlements(ctx.billingUserId),
    supabase.from("subscriptions").select("*").eq("user_id", ctx.userId).maybeSingle(),
    supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
    countSavedItems(supabase, ctx.organization.id),
    supabase.from("social_accounts").select("id", { count: "exact", head: true }).eq("organization_id", ctx.organization.id),
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organization.id)
      .gte("created_at", monthStart)
      .neq("status", "cancelled"),
  ]);

  const planList: PlanCardData[] = (plans ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    priceMonthly: p.price_monthly,
    priceAnnual: p.price_annual,
    currency: p.currency,
    startingFrom: p.price_is_starting_from,
    highlighted: p.highlighted,
    bullets: p.marketing_bullets,
    sortOrder: p.sort_order,
  }));

  const subscription: SubscriptionView = {
    planId: sub?.plan_id ?? "free",
    effectivePlanId: effectivePlanId(sub ?? null),
    effectivePlanName: own.plan.name,
    status: sub?.status ?? "active",
    interval: sub?.billing_interval ?? "monthly",
    periodEnd: sub?.current_period_end ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    pendingPlanId: sub?.pending_plan_id ?? null,
    pendingInterval: sub?.pending_billing_interval ?? null,
    card: cardSummary(sub?.provider_authorization_enc ?? null),
  };

  const limits = workspaceEnt.plan.limits;
  const usage = {
    planName: workspaceEnt.plan.name,
    creditsUsed: workspaceEnt.aiCreditsUsed,
    creditsLimit: limits.aiCreditsPerPeriod,
    periodEnd: workspaceEnt.periodEnd.toISOString(),
    savedItems: { used: savedItems, limit: limits.savedItems },
    socialAccounts: { used: accounts.count ?? 0, limit: limits.socialAccounts },
    scheduledPosts: { used: scheduled.count ?? 0, limit: limits.scheduledPostsPerMonth },
  };

  const paystackReady = isPaystackConfigured() && isServiceRoleConfigured();

  return (
    <div className="space-y-6">
      <PageHeader icon={CreditCard} title="Subscription & Billing" description="Manage your plan, see your usage and review payments." />
      {!paystackReady && (
        <SetupRequired
          integration="Payments (Paystack)"
          envVars={["PAYSTACK_SECRET_KEY", "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", "SUPABASE_SERVICE_ROLE_KEY"]}
        >
          <p className="mt-1">Plans are shown below, but checkout is disabled until payments are configured.</p>
        </SetupRequired>
      )}
      {ctx.billingUserId !== ctx.userId && (
        <p className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm">
          You&apos;re working in <strong className="text-foreground">{ctx.organization.name}</strong>, which uses its owner&apos;s{" "}
          <strong className="text-foreground">{workspaceEnt.plan.name}</strong> plan. The subscription below is your own and applies to
          workspaces you own.
        </p>
      )}
      <BillingOverview
        subscription={subscription}
        plans={planList}
        usage={usage}
        checkoutEnabled={paystackReady}
        status={sp.status}
        preselectPlan={sp.plan}
      />
      <PaymentHistory planNames={Object.fromEntries(planList.map((p) => [p.id, p.name]))} />
    </div>
  );
}
