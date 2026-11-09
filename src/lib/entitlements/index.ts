import "server-only";
import { cache } from "react";
import { DEFAULT_PLANS, FEATURE_LABELS, type FeatureKey, type PlanLimits } from "@/config/plans";
import { AppError } from "@/lib/errors";
import { isServiceRoleConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AuthContext } from "@/lib/auth/session";
import type { SubscriptionRow } from "@/types/database";
import {
  cheapestPlanWithFeature,
  effectivePlanId,
  hasFeature,
  isWithinLimit,
  planFromRow,
  usagePeriodEnd,
  usagePeriodStart,
  type ResolvedPlan,
} from "./core";

export * from "./core";

export interface Entitlements {
  plan: ResolvedPlan;
  subscription: SubscriptionRow | null;
  periodStart: Date;
  periodEnd: Date;
  aiCreditsUsed: number;
  aiCreditsRemaining: number;
}

async function db() {
  // The billing owner may be a different user (team workspaces), whose
  // subscription is not visible through RLS, hence the service role.
  return isServiceRoleConfigured() ? createAdminClient() : await createClient();
}

/** Loads the effective plan + usage for a billing user. Memoised per request. */
export const getEntitlements = cache(async (billingUserId: string): Promise<Entitlements> => {
  const client = await db();

  const { data: subscription } = await client
    .from("subscriptions")
    .select("*")
    .eq("user_id", billingUserId)
    .maybeSingle();

  const planId = effectivePlanId(subscription ?? null);
  const { data: planRow } = await client
    .from("subscription_plans")
    .select("id, name, features, limits")
    .eq("id", planId)
    .maybeSingle();

  const fallback = DEFAULT_PLANS.find((p) => p.id === planId) ?? DEFAULT_PLANS[0];
  const plan = planRow
    ? planFromRow(planRow)
    : { id: fallback.id, name: fallback.name, features: fallback.features, limits: fallback.limits };

  const periodStart = usagePeriodStart(subscription ?? null);
  const periodEnd = usagePeriodEnd(subscription ?? null);

  const { data: usageRows } = await client
    .from("ai_usage")
    .select("credits")
    .eq("billing_user_id", billingUserId)
    .gte("created_at", periodStart.toISOString());

  const aiCreditsUsed = (usageRows ?? []).reduce((sum, r) => sum + r.credits, 0);

  return {
    plan,
    subscription: subscription ?? null,
    periodStart,
    periodEnd,
    aiCreditsUsed,
    aiCreditsRemaining: Math.max(0, plan.limits.aiCreditsPerPeriod - aiCreditsUsed),
  };
});

export async function getContextEntitlements(ctx: AuthContext) {
  return getEntitlements(ctx.billingUserId);
}

/** Throws PLAN_REQUIRED if the workspace's plan lacks the feature. */
export async function assertFeature(ctx: AuthContext, feature: FeatureKey): Promise<Entitlements> {
  const ent = await getEntitlements(ctx.billingUserId);
  if (!hasFeature(ent.plan, feature)) {
    const upgradeTo = cheapestPlanWithFeature(feature);
    throw new AppError(
      "PLAN_REQUIRED",
      `${FEATURE_LABELS[feature]} is not included in the ${ent.plan.name} plan${upgradeTo ? `. Upgrade to ${upgradeTo} to unlock it.` : "."}`,
      { feature, upgradeTo },
    );
  }
  return ent;
}

type CountableLimit = Exclude<keyof PlanLimits, "aiCreditsPerPeriod" | "mediaStorageMb">;

/** Throws QUOTA_EXCEEDED if adding `increment` items would exceed the plan limit. */
export async function assertLimit(
  ctx: AuthContext,
  limit: CountableLimit,
  currentCount: number,
  increment = 1,
) {
  const ent = await getEntitlements(ctx.billingUserId);
  const max = ent.plan.limits[limit];
  if (!isWithinLimit(max, currentCount, increment)) {
    throw new AppError(
      "QUOTA_EXCEEDED",
      `Your ${ent.plan.name} plan allows ${max} ${limitLabel(limit)}. Upgrade your plan to add more.`,
      { limit, max, current: currentCount },
    );
  }
}

function limitLabel(limit: CountableLimit): string {
  switch (limit) {
    case "savedItems":
      return "saved items";
    case "socialAccounts":
      return "connected social accounts";
    case "scheduledPostsPerMonth":
      return "scheduled posts per month";
    case "workspaces":
      return "workspaces";
    case "teamMembers":
      return "team members";
  }
}
