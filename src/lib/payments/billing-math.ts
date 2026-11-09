/**
 * Pure billing helpers (no I/O) — unit tested in src/services/billing.test.ts.
 */
import { addInterval, PAST_DUE_GRACE_DAYS } from "@/lib/entitlements/core";
import type { BillingInterval, SubscriptionRow, SubscriptionStatus } from "@/types/database";

const DAY_MS = 86_400_000;
export const MAX_RENEWAL_ATTEMPTS = 4;

export interface PlanPrice {
  price_monthly: number;
  price_annual: number;
  currency: string;
}

export function priceFor(plan: PlanPrice, interval: BillingInterval): number {
  return interval === "annual" ? plan.price_annual : plan.price_monthly;
}

/** The verified transaction must match exactly what we asked to charge. */
export function amountMatches(
  expected: { amount: number; currency: string },
  actual: { amount: number; currency: string },
): boolean {
  return (
    Number.isInteger(actual.amount) &&
    actual.amount === expected.amount &&
    actual.currency.toUpperCase() === expected.currency.toUpperCase()
  );
}

/**
 * New billing period after a successful payment.
 *  - "subscription" (new / upgrade / reactivation): starts now.
 *  - "renewal": continues seamlessly from the previous period end, unless the
 *    subscription lapsed beyond the grace window, in which case it starts now.
 */
export function computeNewPeriod(
  purpose: "subscription" | "renewal",
  interval: BillingInterval,
  previousPeriodEnd: string | null,
  now: Date = new Date(),
): { start: Date; end: Date } {
  let start = now;
  if (purpose === "renewal" && previousPeriodEnd) {
    const prevEnd = new Date(previousPeriodEnd);
    if (prevEnd.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS >= now.getTime()) start = prevEnd;
  }
  return { start, end: addInterval(start, interval) };
}

export type PlanChangeKind = "new" | "upgrade" | "downgrade" | "same";

/**
 * Classify a requested change. Plan order decides upgrade vs downgrade;
 * for the same plan, monthly → annual is an upgrade (charged now) and
 * annual → monthly a downgrade (applied at period end).
 */
export function classifyChange(
  current: { planId: string; interval: BillingInterval; isPaidAndActive: boolean },
  target: { planId: string; interval: BillingInterval },
  planOrder: Record<string, number>,
): PlanChangeKind {
  if (!current.isPaidAndActive) return target.planId === "free" ? "same" : "new";
  const a = planOrder[current.planId] ?? 0;
  const b = planOrder[target.planId] ?? 0;
  if (b > a) return "upgrade";
  if (b < a) return "downgrade";
  if (current.interval === target.interval) return "same";
  return target.interval === "annual" ? "upgrade" : "downgrade";
}

export type RenewalAction = "none" | "expire" | "downgrade_to_free" | "charge";

type SubForRenewal = Pick<
  SubscriptionRow,
  "plan_id" | "status" | "current_period_end" | "cancel_at_period_end" | "pending_plan_id" | "renewal_attempts"
>;

/** What the renewal job should do with a subscription right now. */
export function renewalAction(sub: SubForRenewal, now: Date = new Date()): RenewalAction {
  if (sub.plan_id === "free" || !sub.current_period_end) return "none";
  const end = new Date(sub.current_period_end).getTime();
  if (end > now.getTime()) return "none";

  const status: SubscriptionStatus = sub.status;
  if (status === "cancelled" || status === "expired") return "none";
  if (status === "non_renewing" || sub.cancel_at_period_end) return "expire";
  if (sub.pending_plan_id === "free") return "downgrade_to_free";
  if (status === "past_due") {
    if (end + PAST_DUE_GRACE_DAYS * DAY_MS <= now.getTime()) return "expire";
    if (sub.renewal_attempts >= MAX_RENEWAL_ATTEMPTS) return "expire";
    return "charge";
  }
  return "charge";
}

/** Reference format for our payments: `sb_<uuid>` (no PII). */
export function newPaymentReference(uuid: string): string {
  return `sb_${uuid.replace(/-/g, "")}`;
}
