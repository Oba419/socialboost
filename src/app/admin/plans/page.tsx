import { AdminTitle } from "@/features/admin/ui";
import { PlanEditor } from "@/features/admin/plan-editor";
import { DEFAULT_PLANS, type PlanLimits } from "@/config/plans";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Admin · Plans" };

export default async function AdminPlansPage() {
  await requireAdmin();
  const { data: plans } = await createAdminClient().from("subscription_plans").select("*").order("sort_order");
  return (
    <div className="space-y-4">
      <AdminTitle
        title="Plans & pricing"
        description="Changes apply immediately to new checkouts and entitlements. Existing paid periods keep the price they were charged."
      />
      <div className="space-y-4">
        {(plans ?? []).map((p) => {
          const fallback = DEFAULT_PLANS.find((d) => d.id === p.id)?.limits ?? DEFAULT_PLANS[0].limits;
          return (
            <PlanEditor
              key={p.id}
              plan={{
                id: p.id,
                name: p.name,
                description: p.description,
                priceMonthlyNaira: p.price_monthly / 100,
                priceAnnualNaira: p.price_annual / 100,
                features: p.features,
                limits: { ...fallback, ...((p.limits ?? {}) as Partial<PlanLimits>) },
                isActive: p.is_active,
                highlighted: p.highlighted,
                startingFrom: p.price_is_starting_from,
                bullets: p.marketing_bullets,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
