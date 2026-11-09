import { z } from "zod";
import { PLATFORM_IDS, type PlatformId } from "@/config/platforms";
import { isValidTimezone } from "@/features/onboarding/schemas";

export const NOTIFICATION_CATEGORIES = [
  { key: "scheduled_posts", label: "Scheduled post reminders", emailable: false },
  { key: "publish_success", label: "Publishing success", emailable: false },
  { key: "publish_failure", label: "Publishing failures", emailable: true },
  { key: "subscription", label: "Subscription & billing", emailable: true },
  { key: "ai_limits", label: "AI credit limits", emailable: false },
  { key: "weekly_report", label: "Weekly growth report", emailable: true },
  { key: "integrations", label: "Account integration events", emailable: false },
] as const;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(100),
  avatarUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\//.test(v), "Use an https:// image URL.")
    .default(""),
  timezone: z.string().refine(isValidTimezone, "Choose a valid timezone."),
});

export const brandSchema = z.object({
  name: z.string().trim().min(1, "Enter a workspace name.").max(120),
  userType: z.enum(["creator", "influencer", "business", "entrepreneur", "agency", "social_media_manager"]).nullable(),
  niche: z.string().trim().max(120).default(""),
  targetAudience: z.string().trim().max(300).default(""),
  location: z.string().trim().max(100).default(""),
  brandVoice: z.string().trim().max(200).default(""),
  platforms: z.array(z.enum(PLATFORM_IDS as [PlatformId, ...PlatformId[]])).max(8).default([]),
  goals: z.array(z.string().max(60)).max(8).default([]),
  postingFrequency: z.string().max(60).default(""),
  contentResources: z.string().trim().max(500).default(""),
  preferredFormats: z.array(z.string().max(40)).max(10).default([]),
});

export const themeSchema = z.enum(["light", "dark", "system"]);

const categoryKeys = NOTIFICATION_CATEGORIES.map((c) => c.key) as [string, ...string[]];
export const notificationSettingsSchema = z.object({
  in_app: z.record(z.enum(categoryKeys), z.boolean()),
  email: z.record(z.enum(categoryKeys), z.boolean()),
});

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120),
  type: z.enum(["brand", "client"]),
});

export const memberRoleSchema = z.enum(["admin", "editor", "viewer"]);

export const addMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  role: memberRoleSchema,
});

export type ProfileValues = z.input<typeof profileSchema>;
export type BrandValues = z.input<typeof brandSchema>;
