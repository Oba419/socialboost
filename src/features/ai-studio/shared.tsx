import { AI_SERVICES, type AIServiceId } from "@/config/ai";

/** Client-safe helpers shared by the AI tool screens. */

export function CreditNote({ service }: { service: AIServiceId }) {
  const credits = AI_SERVICES[service].credits;
  return (
    <p className="text-muted-foreground text-center text-xs">
      Uses {credits} AI credit{credits === 1 ? "" : "s"}
    </p>
  );
}

export function UsageFooter({ used, remaining }: { used: number; remaining: number }) {
  return (
    <p className="text-muted-foreground text-xs">
      {used} credit{used === 1 ? "" : "s"} used · {remaining} remaining this period
    </p>
  );
}

export const tag = (t: string) => (t.startsWith("#") ? t : `#${t}`);
export const tagsText = (tags: string[]) => tags.map(tag).join(" ");

/** Client-side copy of the repurpose targets (the service file holds server prompts). */
export const REPURPOSE_TARGET_LABELS = {
  instagram_carousel: "Instagram carousel",
  tiktok_script: "TikTok script",
  youtube_shorts_script: "YouTube Shorts script",
  facebook_post: "Facebook post",
  linkedin_post: "LinkedIn post",
  x_thread: "X thread",
  threads_post: "Threads post",
  pinterest_pin: "Pinterest pin",
} as const;
export type RepurposeTarget = keyof typeof REPURPOSE_TARGET_LABELS;

export const VIDEO_TARGET_OPTIONS = ["TikTok", "Instagram Reels", "YouTube Shorts", "YouTube (long-form)", "Facebook video"] as const;

export const ENGAGEMENT_MODE_LABELS = {
  reply_drafts: "Reply drafts",
  conversation_starters: "Conversation starters",
  community_activities: "Community activities",
  feedback_ideas: "Feedback ideas",
  collaboration_ideas: "Collaborations",
} as const;
export type EngagementMode = keyof typeof ENGAGEMENT_MODE_LABELS;

export function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
