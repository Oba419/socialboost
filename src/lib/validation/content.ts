import { z } from "zod";
import { PLATFORM_IDS, type PlatformId } from "@/config/platforms";

export const platformIdSchema = z.enum(PLATFORM_IDS as [PlatformId, ...PlatformId[]]);

export const postContentTypes = ["text", "image", "video", "carousel", "thread", "story"] as const;
export const postStatuses = ["draft", "ready", "scheduled", "published", "failed", "archived"] as const;

export const createPostSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().max(20000).default(""),
  platform: platformIdSchema.nullable().optional(),
  contentType: z.enum(postContentTypes).default("text"),
  hashtags: z.array(z.string().trim().max(100)).max(50).default([]),
  tags: z.array(z.string().trim().max(50)).max(20).default([]),
  category: z.string().trim().max(60).nullable().optional(),
  generatedContentId: z.string().uuid().nullable().optional(),
  mediaIds: z.array(z.string().uuid()).max(10).default([]),
});

export const updatePostSchema = createPostSchema.partial().extend({
  status: z.enum(["draft", "ready", "archived"]).optional(),
});

export const listPostsQuery = z.object({
  search: z.string().trim().max(200).optional(),
  platform: platformIdSchema.optional(),
  status: z.enum(postStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateGeneratedSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  bodyText: z.string().max(20000).optional(),
  isSaved: z.boolean().optional(),
  rating: z.union([z.literal(1), z.literal(-1), z.null()]).optional(),
});

export const saveIdeasSchema = z.object({
  generatedContentId: z.string().uuid().nullable().optional(),
  ideas: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().max(4000).default(""),
        targetAudience: z.string().max(300).nullable().optional(),
        platform: z.string().max(40).nullable().optional(),
        format: z.string().max(60).nullable().optional(),
        hook: z.string().max(1000).nullable().optional(),
        cta: z.string().max(500).nullable().optional(),
        hashtags: z.array(z.string().max(100)).max(30).default([]),
        rationale: z.string().max(2000).nullable().optional(),
      }),
    )
    .min(1)
    .max(30),
});

export const updateIdeaSchema = z.object({
  status: z.enum(["saved", "used", "archived"]).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(4000).optional(),
});
