import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { updateIdeaSchema } from "@/lib/validation/content";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const input = await parseJson(req, updateIdeaSchema);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_ideas")
    .update(input)
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .select("*")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not update the idea.");
  if (!data) throw new AppError("NOT_FOUND", "Idea not found.");
  return data;
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("content_ideas")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the idea.");
  if (!count) throw new AppError("NOT_FOUND", "Idea not found.");
  return { deleted: true };
});
