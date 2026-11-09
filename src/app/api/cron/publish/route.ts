import type { NextRequest } from "next/server";
import { route } from "@/lib/api/handler";
import { assertCronAuth, runJob } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishPost } from "@/lib/social/publish";
import { SocialApiError, type PublishMedia } from "@/lib/social/types";
import { logger } from "@/lib/logger";
import { notify } from "@/services/notifications";
import { PLATFORMS, isPlatformId, type PlatformId } from "@/config/platforms";
import type { ScheduledPostRow } from "@/types/database";

export const maxDuration = 300;

const STALE_LOCK_MINUTES = 15;
const BATCH_SIZE = 25;

const platformLabel = (p: string) => (isPlatformId(p) ? PLATFORMS[p].name : p);

/**
 * Background publisher. Runs every minute via Vercel Cron:
 *   1. Fails stale "processing" rows (never auto-retried: avoids duplicates).
 *   2. Claims due auto-publish jobs (FOR UPDATE SKIP LOCKED) and publishes
 *      through the official API; marks published ONLY on platform confirmation.
 *   3. Flags due manual-mode posts as manual_required and notifies the user.
 */
async function handler(req: NextRequest) {
  assertCronAuth(req);
  return runJob("publish_scheduled_posts", async () => {
    const admin = createAdminClient();
    const now = new Date();
    const stats = { stale: 0, claimed: 0, published: 0, retried: 0, failed: 0, manualDue: 0 };

    // 1) Stale locks.
    const staleBefore = new Date(now.getTime() - STALE_LOCK_MINUTES * 60_000).toISOString();
    const { data: stale } = await admin
      .from("scheduled_posts")
      .update({
        status: "failed",
        last_error: "Outcome unknown — the publish attempt timed out. Check the platform before retrying to avoid a duplicate post.",
      })
      .eq("status", "processing")
      .lt("locked_at", staleBefore)
      .select("id, post_id, created_by, organization_id, platform");
    for (const row of stale ?? []) {
      stats.stale++;
      await admin.from("social_posts").update({ status: "failed" }).eq("id", row.post_id);
      if (row.created_by) {
        await notify({
          userId: row.created_by,
          organizationId: row.organization_id,
          category: "publish_failure",
          title: `Couldn't confirm your ${platformLabel(row.platform)} post`,
          body: "Check the platform to see whether it went out before retrying.",
          link: "/dashboard/calendar",
        });
      }
    }

    // 2) Due auto-publish jobs.
    const { data: claimed, error: claimError } = await admin.rpc("claim_due_scheduled_posts", { p_limit: BATCH_SIZE });
    if (claimError) throw new Error(`claim_due_scheduled_posts failed: ${claimError.message}`);

    for (const job of (claimed ?? []) as ScheduledPostRow[]) {
      stats.claimed++;
      const outcome = await publishOne(admin, job);
      stats[outcome]++;
    }

    // 3) Due manual-mode posts.
    const { data: manualDue } = await admin
      .from("scheduled_posts")
      .update({ status: "manual_required" })
      .eq("status", "scheduled")
      .eq("publish_mode", "manual")
      .lte("scheduled_at", now.toISOString())
      .select("id, created_by, organization_id, platform");
    for (const row of manualDue ?? []) {
      stats.manualDue++;
      if (row.created_by) {
        await notify({
          userId: row.created_by,
          organizationId: row.organization_id,
          category: "scheduled_posts",
          title: `Time to post on ${platformLabel(row.platform)}`,
          body: "Your scheduled post is ready. Open the calendar to copy it and mark it as posted.",
          link: "/dashboard/calendar",
        });
      }
    }

    return stats;
  });
}

type Admin = ReturnType<typeof createAdminClient>;

