import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { runAIService } from "@/lib/ai/runner";
import { growthPlanService } from "@/lib/ai/services/growth-plan";
import type { Json } from "@/types/database";
import { generatePlanSchema, listPlansWithProgress } from "@/features/growth-plans/server";

export const maxDuration = 300;

/** GET /api/growth-plans — plans in this workspace with completion progress. */
export const GET = route(async () => {
  const ctx = await requireApiUser();
  const supabase = await createClient();
  return listPlansWithProgress(supabase, ctx.organization.id);
});

/** POST /api/growth-plans — generate a new 7- or 30-day plan with AI and persist it with its tasks. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const input = await parseJson(req, generatePlanSchema);

  const result = await runAIService(growthPlanService, ctx, input, {
    feature: input.durationDays === 30 ? "growth_plan_30d" : "growth_plan_7d",
    withPerformance: true,
  });
  const out = result.output;

  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("growth_plans")
    .insert({
      organization_id: ctx.organization.id,
      created_by: ctx.userId,
      title: out.title.slice(0, 200),
      duration_days: input.durationDays,
      summary: out.summary,
      plan: out as unknown as Json,
      is_hypothesis: out.isHypothesis,
      status: "active",
    })
    .select("*")
    .single();
  if (error || !plan) throw new AppError("INTERNAL_ERROR", "The plan was generated but could not be saved. Please try again.");

  const tasks = out.days
    .filter((d) => d.day >= 1 && d.day <= input.durationDays)
    .flatMap((d) =>
      d.tasks.map((t, i) => ({
        plan_id: plan.id,
        organization_id: ctx.organization.id,
        day_number: d.day,
        title: t.title.slice(0, 300),
        description: t.description,
        category: t.category,
        platform: t.platform,
        sort_order: i,
      })),
    );
  if (tasks.length) {
    const { error: taskError } = await supabase.from("growth_plan_tasks").insert(tasks);
    if (taskError) {
      await supabase.from("growth_plans").delete().eq("id", plan.id);
      throw new AppError("INTERNAL_ERROR", "The plan's tasks could not be saved. Please try again.");
    }
  }

  return { plan, taskCount: tasks.length, creditsUsed: result.creditsUsed, creditsRemaining: result.creditsRemaining };
});
