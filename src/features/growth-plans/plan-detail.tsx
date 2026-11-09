"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, format } from "date-fns";
import { Archive, ArchiveRestore, CalendarClock, ClipboardCheck, FlaskConical, RefreshCw, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { apiFetch, toastError } from "@/hooks/use-api";
import type { GrowthPlanRow, GrowthPlanTaskRow } from "@/types/database";
import { cn } from "@/lib/utils";
import { GeneratePlanDialog } from "./generate-plan-dialog";
import type { GrowthPlanContent } from "./types";

const CATEGORY_STYLE: Record<string, string> = {
  content: "bg-chart-1/15 text-chart-1",
  engagement: "bg-chart-2/15 text-chart-2",
  community: "bg-chart-3/15 text-chart-3",
  optimization: "bg-chart-4/15 text-chart-4",
  analysis: "bg-chart-5/15 text-chart-5",
  collaboration: "bg-muted text-foreground",
};

export function PlanDetail({
  plan,
  initialTasks,
  aiReady,
  can30,
  canEdit,
}: {
  plan: GrowthPlanRow;
  initialTasks: GrowthPlanTaskRow[];
  aiReady: boolean;
  can30: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const content = plan.plan as unknown as GrowthPlanContent;
  const done = tasks.filter((t) => t.is_completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const start = new Date(`${plan.start_date}T00:00:00`);

  const byDay = useMemo(() => {
    const map = new Map<number, GrowthPlanTaskRow[]>();
    for (const t of tasks) map.set(t.day_number, [...(map.get(t.day_number) ?? []), t]);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [tasks]);
  const themes = new Map(content.days?.map((d) => [d.day, d.theme]) ?? []);

  async function toggle(task: GrowthPlanTaskRow, checked: boolean) {
    // Optimistic update with rollback.
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, is_completed: checked } : t)));
    const res = await apiFetch(`/api/growth-plans/${plan.id}/tasks/${task.id}`, { method: "PATCH", json: { isCompleted: checked } });
    if (!res.ok) {
      setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, is_completed: !checked } : t)));
      toastError(res.error);
    }
  }

  async function setStatus(status: "active" | "archived" | "completed") {
    const res = await apiFetch(`/api/growth-plans/${plan.id}`, { method: "PATCH", json: { status } });
    if (!res.ok) return toastError(res.error);
    toast.success(status === "archived" ? "Plan archived" : status === "completed" ? "Plan marked complete" : "Plan restored");
    router.refresh();
  }

  async function remove() {
    const res = await apiFetch(`/api/growth-plans/${plan.id}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    toast.success("Plan deleted");
    router.push("/dashboard/growth-plans");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{plan.duration_days}-day plan</Badge>
            <Badge variant="outline" className="capitalize">{plan.status}</Badge>
            {plan.is_hypothesis && (
              <Badge variant="outline" className="border-warning/50 text-warning">
                Initial hypothesis — no historical data
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{plan.title}</h1>
          <p className="text-muted-foreground max-w-3xl text-sm">{plan.summary}</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <GeneratePlanDialog
              aiReady={aiReady}
              can30={can30}
              defaultDuration={String(plan.duration_days) as "7" | "30"}
              trigger={
                <Button variant="outline" size="sm" disabled={!aiReady}>
                  <RefreshCw className="size-4" /> Regenerate
                </Button>
              }
            />
            {plan.status === "active" && (
              <Button variant="outline" size="sm" onClick={() => setStatus("completed")}>
                <ClipboardCheck className="size-4" /> Mark complete
              </Button>
            )}
            {plan.status === "archived" ? (
              <Button variant="outline" size="sm" onClick={() => setStatus("active")}>
                <ArchiveRestore className="size-4" /> Restore
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setStatus("archived")}>
                <Archive className="size-4" /> Archive
              </Button>
            )}
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="size-4" /> Delete
                </Button>
              }
              title="Delete this growth plan?"
              description="The plan and all its task progress will be permanently removed."
              confirmLabel="Delete plan"
              destructive
              onConfirm={remove}
            />
          </div>
        )}
      </div>

      {plan.is_hypothesis && (
        <Alert className="border-warning/40 bg-warning/5">
          <FlaskConical className="text-warning" />
          <AlertTitle>Starting hypotheses</AlertTitle>
          <AlertDescription>
            No historical performance data was available when this plan was created, so its recommendations and targets are initial hypotheses. Connect accounts or add metrics in Analytics, then regenerate for data-informed plans.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center">
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="tabular-nums">
                {done}/{tasks.length} tasks · {pct}%
              </span>
            </div>
            <Progress value={pct} aria-label={`${pct}% of tasks complete`} />
          </div>
          <p className="text-muted-foreground text-xs sm:pl-4">
            {format(start, "d MMM")} – {format(addDays(start, plan.duration_days - 1), "d MMM yyyy")}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="tasks" className="gap-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="tasks">Daily tasks</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="reviews">Weekly reviews</TabsTrigger>
          <TabsTrigger value="frequency">Posting frequency</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-3">
          {byDay.map(([day, dayTasks]) => (
            <Card key={day}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span>Day {day}</span>
                  <span className="text-muted-foreground text-xs font-normal">{format(addDays(start, day - 1), "EEE d MMM")}</span>
                  {themes.get(day) && <span className="text-muted-foreground font-normal">· {themes.get(day)}</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {dayTasks.map((t) => (
                    <li key={t.id} className="flex items-start gap-3 rounded-lg border p-3">
                      <Checkbox
                        id={`task-${t.id}`}
                        checked={t.is_completed}
                        disabled={!canEdit}
                        onCheckedChange={(c) => toggle(t, c === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor={`task-${t.id}`} className="min-w-0 flex-1 cursor-pointer space-y-1">
                        <span className={cn("block text-sm font-medium", t.is_completed && "text-muted-foreground line-through")}>{t.title}</span>
                        {t.description && <span className="text-muted-foreground block text-sm">{t.description}</span>}
                        <span className="flex flex-wrap gap-1.5">
                          <span className={cn("rounded px-1.5 py-0.5 text-[11px] capitalize", CATEGORY_STYLE[t.category] ?? "bg-muted")}>{t.category}</span>
                          {t.platform && <span className="bg-muted rounded px-1.5 py-0.5 text-[11px] capitalize">{t.platform}</span>}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="targets" className="space-y-3">
          <p className="text-muted-foreground text-sm">Targets are goals to measure against — not guaranteed outcomes.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {(content.targets ?? []).map((t) => (
              <Card key={t.metric}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Target className="text-primary size-4" /> {t.metric}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p className="font-medium">{t.target}</p>
                  <p className="text-muted-foreground">How to measure: {t.howToMeasure}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {(content.risksAndNotes ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-sm">
                  {content.risksAndNotes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="grid gap-3 md:grid-cols-2">
          {(content.weeklyReviews ?? []).map((r) => (
            <Card key={r.week}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarClock className="size-4" /> Week {r.week} review
                  <span className="text-muted-foreground text-xs font-normal">{format(addDays(start, r.week * 7 - 1), "d MMM")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {r.checkpoints.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="frequency">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(content.postingFrequency ?? []).map((f) => (
              <Card key={f.platform}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">{f.platform}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium">{f.frequency}</p>
                  <div className="flex flex-wrap gap-1">
                    {f.formats.map((x) => (
                      <Badge key={x} variant="outline">{x}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
