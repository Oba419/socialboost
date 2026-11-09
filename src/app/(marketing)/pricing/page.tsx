import { Check, Minus } from "lucide-react";
import { FAQ } from "@/components/marketing/faq";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Section } from "@/components/marketing/section";
import { FinalCTASection } from "@/components/marketing/home-sections";
import { DEFAULT_PLANS, FEATURE_KEYS, FEATURE_LABELS, type PlanLimits } from "@/config/plans";

export const metadata = {
  title: "Pricing",
  description: "Free, Starter, Creator Pro, Business and Agency plans. Monthly or annual billing in Nigerian naira.",
};

const LIMIT_ROWS: { key: keyof PlanLimits; label: string; format?: (v: number | null) => string }[] = [
  { key: "aiCreditsPerPeriod", label: "AI credits / month" },
  { key: "savedItems", label: "Saved items" },
  { key: "socialAccounts", label: "Social accounts" },
  { key: "scheduledPostsPerMonth", label: "Scheduled posts / month", format: (v) => (v === 0 ? "—" : v === null ? "Unlimited" : v.toLocaleString()) },
  { key: "workspaces", label: "Workspaces / brands" },
  { key: "teamMembers", label: "Team members" },
  { key: "mediaStorageMb", label: "Media storage", format: (v) => (v === null ? "Unlimited" : v >= 1000 ? `${v / 1000} GB` : `${v} MB`) },
];

export default function PricingPage() {
  const plans = [...DEFAULT_PLANS].sort((a, b) => a.sortOrder - b.sortOrder);
  return (
    <>
      <div>
        <Section
          eyebrow="Pricing"
          as="h1"
          title="Plans for every stage of growth"
          description="Start free and upgrade when you need more. All prices are in Nigerian naira (NGN)."
          className="pb-12"
        >
          <PricingTable />
        </Section>
      </div>

      <Section id="compare" title="Compare plans" description="Everything included in each plan.">
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Plan feature comparison</caption>
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">Feature</th>
                {plans.map((p) => (
                  <th key={p.id} scope="col" className="px-4 py-3 text-center font-medium">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {LIMIT_ROWS.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="px-4 py-3 text-left font-normal">{row.label}</th>
                  {plans.map((p) => {
                    const v = p.limits[row.key];
                    return (
                      <td key={p.id} className="px-4 py-3 text-center tabular-nums">
                        {row.format ? row.format(v) : v === null ? "Unlimited" : v.toLocaleString()}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {FEATURE_KEYS.map((f) => (
                <tr key={f}>
                  <th scope="row" className="px-4 py-3 text-left font-normal">{FEATURE_LABELS[f]}</th>
                  {plans.map((p) => (
                    <td key={p.id} className="px-4 py-3 text-center">
                      {p.features.includes(f) ? (
                        <Check className="text-primary mx-auto size-4" aria-label="Included" />
                      ) : (
                        <Minus className="text-muted-foreground/50 mx-auto size-4" aria-label="Not included" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground mt-4 text-xs">
          Analytics, account connections and direct publishing depend on each platform&apos;s official API, permissions
          and approval status.
        </p>
      </Section>

      <Section id="faq" title="Billing questions" className="bg-muted/30">
        <FAQ />
      </Section>
      <FinalCTASection />
    </>
  );
}
