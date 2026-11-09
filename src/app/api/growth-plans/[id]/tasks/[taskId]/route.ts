import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { updateTaskSchema } from "@/features/growth-plans/server";

type Ctx = { params: Promise<{ id: string; taskId: string }> };

/** PATCH /api/growth-plans/:id/tasks/:taskId — toggle completion or edit a task. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const p = await params;
  const planId = z.string().uuid().parse(p.id);
  const taskId = z.string().uuid().parse(p.taskId);
  const input = await parseJson(req, updateTaskSchema);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("growth_plan_tasks")
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isCompleted !== undefined && {
        is_completed: input.isCompleted,
        completed_at: input.isCompleted ? new Date().toISOString() : null,
      }),
    })
    .eq("id", taskId)
    .eq("plan_id", planId)
    .eq("organization_id", ctx.organization.id)
    .select("*")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not update the task.");
  if (!data) throw new AppError("NOT_FOUND", "Task not found.");
  return data;
});
