import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { updatePostSchema } from "@/lib/validation/content";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

export const GET = route<Ctx>(async (_req, { params }) => {
  const ctx = await requireApiUser();
  const id = idSchema.parse((await params).id);
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_posts")
    .select("*, post_media(media_id, position, media_assets(*)), scheduled_posts(*)")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!data) throw new AppError("NOT_FOUND", "Post not found.");
  return data;
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const input = await parseJson(req, updatePostSchema);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("social_posts")
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!existing) throw new AppError("NOT_FOUND", "Post not found.");
  if (existing.status === "published") throw new AppError("CONFLICT", "Published posts can't be edited.");

  const { data, error } = await supabase
    .from("social_posts")
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.platform !== undefined && { platform: input.platform }),
      ...(input.contentType !== undefined && { content_type: input.contentType }),
      ...(input.hashtags !== undefined && { hashtags: input.hashtags }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.status !== undefined && { status: input.status }),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new AppError("INTERNAL_ERROR", "Could not update the post.");

  if (input.mediaIds) {
    await supabase.from("post_media").delete().eq("post_id", id);
    if (input.mediaIds.length) {
      const { error: mediaError } = await supabase.from("post_media").insert(
        input.mediaIds.map((media_id, position) => ({ post_id: id, media_id, organization_id: ctx.organization.id, position })),
      );
      if (mediaError) throw new AppError("VALIDATION_ERROR", "One or more media files could not be attached.");
    }
  }
  return data;
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const supabase = await createClient();
  const { data: processing } = await supabase
    .from("scheduled_posts")
    .select("id")
    .eq("post_id", id)
    .eq("status", "processing")
    .limit(1);
  if (processing?.length) throw new AppError("CONFLICT", "This post is being published right now. Try again in a minute.");
  const { error, count } = await supabase
    .from("social_posts")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the post.");
  if (!count) throw new AppError("NOT_FOUND", "Post not found.");
  return { deleted: true };
});
