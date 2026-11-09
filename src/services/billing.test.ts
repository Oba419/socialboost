import { describe, expect, it } from "vitest";
import {
  amountMatches,
  classifyChange,
  computeNewPeriod,
  newPaymentReference,
  priceFor,
  renewalAction,
} from "@/lib/payments/billing-math";

const ORDER = { free: 0, starter: 1, creator_pro: 2, business: 3, agency: 4 };
const NOW = new Date("2026-11-09T12:00:00.000Z");
const DAY = 86_400_000;

describe("amountMatches", () => {
  it("requires exact amount and currency", () => {
    expect(amountMatches({ amount: 500000, currency: "NGN" }, { amount: 500000, currency: "ngn" })).toBe(true);
    expect(amountMatches({ amount: 500000, currency: "NGN" }, { amount: 499999, currency: "NGN" })).toBe(false);
    expect(amountMatches({ amount: 500000, currency: "NGN" }, { amount: 500000, currency: "USD" })).toBe(false);
    expect(amountMatches({ amount: 500000, currency: "NGN" }, { amount: 500000.5, currency: "NGN" })).toBe(false);
  });
});

describe("priceFor", () => {
  it("picks the interval price", () => {
    const plan = { price_monthly: 500000, price_annual: 5000000, currency: "NGN" };
    expect(priceFor(plan, "monthly")).toBe(500000);
    expect(priceFor(plan, "annual")).toBe(5000000);
  });
});

describe("computeNewPeriod", () => {
  it("starts new subscriptions now", () => {
    const p = computeNewPeriod("subscription", "monthly", "2026-12-01T00:00:00.000Z", NOW);
    expect(p.start.toISOString()).toBe(NOW.toISOString());
    expect(p.end.toISOString()).toBe("2026-12-09T12:00:00.000Z");
  });

  it("continues renewals from the previous period end", () => {
    const p = computeNewPeriod("renewal", "monthly", "2026-11-08T00:00:00.000Z", NOW);
    expect(p.start.toISOString()).toBe("2026-11-08T00:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-12-08T00:00:00.000Z");
  });

  it("restarts renewals from now when lapsed beyond the grace window", () => {
    const p = computeNewPeriod("renewal", "annual", "2026-10-01T00:00:00.000Z", NOW);
    expect(p.start.toISOString()).toBe(NOW.toISOString());
    expect(p.end.toISOString()).toBe("2027-11-09T12:00:00.000Z");
  });

  it("clamps month-end dates", () => {
    const p = computeNewPeriod("subscription", "monthly", null, new Date("2026-01-31T00:00:00.000Z"));
    expect(p.end.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
});

describe("classifyChange", () => {
  const paid = (planId: string, interval: "monthly" | "annual" = "monthly") => ({ planId, interval, isPaidAndActive: true });
  it("treats any paid plan as new for free users", () => {
    expect(classifyChange({ planId: "free", interval: "monthly", isPaidAndActive: false }, { planId: "starter", interval: "monthly" }, ORDER)).toBe("new");
  });
  it("detects upgrades and downgrades by plan order", () => {
    expect(classifyChange(paid("starter"), { planId: "business", interval: "monthly" }, ORDER)).toBe("upgrade");
    expect(classifyChange(paid("business"), { planId: "starter", interval: "monthly" }, ORDER)).toBe("downgrade");
    expect(classifyChange(paid("business"), { planId: "free", interval: "monthly" }, ORDER)).toBe("downgrade");
  });
  it("handles interval switches on the same plan", () => {
    expect(classifyChange(paid("starter", "monthly"), { planId: "starter", interval: "annual" }, ORDER)).toBe("upgrade");
    expect(classifyChange(paid("starter", "annual"), { planId: "starter", interval: "monthly" }, ORDER)).toBe("downgrade");
    expect(classifyChange(paid("starter", "monthly"), { planId: "starter", interval: "monthly" }, ORDER)).toBe("same");
  });
});

describe("renewalAction", () => {
  const base = {
    plan_id: "starter",
    status: "active" as const,
    current_period_end: new Date(NOW.getTime() - 1000).toISOString(),
    cancel_at_period_end: false,
    pending_plan_id: null,
    renewal_attempts: 0,
  };
  it("does nothing before the period ends or for free plans", () => {
    expect(renewalAction({ ...base, current_period_end: new Date(NOW.getTime() + DAY).toISOString() }, NOW)).toBe("none");
    expect(renewalAction({ ...base, plan_id: "free" }, NOW)).toBe("none");
  });
  it("charges active subscriptions at period end", () => {
    expect(renewalAction(base, NOW)).toBe("charge");
  });
  it("expires cancelled subscriptions", () => {
    expect(renewalAction({ ...base, status: "non_renewing" }, NOW)).toBe("expire");
    expect(renewalAction({ ...base, cancel_at_period_end: true }, NOW)).toBe("expire");
  });
  it("applies scheduled downgrades to free", () => {
    expect(renewalAction({ ...base, pending_plan_id: "free" }, NOW)).toBe("downgrade_to_free");
  });
  it("retries past_due within grace, then expires", () => {
    expect(renewalAction({ ...base, status: "past_due", renewal_attempts: 1 }, NOW)).toBe("charge");
    expect(
      renewalAction({ ...base, status: "past_due", current_period_end: new Date(NOW.getTime() - 4 * DAY).toISOString() }, NOW),
    ).toBe("expire");
    expect(renewalAction({ ...base, status: "past_due", renewal_attempts: 4 }, NOW)).toBe("expire");
  });
});

describe("newPaymentReference", () => {
  it("formats references without dashes", () => {
    expect(newPaymentReference("123e4567-e89b-12d3-a456-426614174000")).toBe("sb_123e4567e89b12d3a456426614174000");
  });
});
