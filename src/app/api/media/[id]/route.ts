import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const input = await parseJson(req, z.object({ category: z.string().trim().max(60).nullable() }));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("media_assets")
    .update({ category: input.category || null })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .select("*")
    .maybeSingle();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not update the file.");
  if (!data) throw new AppError("NOT_FOUND", "File not found.");
  return data;
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("media_assets")
    .select("id, storage_path")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!asset) throw new AppError("NOT_FOUND", "File not found.");

  const { error: storageError } = await supabase.storage.from("media").remove([asset.storage_path]);
  if (storageError) throw new AppError("INTERNAL_ERROR", "Could not delete the file from storage.");
  // post_media rows cascade on delete.
  const { error } = await supabase.from("media_assets").delete().eq("id", id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the file.");
  return { deleted: true };
});
