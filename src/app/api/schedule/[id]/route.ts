import { z } from "zod";
import { assertSameOrigin, parseJson, route } from "@/lib/api/handler";
import { assertCanEdit, requireApiUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { isServiceRoleConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import { audit } from "@/services/audit";
import { MIN_LEAD_MS, scheduleActionSchema } from "@/features/content-calendar/schemas";

type Ctx = { params: Promise<{ id: string }> };
const idSchema = z.string().uuid();

/** After a schedule leaves the active set, reset the post to draft if nothing else is pending. */
async function syncPostStatus(supabase: ServerSupabaseClient, postId: string) {
  const { data: rows } = await supabase.from("scheduled_posts").select("status").eq("post_id", postId);
  const statuses = (rows ?? []).map((r) => r.status);
  const next = statuses.some((s) => s === "published")
    ? "published"
    : statuses.some((s) => s === "scheduled" || s === "processing" || s === "manual_required")
      ? "scheduled"
      : statuses.some((s) => s === "failed")
        ? "failed"
        : "draft";
  await supabase.from("social_posts").update({ status: next }).eq("id", postId);
}

export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const input = await parseJson(req, scheduleActionSchema);
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("scheduled_posts")
    .select("id, post_id, status, publish_mode")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!row) throw new AppError("NOT_FOUND", "Scheduled post not found.");
  if (row.status === "processing") throw new AppError("CONFLICT", "This post is being published right now.");
  if (row.status === "published") throw new AppError("CONFLICT", "This post has already been published.");

  switch (input.action) {
    case "reschedule":
    case "retry": {
      const when =
        input.action === "reschedule" ? new Date(input.scheduledAt) : new Date(Date.now() + 2 * MIN_LEAD_MS);
      if (input.action === "reschedule" && when.getTime() < Date.now() + MIN_LEAD_MS) {
        throw new AppError("VALIDATION_ERROR", "Pick a time at least one minute in the future.");
      }
      if (input.action === "retry" && row.status !== "failed") {
        throw new AppError("CONFLICT", "Only failed posts can be retried.");
      }
      const { error } = await supabase
        .from("scheduled_posts")
        .update({
          scheduled_at: when.toISOString(),
          ...(input.action === "reschedule" ? { timezone: input.timezone } : {}),
          status: "scheduled",
          attempts: 0,
          next_attempt_at: null,
          last_error: null,
          locked_at: null,
        })
        .eq("id", id);
      if (error) throw new AppError("INTERNAL_ERROR", "Could not update the schedule.");
      break;
    }
    case "cancel": {
      const { error } = await supabase.from("scheduled_posts").update({ status: "cancelled" }).eq("id", id);
      if (error) throw new AppError("INTERNAL_ERROR", "Could not cancel the post.");
      break;
    }
    case "mark_posted": {
      if (row.publish_mode !== "manual") {
        throw new AppError("CONFLICT", "Automatically published posts are confirmed by the platform, not marked manually.");
      }
      // Users can't set 'published' through RLS; the server does it after the checks above.
      if (!isServiceRoleConfigured()) throw new AppError("NOT_CONFIGURED", "SUPABASE_SERVICE_ROLE_KEY is required.");
      const { error } = await createAdminClient()
        .from("scheduled_posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          provider_post_url: input.url || null,
          provider_post_id: null, // user-attested, not platform-confirmed
          last_error: null,
        })
        .eq("id", id)
        .eq("organization_id", ctx.organization.id);
      if (error) throw new AppError("INTERNAL_ERROR", "Could not update the post.");
      break;
    }
  }

  await syncPostStatus(supabase, row.post_id);
  await audit({
    userId: ctx.userId,
    organizationId: ctx.organization.id,
    action: `schedule.${input.action}`,
    entityType: "scheduled_post",
    entityId: id,
  });

  const { data: updated } = await supabase
    .from("scheduled_posts")
    .select(
      "id, post_id, platform, scheduled_at, timezone, publish_mode, status, attempts, last_error, provider_post_url, published_at, social_account_id, social_posts(id, title, body, content_type, hashtags, status), social_accounts(username, display_name)",
    )
    .eq("id", id)
    .single();
  return updated;
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireApiUser();
  assertCanEdit(ctx);
  const id = idSchema.parse((await params).id);
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("scheduled_posts")
    .select("id, post_id, status")
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!row) throw new AppError("NOT_FOUND", "Scheduled post not found.");
  if (row.status === "processing") throw new AppError("CONFLICT", "This post is being published right now.");
  const { error } = await supabase.from("scheduled_posts").delete().eq("id", id);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not delete the schedule.");
  await syncPostStatus(supabase, row.post_id);
  return { deleted: true };
});
