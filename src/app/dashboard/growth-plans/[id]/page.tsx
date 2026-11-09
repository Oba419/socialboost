import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { PlanDetail } from "@/features/growth-plans/plan-detail";
import { getPlanWithTasks } from "@/features/growth-plans/server";
import { loadDashboardPage } from "@/lib/auth/page";
import { hasFeature } from "@/lib/entitlements";
import { isOpenAIConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Growth Plan" };

export default async function GrowthPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ctx, ent, locked } = await loadDashboardPage("growth_plan_7d");
  if (locked) return <UpgradePrompt feature="growth_plan_7d" currentPlan={ent.plan.name} />;
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) notFound();
  const data = await getPlanWithTasks(await createClient(), ctx.organization.id, parsed.data);
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/growth-plans">
          <ArrowLeft className="size-4" /> All plans
        </Link>
      </Button>
      <PlanDetail
        key={data.plan.updated_at}
        plan={data.plan}
        initialTasks={data.tasks}
        aiReady={isOpenAIConfigured()}
        can30={hasFeature(ent.plan, "growth_plan_30d")}
        canEdit={ctx.role !== "viewer"}
      />
    </div>
  );
}
