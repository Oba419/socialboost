import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { isAllowedMime, mediaKind } from "@/features/content-library/media-config";

const schema = z.object({
  path: z.string().max(300),
  fileName: z.string().trim().min(1).max(200),
  category: z.string().trim().max(60).nullable().optional(),
});

/**
 * POST /api/media/complete — record an uploaded object after verifying it
 * exists in storage. Size and MIME type come from storage metadata, not the client.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const input = await parseJson(req, schema);

  const prefix = `${ctx.organization.id}/`;
  const objectName = input.path.slice(prefix.length);
  if (!input.path.startsWith(prefix) || !/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(objectName)) {
    throw new AppError("FORBIDDEN", "Invalid upload path.");
  }

  const supabase = await createClient();
  const { data: objects, error } = await supabase.storage.from("media").list(ctx.organization.id, { search: objectName, limit: 1 });
  const object = objects?.find((o) => o.name === objectName);
  if (error || !object) throw new AppError("NOT_FOUND", "Upload not found. Please try uploading again.");

  const meta = (object.metadata ?? {}) as { size?: number; mimetype?: string };
  const mime = meta.mimetype ?? "";
  const size = Number(meta.size ?? 0);
  if (!isAllowedMime(mime) || size <= 0) {
    await supabase.storage.from("media").remove([input.path]);
    throw new AppError("VALIDATION_ERROR", "The uploaded file type isn't supported.");
  }

  const { data: row, error: insertError } = await supabase
    .from("media_assets")
    .insert({
      organization_id: ctx.organization.id,
      created_by: ctx.userId,
      storage_path: input.path,
      file_name: input.fileName,
      mime_type: mime,
      size_bytes: size,
      kind: mediaKind(mime),
      category: input.category ?? null,
    })
    .select("*")
    .single();
  if (insertError || !row) throw new AppError("INTERNAL_ERROR", "Could not save the upload.");

  const { data: signed } = await supabase.storage.from("media").createSignedUrl(input.path, 3600);
  return { ...row, url: signed?.signedUrl ?? null };
});
