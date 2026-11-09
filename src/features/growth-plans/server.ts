import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { GrowthPlanRow, GrowthPlanTaskRow } from "@/types/database";

export const generatePlanSchema = z.object({
  durationDays: z.union([z.literal(7), z.literal(30)]),
  focus: z.string().trim().max(300).optional(),
  hoursPerWeek: z.coerce.number().int().min(1).max(80).optional(),
});

export const updatePlanSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
});

export const updateTaskSchema = z.object({
  isCompleted: z.boolean().optional(),
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().max(2000).optional(),
});

export type PlanWithProgress = GrowthPlanRow & { totalTasks: number; completedTasks: number };

export async function listPlansWithProgress(supabase: ServerSupabaseClient, organizationId: string): Promise<PlanWithProgress[]> {
  const { data: plans, error } = await supabase
    .from("growth_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load growth plans.");
  if (!plans?.length) return [];
  const { data: tasks } = await supabase
    .from("growth_plan_tasks")
    .select("plan_id, is_completed")
    .eq("organization_id", organizationId)
    .in(
      "plan_id",
      plans.map((p) => p.id),
    );
  return plans.map((p) => {
    const mine = (tasks ?? []).filter((t) => t.plan_id === p.id);
    return { ...p, totalTasks: mine.length, completedTasks: mine.filter((t) => t.is_completed).length };
  });
}

export async function getPlanWithTasks(supabase: ServerSupabaseClient, organizationId: string, id: string) {
  const { data: plan } = await supabase.from("growth_plans").select("*").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (!plan) return null;
  const { data: tasks } = await supabase
    .from("growth_plan_tasks")
    .select("*")
    .eq("plan_id", id)
    .order("day_number", { ascending: true })
    .order("sort_order", { ascending: true });
  return { plan, tasks: (tasks ?? []) as GrowthPlanTaskRow[] };
}
