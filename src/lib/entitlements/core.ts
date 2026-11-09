/**
 * Pure entitlement logic (no I/O) so it can be unit tested exhaustively.
 */
import { DEFAULT_PLANS, FEATURE_KEYS, type FeatureKey, type PlanLimits } from "@/config/plans";
import type { SubscriptionRow, SubscriptionPlanRow } from "@/types/database";

/** Days a past_due subscription keeps paid features while renewal is retried. */
export const PAST_DUE_GRACE_DAYS = 3;

export interface ResolvedPlan {
  id: string;
  name: string;
  features: FeatureKey[];
  limits: PlanLimits;
}

const DAY_MS = 86_400_000;

export function planFromRow(row: Pick<SubscriptionPlanRow, "id" | "name" | "features" | "limits">): ResolvedPlan {
  const fallback = DEFAULT_PLANS.find((p) => p.id === row.id) ?? DEFAULT_PLANS[0];
  const rawLimits = (row.limits ?? {}) as Partial<PlanLimits>;
  return {
    id: row.id,
    name: row.name,
    features: row.features.filter((f): f is FeatureKey => (FEATURE_KEYS as readonly string[]).includes(f)),
    limits: { ...fallback.limits, ...rawLimits },
  };
}

type SubLike = Pick<SubscriptionRow, "plan_id" | "status" | "current_period_start" | "current_period_end">;

/** Which plan's entitlements apply right now. Anything lapsed falls back to free. */
export function effectivePlanId(sub: SubLike | null, now: Date = new Date()): string {
  if (!sub || sub.plan_id === "free") return "free";
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const t = now.getTime();

  switch (sub.status) {
    case "active":
    case "non_renewing":
      return end === null || end > t ? sub.plan_id : "free";
    case "past_due":
      return end !== null && end + PAST_DUE_GRACE_DAYS * DAY_MS > t ? sub.plan_id : "free";
    default:
      return "free";
  }
}

/** Start of the window AI credits are counted in. */
export function usagePeriodStart(sub: SubLike | null, now: Date = new Date()): Date {
  const planId = effectivePlanId(sub, now);
  if (planId !== "free" && sub) {
    return new Date(sub.current_period_start);
  }
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function usagePeriodEnd(sub: SubLike | null, now: Date = new Date()): Date {
  const planId = effectivePlanId(sub, now);
  if (planId !== "free" && sub?.current_period_end) return new Date(sub.current_period_end);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function hasFeature(plan: ResolvedPlan, feature: FeatureKey): boolean {
  return plan.features.includes(feature);
}

/** null limit = unlimited. */
export function isWithinLimit(limit: number | null, currentCount: number, increment = 1): boolean {
  if (limit === null) return true;
  return currentCount + increment <= limit;
}

/** Cheapest plan that unlocks a feature — used for upgrade prompts. */
export function cheapestPlanWithFeature(feature: FeatureKey): string | null {
  const plan = [...DEFAULT_PLANS].sort((a, b) => a.sortOrder - b.sortOrder).find((p) => p.features.includes(feature));
  return plan?.name ?? null;
}

/**
 * Upgrade = takes effect immediately (charged now). Downgrade = scheduled for
 * period end so the user keeps what they paid for.
 */
export function classifyPlanChange(
  currentPlanId: string,
  targetPlanId: string,
  planOrder: Record<string, number>,
): "upgrade" | "downgrade" | "same" {
  const a = planOrder[currentPlanId] ?? 0;
  const b = planOrder[targetPlanId] ?? 0;
  if (a === b) return "same";
  return b > a ? "upgrade" : "downgrade";
}

/** Adds one billing interval to a date (calendar-aware, clamps month ends). */
export function addInterval(start: Date, interval: "monthly" | "annual"): Date {
  const d = new Date(start.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  if (interval === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}
