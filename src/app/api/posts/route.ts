import { assertSameOrigin, parseJson, parseQuery, route } from "@/lib/api/handler";
import { paginate } from "@/lib/api/response";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { createPostSchema, listPostsQuery } from "@/lib/validation/content";
import { assertCanSave } from "@/services/content";

/** GET /api/posts — list posts in the current workspace (search, filters, pagination). */
export const GET = route(async (req) => {
  const ctx = await requireApiUser();
  const q = parseQuery(req, listPostsQuery);
  const supabase = await createClient();

  let query = supabase
    .from("social_posts")
    .select("*, post_media(media_id, position)", { count: "exact" })
    .eq("organization_id", ctx.organization.id)
    .order("updated_at", { ascending: false })
    .range((q.page - 1) * q.pageSize, q.page * q.pageSize - 1);
  if (q.platform) query = query.eq("platform", q.platform);
  if (q.status) query = query.eq("status", q.status);
  else query = query.neq("status", "archived");
  if (q.search) query = query.textSearch("search", q.search, { type: "websearch", config: "simple" });

  const { data, count, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load posts.");
  return paginate(data ?? [], q.page, q.pageSize, count ?? 0);
});

/** POST /api/posts — create a draft post. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  await rateLimit("write", ctx.userId);
  const input = await parseJson(req, createPostSchema);
  const supabase = await createClient();
  await assertCanSave(supabase, ctx);

  const { data: post, error } = await supabase
    .from("social_posts")
    .insert({
      organization_id: ctx.organization.id,
      created_by: ctx.userId,
      title: input.title ?? null,
      body: input.body,
      platform: input.platform ?? null,
      content_type: input.contentType,
      hashtags: input.hashtags,
      tags: input.tags,
      category: input.category ?? null,
      generated_content_id: input.generatedContentId ?? null,
      status: "draft",
    })
    .select("*")
    .single();
  if (error || !post) throw new AppError("INTERNAL_ERROR", "Could not create the post.");

  if (input.mediaIds.length) {
    // RLS ensures the media belongs to this workspace; insert fails otherwise.
    const { error: mediaError } = await supabase.from("post_media").insert(
      input.mediaIds.map((media_id, position) => ({
        post_id: post.id,
        media_id,
        organization_id: ctx.organization.id,
        position,
      })),
    );
    if (mediaError) throw new AppError("VALIDATION_ERROR", "One or more media files could not be attached.");
  }
  return post;
});
