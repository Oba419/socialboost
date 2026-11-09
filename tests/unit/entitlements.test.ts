import { describe, expect, it } from "vitest";
import {
  addInterval,
  cheapestPlanWithFeature,
  classifyPlanChange,
  effectivePlanId,
  hasFeature,
  isWithinLimit,
  planFromRow,
  usagePeriodEnd,
  usagePeriodStart,
  PAST_DUE_GRACE_DAYS,
} from "@/lib/entitlements/core";
import { DEFAULT_PLANS } from "@/config/plans";

const NOW = new Date("2026-11-15T12:00:00Z");
const day = 86_400_000;
const sub = (over: Partial<Parameters<typeof effectivePlanId>[0] & object> = {}) => ({
  plan_id: "creator_pro",
  status: "active" as const,
  current_period_start: "2026-11-01T00:00:00Z",
  current_period_end: "2026-12-01T00:00:00Z",
  ...over,
});

describe("effectivePlanId", () => {
  it("returns free with no subscription", () => {
    expect(effectivePlanId(null, NOW)).toBe("free");
  });
  it("returns the paid plan while active and inside the period", () => {
    expect(effectivePlanId(sub(), NOW)).toBe("creator_pro");
  });
  it("falls back to free once an active period has ended", () => {
    expect(effectivePlanId(sub({ current_period_end: "2026-11-10T00:00:00Z" }), NOW)).toBe("free");
  });
  it("keeps non_renewing plans until period end", () => {
    expect(effectivePlanId(sub({ status: "non_renewing" }), NOW)).toBe("creator_pro");
  });
  it("gives past_due subscriptions a grace period", () => {
    const end = new Date(NOW.getTime() - (PAST_DUE_GRACE_DAYS - 1) * day).toISOString();
    expect(effectivePlanId(sub({ status: "past_due", current_period_end: end }), NOW)).toBe("creator_pro");
    const lapsed = new Date(NOW.getTime() - (PAST_DUE_GRACE_DAYS + 1) * day).toISOString();
    expect(effectivePlanId(sub({ status: "past_due", current_period_end: lapsed }), NOW)).toBe("free");
  });
  it("treats cancelled and expired as free", () => {
    expect(effectivePlanId(sub({ status: "cancelled" }), NOW)).toBe("free");
    expect(effectivePlanId(sub({ status: "expired" }), NOW)).toBe("free");
  });
});

describe("usage period", () => {
  it("uses the billing period for paid plans", () => {
    expect(usagePeriodStart(sub(), NOW).toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(usagePeriodEnd(sub(), NOW).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
  it("uses the calendar month (UTC) for free plans", () => {
    expect(usagePeriodStart(null, NOW).toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(usagePeriodEnd(null, NOW).toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });
});

describe("limits and features", () => {
  it("treats null as unlimited", () => {
    expect(isWithinLimit(null, 1_000_000)).toBe(true);
  });
  it("enforces numeric limits including increments", () => {
    expect(isWithinLimit(5, 4)).toBe(true);
    expect(isWithinLimit(5, 5)).toBe(false);
    expect(isWithinLimit(5, 3, 3)).toBe(false);
    expect(isWithinLimit(0, 0)).toBe(false);
  });
  it("gates features per plan", () => {
    const free = planFromRow({ id: "free", name: "Free", features: DEFAULT_PLANS[0].features, limits: {} });
    expect(hasFeature(free, "caption_generator")).toBe(true);
    expect(hasFeature(free, "content_calendar")).toBe(false);
  });
  it("drops unknown feature keys and merges limits with defaults", () => {
    const plan = planFromRow({ id: "starter", name: "Starter", features: ["content_ideas", "bogus"], limits: { socialAccounts: 9 } });
    expect(plan.features).toEqual(["content_ideas"]);
    expect(plan.limits.socialAccounts).toBe(9);
    expect(plan.limits.aiCreditsPerPeriod).toBe(200);
  });
  it("finds the cheapest plan that unlocks a feature", () => {
    expect(cheapestPlanWithFeature("content_calendar")).toBe("Starter");
    expect(cheapestPlanWithFeature("analytics")).toBe("Creator Pro");
    expect(cheapestPlanWithFeature("client_workspaces")).toBe("Agency");
  });
  it("plans are cumulative: each tier includes every lower tier feature", () => {
    for (let i = 1; i < DEFAULT_PLANS.length; i++) {
      for (const f of DEFAULT_PLANS[i - 1].features) expect(DEFAULT_PLANS[i].features).toContain(f);
    }
  });
});

describe("plan changes and intervals", () => {
  const order = Object.fromEntries(DEFAULT_PLANS.map((p) => [p.id, p.sortOrder]));
  it("classifies upgrades and downgrades", () => {
    expect(classifyPlanChange("starter", "business", order)).toBe("upgrade");
    expect(classifyPlanChange("business", "starter", order)).toBe("downgrade");
    expect(classifyPlanChange("starter", "starter", order)).toBe("same");
  });
  it("adds calendar months and clamps month ends", () => {
    expect(addInterval(new Date("2026-01-31T10:00:00Z"), "monthly").toISOString()).toBe("2026-02-28T10:00:00.000Z");
    expect(addInterval(new Date("2028-01-31T10:00:00Z"), "monthly").toISOString()).toBe("2028-02-29T10:00:00.000Z");
    expect(addInterval(new Date("2026-12-15T00:00:00Z"), "monthly").toISOString()).toBe("2027-01-15T00:00:00.000Z");
    expect(addInterval(new Date("2028-02-29T00:00:00Z"), "annual").toISOString()).toBe("2029-02-28T00:00:00.000Z");
  });
});
