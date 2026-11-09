"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_PLANS, formatMoney, type PlanDefinition } from "@/config/plans";
import { cn } from "@/lib/utils";

type Interval = "monthly" | "annual";

function priceLabel(plan: PlanDefinition, interval: Interval) {
  if (plan.priceMonthly === 0) return { main: formatMoney(0, plan.currency), sub: "forever" };
  if (interval === "monthly") return { main: formatMoney(plan.priceMonthly, plan.currency), sub: "/ month" };
  return {
    main: formatMoney(Math.round(plan.priceAnnual / 12), plan.currency),
    sub: `/ month, billed ${formatMoney(plan.priceAnnual, plan.currency)} yearly`,
  };
}

export function PricingTable({ compact = false }: { compact?: boolean }) {
  const [interval, setInterval] = useState<Interval>("monthly");
  const plans = [...DEFAULT_PLANS].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <div className="mb-10 flex justify-center">
        <div role="radiogroup" aria-label="Billing interval" className="bg-muted inline-flex rounded-full p-1">
          {(["monthly", "annual"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={interval === v}
              onClick={() => setInterval(v)}
              className={cn(
                "focus-visible:ring-ring rounded-full px-4 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2",
                interval === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "monthly" ? "Monthly" : "Annual"}
              {v === "annual" && <span className="text-success ml-1.5 text-xs font-medium">2 months free</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {plans.map((plan) => {
          const price = priceLabel(plan, interval);
          return (
            <div
              key={plan.id}
              className={cn(
                "bg-card relative flex flex-col rounded-2xl border p-6",
                plan.highlighted && "border-primary shadow-primary/15 shadow-xl ring-1 ring-primary/40",
              )}
            >
              {plan.highlighted && (
                <Badge className="bg-brand-gradient absolute -top-3 left-6 border-0 text-white">Most popular</Badge>
              )}
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="text-muted-foreground mt-1 min-h-10 text-sm">{plan.description}</p>
              <div className="mt-5">
                {plan.priceIsStartingFrom && <span className="text-muted-foreground mr-1 text-sm">from</span>}
                <span className="text-3xl font-semibold tracking-tight tabular-nums">{price.main}</span>
                <p className="text-muted-foreground mt-1 text-xs">{price.sub}</p>
              </div>
              <Button asChild className="mt-6" variant={plan.highlighted ? "default" : "outline"}>
                <Link href={plan.id === "free" ? "/signup" : `/signup?plan=${plan.id}`}>
                  {plan.id === "free" ? "Start free" : plan.id === "agency" ? "Get started" : `Choose ${plan.name}`}
                </Link>
              </Button>
              {!compact && (
                <ul className="mt-6 space-y-2.5 text-sm">
                  {plan.marketingBullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                  <li className="flex gap-2">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      {plan.limits.socialAccounts} social account{plan.limits.socialAccounts === 1 ? "" : "s"}
                    </span>
                  </li>
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-muted-foreground mt-8 text-center text-xs">
        Prices in Nigerian naira (NGN). Payments are processed securely by Paystack. Cancel anytime; downgrades take
        effect at the end of your billing period.
      </p>
    </div>
  );
}
