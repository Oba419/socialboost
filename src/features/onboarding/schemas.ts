import { z } from "zod";
import { PLATFORM_IDS, type PlatformId } from "@/config/platforms";

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const platformId = z.enum(PLATFORM_IDS as [PlatformId, ...PlatformId[]]);
const shortOpt = (max: number) => z.string().trim().max(max).optional().default("");

export const stepSchemas = {
  1: z.object({
    fullName: z.string().trim().min(2, "Enter your name.").max(100),
    timezone: z.string().refine(isValidTimezone, "Choose a valid timezone."),
  }),
  2: z.object({
    userType: z.enum(["creator", "influencer", "business", "entrepreneur", "agency", "social_media_manager"], {
      message: "Choose the option that fits best.",
    }),
  }),
  3: z.object({
    niche: z.string().trim().min(2, "Pick or type your niche.").max(120),
  }),
  4: z.object({
    platforms: z.array(platformId).min(1, "Choose at least one platform.").max(8),
  }),
  5: z.object({
    goals: z.array(z.string().max(60)).min(1, "Choose at least one goal.").max(8),
  }),
  6: z.object({
    followers: z.record(z.string(), z.string().regex(/^\d{0,10}$/, "Use whole numbers only.")).default({}),
    postingFrequency: z.string().min(1, "Choose how often you can post.").max(60),
    targetAudience: z.string().trim().min(3, "Describe your audience in a few words.").max(300),
    location: shortOpt(100),
    brandVoice: shortOpt(200),
    contentResources: shortOpt(500),
    preferredFormats: z.array(z.string().max(40)).max(10).default([]),
  }),
} as const;

export type OnboardingStep = keyof typeof stepSchemas;

/** Full client form shape (union of all steps). */
export const onboardingFormSchema = stepSchemas[1]
  .merge(stepSchemas[3])
  .merge(stepSchemas[4])
  .merge(stepSchemas[5])
  .merge(stepSchemas[6])
  .extend({ userType: z.string() });

export type OnboardingFormValues = z.input<typeof onboardingFormSchema>;

export const STEP_FIELDS: Record<OnboardingStep, (keyof OnboardingFormValues)[]> = {
  1: ["fullName", "timezone"],
  2: ["userType"],
  3: ["niche"],
  4: ["platforms"],
  5: ["goals"],
  6: ["followers", "postingFrequency", "targetAudience", "location", "brandVoice", "contentResources", "preferredFormats"],
};
