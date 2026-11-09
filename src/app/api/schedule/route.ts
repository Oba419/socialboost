import { assertSameOrigin, parseJson, parseQuery, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { assertFeature, assertLimit } from "@/lib/entitlements";
import { AppError } from "@/lib/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { canPublishDirectly, PLATFORMS } from "@/config/platforms";
import { audit } from "@/services/audit";
import { createScheduleSchema, MIN_LEAD_MS, rangeQuerySchema } from "@/features/content-calendar/schemas";

const EVENT_SELECT =
  "id, post_id, platform, scheduled_at, timezone, publish_mode, status, attempts, last_error, provider_post_url, published_at, social_account_id, social_posts(id, title, body, content_type, hashtags, status), social_accounts(username, display_name)";

/** GET /api/schedule?from=&to= — scheduled posts in a UTC range (calendar view). */
export const GET = route(async (req) => {
  const ctx = await requireApiUser();
  const q = parseQuery(req, rangeQuerySchema);
  const from = new Date(q.from);
  const to = new Date(q.to);
  if (to <= from || to.getTime() - from.getTime() > 100 * 86_400_000) {
    throw new AppError("VALIDATION_ERROR", "Choose a date range of up to 100 days.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select(EVENT_SELECT)
    .eq("organization_id", ctx.organization.id)
    .gte("scheduled_at", from.toISOString())
    .lt("scheduled_at", to.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1000);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load the calendar.");
  return data ?? [];
});

/** POST /api/schedule — schedule an existing post for a platform. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  await assertFeature(ctx, "content_calendar");
  await rateLimit("write", ctx.userId);
  const input = await parseJson(req, createScheduleSchema);
  const supabase = await createClient();

  const scheduledAt = new Date(input.scheduledAt);
  if (scheduledAt.getTime() < Date.now() + MIN_LEAD_MS) {
    throw new AppError("VALIDATION_ERROR", "Pick a time at least one minute in the future.");
  }

  const { data: post } = await supabase
    .from("social_posts")
    .select("id, body, platform, status, content_type")
    .eq("id", input.postId)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!post) throw new AppError("NOT_FOUND", "Post not found.");
  if (post.status === "published") throw new AppError("CONFLICT", "This post has already been published.");
  const { data: links } = await supabase.from("post_media").select("media_id").eq("post_id", post.id);
  const mediaIds = (links ?? []).map((l) => l.media_id);
  const { data: assets } = mediaIds.length
    ? await supabase.from("media_assets").select("kind").in("id", mediaIds)
    : { data: [] as { kind: string }[] };
  if (!post.body.trim() && !mediaIds.length) {
    throw new AppError("VALIDATION_ERROR", "Add some text or media to the post before scheduling it.");
  }
  const limit = PLATFORMS[input.platform].textLimit;
  if (limit && post.body.length > limit) {
    throw new AppError("VALIDATION_ERROR", `${PLATFORMS[input.platform].name} allows up to ${limit} characters. Shorten the post first.`);
  }

  // Monthly scheduling allowance.
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count } = await supabase
    .from("scheduled_posts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", ctx.organization.id)
    .neq("status", "cancelled")
    .gte("created_at", monthStart);
  await assertLimit(ctx, "scheduledPostsPerMonth", count ?? 0);

  const { data: active } = await supabase
    .from("scheduled_posts")
    .select("id")
    .eq("post_id", post.id)
    .eq("platform", input.platform)
    .in("status", ["scheduled", "processing", "manual_required"])
    .limit(1);
  if (active?.length) throw new AppError("CONFLICT", `This post is already scheduled for ${PLATFORMS[input.platform].name}.`);

  // Direct publishing only with a connected account AND platform support for this media type.
  let accountId: string | null = null;
  if (input.socialAccountId) {
    const { data: account } = await supabase
      .from("social_accounts")
      .select("id, platform, status")
      .eq("id", input.socialAccountId)
      .eq("organization_id", ctx.organization.id)
      .maybeSingle();
    if (!account || account.platform !== input.platform) throw new AppError("VALIDATION_ERROR", "Choose a connected account for this platform.");
    if (account.status !== "connected") throw new AppError("CONFLICT", "That account needs to be reconnected before it can publish.");
    accountId = account.id;
  }
  const kinds = (assets ?? []).map((a) => a.kind);
  const mediaKind: "text" | "image" | "video" = kinds.includes("video") ? "video" : kinds.includes("image") ? "image" : "text";
  const publishMode = accountId && canPublishDirectly(input.platform, mediaKind) ? "auto" : "manual";

  const { data: row, error } = await supabase
    .from("scheduled_posts")
    .insert({
      organization_id: ctx.organization.id,
      post_id: post.id,
      social_account_id: accountId,
      platform: input.platform,
      scheduled_at: scheduledAt.toISOString(),
      timezone: input.timezone,
      publish_mode: publishMode,
      status: "scheduled",
      created_by: ctx.userId,
    })
    .select(EVENT_SELECT)
    .single();
  if (error || !row) throw new AppError("INTERNAL_ERROR", "Could not schedule the post.");

  await supabase
    .from("social_posts")
    .update({ status: "scheduled", ...(post.platform ? {} : { platform: input.platform }) })
    .eq("id", post.id);

  await audit({
    userId: ctx.userId,
    organizationId: ctx.organization.id,
    action: "schedule.create",
    entityType: "scheduled_post",
    entityId: row.id,
    metadata: { platform: input.platform, publishMode },
  });

  return row;
});
