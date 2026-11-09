import Link from "next/link";
import { format } from "date-fns";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { GeneratePlanDialog } from "@/features/growth-plans/generate-plan-dialog";
import { listPlansWithProgress } from "@/features/growth-plans/server";
import { ToolPage } from "@/features/ai-studio/tool-page";
import { loadDashboardPage } from "@/lib/auth/page";
import { hasFeature } from "@/lib/entitlements";
import { isOpenAIConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Growth Plans" };

export default async function GrowthPlansPage() {
  const { ctx, ent, locked } = await loadDashboardPage("growth_plan_7d");
  const aiReady = isOpenAIConfigured();
  const can30 = hasFeature(ent.plan, "growth_plan_30d");
  const plans = locked ? [] : await listPlansWithProgress(await createClient(), ctx.organization.id);
  const active = plans.filter((p) => p.status !== "archived");
  const archived = plans.filter((p) => p.status === "archived");

  return (
    <ToolPage
      icon={Target}
      title="Growth Plans"
      description="Personalised 7- and 30-day plans with daily tasks, weekly reviews and measurable targets."
      feature="growth_plan_7d"
      locked={locked}
      planName={ent.plan.name}
      aiReady={aiReady}
      actions={!locked && <GeneratePlanDialog aiReady={aiReady} can30={can30} />}
    >
      {plans.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No growth plans yet"
          description="Generate your first plan to get a day-by-day roadmap tailored to your brand."
          action={<GeneratePlanDialog aiReady={aiReady} can30={can30} />}
        />
      ) : (
        <div className="space-y-8">
          <PlanGrid plans={active} />
          {archived.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-muted-foreground text-sm font-medium">Archived</h2>
              <PlanGrid plans={archived} />
            </section>
          )}
        </div>
      )}
    </ToolPage>
  );
}

function PlanGrid({ plans }: { plans: Awaited<ReturnType<typeof listPlansWithProgress>> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {plans.map((p) => {
        const pct = p.totalTasks ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;
        return (
          <Link key={p.id} href={`/dashboard/growth-plans/${p.id}`} className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2">
            <Card className="hover:border-primary/40 h-full transition-colors">
              <CardHeader className="gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{p.duration_days}-day</Badge>
                  {p.status !== "active" && <Badge variant="outline" className="capitalize">{p.status}</Badge>}
                  {p.is_hypothesis && <Badge variant="outline" className="border-warning/50 text-warning">Initial hypothesis</Badge>}
                </div>
                <CardTitle className="text-base leading-snug">{p.title}</CardTitle>
                <CardDescription className="line-clamp-2">{p.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Started {format(new Date(p.start_date), "d MMM yyyy")}</span>
                  <span className="tabular-nums">
                    {p.completedTasks}/{p.totalTasks} tasks
                  </span>
                </div>
                <Progress value={pct} aria-label={`${pct}% complete`} />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
