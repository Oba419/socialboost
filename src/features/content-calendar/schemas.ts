import { z } from "zod";
import { PLATFORM_IDS, type PlatformId } from "@/config/platforms";
import { isValidTimeZone } from "./timezone";

export const timeZoneSchema = z.string().max(64).refine(isValidTimeZone, "Unknown timezone.");

export const createScheduleSchema = z.object({
  postId: z.string().uuid(),
  platform: z.enum(PLATFORM_IDS as [PlatformId, ...PlatformId[]]),
  socialAccountId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime({ offset: true }),
  timezone: timeZoneSchema,
});

export const scheduleActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reschedule"), scheduledAt: z.string().datetime({ offset: true }), timezone: timeZoneSchema }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("retry") }),
  z.object({
    action: z.literal("mark_posted"),
    url: z.string().trim().url("Enter a valid URL.").max(500).optional().or(z.literal("")),
  }),
]);

export const rangeQuerySchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
});

export type ScheduleStatus = "scheduled" | "processing" | "published" | "failed" | "manual_required" | "cancelled";

/** Shape returned by GET /api/schedule. */
export interface CalendarEvent {
  id: string;
  post_id: string;
  platform: string;
  scheduled_at: string;
  timezone: string;
  publish_mode: "auto" | "manual";
  status: ScheduleStatus;
  attempts: number;
  last_error: string | null;
  provider_post_url: string | null;
  published_at: string | null;
  social_account_id: string | null;
  social_posts: {
    id: string;
    title: string | null;
    body: string;
    content_type: string;
    hashtags: string[];
    status: string;
  } | null;
  social_accounts: { username: string | null; display_name: string | null } | null;
}

export const MIN_LEAD_MS = 60_000;