async function publishOne(admin: Admin, job: ScheduledPostRow): Promise<"published" | "retried" | "failed"> {
  const fail = async (message: string) => {
    await admin.from("scheduled_posts").update({ status: "failed", last_error: message.slice(0, 1000), locked_at: null }).eq("id", job.id);
    await admin.from("social_posts").update({ status: "failed" }).eq("id", job.post_id);
    if (job.created_by) {
      await notify({
        userId: job.created_by,
        organizationId: job.organization_id,
        category: "publish_failure",
        title: `Publishing to ${platformLabel(job.platform)} failed`,
        body: message,
        link: "/dashboard/calendar",
      });
    }
    return "failed" as const;
  };

  try {
    if (!job.social_account_id) return await fail("The connected account was removed. Reconnect it and reschedule.");

    const { data: post } = await admin
      .from("social_posts")
      .select("id, body, hashtags")
      .eq("id", job.post_id)
      .single();
    if (!post) return await fail("The post no longer exists.");

    const { data: links } = await admin.from("post_media").select("media_id, position").eq("post_id", post.id);
    const ids = (links ?? []).map((l) => l.media_id);
    const { data: assets } = ids.length
      ? await admin.from("media_assets").select("id, storage_path, mime_type, kind").in("id", ids)
      : { data: [] as { id: string; storage_path: string; mime_type: string; kind: "image" | "video" }[] };
    const mediaRows = (links ?? [])
      .map((l) => ({ position: l.position, asset: (assets ?? []).find((a) => a.id === l.media_id) }))
      .filter((m): m is { position: number; asset: NonNullable<typeof m.asset> } => Boolean(m.asset))
      .sort((a, b) => a.position - b.position);
    if (mediaRows.length !== ids.length) return await fail("One or more media files are missing.");

    const media: PublishMedia[] = [];
    if (mediaRows.length) {
      const { data: signed, error } = await admin.storage
        .from("media")
        .createSignedUrls(mediaRows.map((m) => m.asset.storage_path), 3600);
      if (error) throw new SocialApiError("Could not prepare media files.", job.platform as PlatformId, true);
      mediaRows.forEach((m, i) => {
        const url = signed?.[i]?.signedUrl;
        if (url) media.push({ url, mimeType: m.asset.mime_type, kind: m.asset.kind });
      });
      if (media.length !== mediaRows.length) return await fail("One or more media files are missing.");
    }

    const hashtags = (post.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
    const text = hashtags && !post.body.includes(hashtags) ? `${post.body}\n\n${hashtags}`.trim() : post.body;

    const result = await publishPost({ socialAccountId: job.social_account_id, input: { text, media } });

    await admin
      .from("scheduled_posts")
      .update({
        status: "published",
        provider_post_id: result.providerPostId,
        provider_post_url: result.url,
        published_at: new Date().toISOString(),
        last_error: null,
        locked_at: null,
      })
      .eq("id", job.id);
    await admin.from("social_posts").update({ status: "published" }).eq("id", job.post_id);
    if (job.created_by) {
      await notify({
        userId: job.created_by,
        organizationId: job.organization_id,
        category: "publish_success",
        title: `Published to ${platformLabel(job.platform)}`,
        body: result.url ? `View it: ${result.url}` : "The platform confirmed your post.",
        link: "/dashboard/calendar",
      });
    }
    return "published";
  } catch (error) {
    if (error instanceof SocialApiError) {
      if (error.authExpired) {
        await admin
          .from("social_accounts")
          .update({ status: "expired", last_error: error.message.slice(0, 500) })
          .eq("id", job.social_account_id!);
        return await fail(`${platformLabel(job.platform)} access expired. Reconnect the account and retry.`);
      }
      if (error.retryable && job.attempts < job.max_attempts) {
        const backoffMinutes = 2 ** job.attempts;
        await admin
          .from("scheduled_posts")
          .update({
            status: "scheduled",
            next_attempt_at: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
            last_error: `Attempt ${job.attempts} failed: ${error.message}`.slice(0, 1000),
            locked_at: null,
          })
          .eq("id", job.id);
        return "retried";
      }
      return await fail(error.message);
    }
    logger.error("Unexpected publish error", error);
    return await fail(error instanceof Error ? error.message : "Unexpected error while publishing.");
  }
}

export const GET = route(handler);
export const POST = route(handler);
