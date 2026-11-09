import "server-only";
import { z } from "zod";
import { PLATFORM_IDS, type PlatformId } from "@/config/platforms";

const platform = z.enum(PLATFORM_IDS as [PlatformId, ...PlatformId[]]);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

export const createCompetitorSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  platform,
  handle: optionalText(100).transform((v) => (v ? v.replace(/^@/, "") : null)),
  profileUrl: z
    .union([z.literal(""), z.string().trim().url("Enter a valid URL.").max(300)])
    .nullable()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => !v || /^https?:\/\//i.test(v), "Only http(s) URLs are allowed."),
  notes: optionalText(4000),
});

export const updateCompetitorSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  platform: platform.optional(),
  handle: optionalText(100),
  profileUrl: z
    .union([z.literal(""), z.string().trim().url().max(300)])
    .nullable()
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), "Only http(s) URLs are allowed."),
  notes: optionalText(4000),
});

const nonNeg = z.coerce.number().min(0).max(1e12).nullable().optional();

export const snapshotSchema = z
  .object({
    followers: z.coerce.number().int().min(0).max(1e12).nullable().optional(),
    postsPerWeek: nonNeg,
    avgEngagement: nonNeg,
    contentThemes: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    capturedAt: z.string().datetime({ offset: true }).optional(),
  })
  .refine((v) => v.followers != null || v.postsPerWeek != null || v.avgEngagement != null || v.contentThemes.length > 0, {
    message: "Enter at least one observation.",
  });

export const analyzeSchema = z.object({ extra: z.string().trim().max(500).optional() });
