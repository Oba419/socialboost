import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { updateGeneratedSchema } from "@/lib/validation/content";
import { assertCanSave } from "@/services/content";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

export const GET = route<Ctx>(async (_req, { params }) => {
  const ctx = await requireApiUser();
  const id = idSchema.parse((await params).id);
  const supabase = await createClient();
  const { data } = await supabase
    .from("generated_content")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!data) throw new AppError("NOT_FOUND", "Content not found.");
  return data;
});

/** Edit, save/unsave or rate a generation. */
export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const input = await parseJson(req, updateGeneratedSchema);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("generated_content")
    .select("id, is_saved")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!existing) throw new AppError("NOT_FOUND", "Content not found.");
  if (input.isSaved === true && !existing.is_saved) await assertCanSave(supabase, ctx);

  const { data, error } = await supabase
    .from("generated_content")
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.bodyText !== undefined && { body_text: input.bodyText }),
      ...(input.isSaved !== undefined && { is_saved: input.isSaved }),
      ...(input.rating !== undefined && { rating: input.rating }),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not update the content.");
  return data;
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("generated_content")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the content.");
  if (!count) throw new AppError("NOT_FOUND", "Content not found.");
  return { deleted: true };
});
