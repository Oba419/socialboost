import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_PLANS, formatMoney } from "@/config/plans";

/** Guards against the DB seed drifting from the plan config. */
const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261109000002_seed_plans.sql"), "utf8");

describe("plan seed migration", () => {
  for (const plan of DEFAULT_PLANS) {
    it(`matches config for ${plan.id}`, () => {
      const start = sql.indexOf(`('${plan.id}',`);
      expect(start).toBeGreaterThan(-1);
      const row = sql.slice(start, sql.indexOf("\n\n", start) === -1 ? undefined : sql.indexOf("\n\n", start));
      expect(row).toContain(`, ${plan.priceMonthly}, ${plan.priceAnnual}, '${plan.currency}'`);
      const featureList = row.match(/array\[([^\]]*)\]/)?.[1] ?? "";
      const features = featureList.split(",").map((s) => s.trim().replace(/'/g, ""));
      expect(features).toEqual(plan.features);
      const limits = JSON.parse(row.match(/'(\{[^']*\})'/)?.[1] ?? "{}");
      expect(limits).toEqual(plan.limits);
    });
  }

  it("initial NGN prices match the business assumptions", () => {
    const monthly = Object.fromEntries(DEFAULT_PLANS.map((p) => [p.id, p.priceMonthly / 100]));
    expect(monthly).toEqual({ free: 0, starter: 5000, creator_pro: 12000, business: 25000, agency: 50000 });
  });

  it("formats kobo as naira", () => {
    expect(formatMoney(1_200_000)).toMatch(/12,000/);
  });
});
