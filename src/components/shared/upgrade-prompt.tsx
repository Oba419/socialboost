import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURE_LABELS, type FeatureKey } from "@/config/plans";
import { cheapestPlanWithFeature } from "@/lib/entitlements/core";

export function UpgradePrompt({ feature, currentPlan }: { feature: FeatureKey; currentPlan: string }) {
  const target = cheapestPlanWithFeature(feature);
  return (
    <div className="bg-card relative overflow-hidden rounded-2xl border p-8 text-center">
      <div className="bg-hero-glow pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-md space-y-3">
        <span className="bg-primary/10 text-primary mx-auto inline-flex size-12 items-center justify-center rounded-full">
          <Lock className="size-5" />
        </span>
        <h2 className="text-lg font-semibold">{FEATURE_LABELS[feature]} isn&apos;t in your {currentPlan} plan</h2>
        <p className="text-muted-foreground text-sm">
          {target ? `Upgrade to ${target} or above to unlock it.` : "Upgrade your plan to unlock it."}
        </p>
        <Button asChild>
          <Link href="/dashboard/billing">View plans</Link>
        </Button>
      </div>
    </div>
  );
}
