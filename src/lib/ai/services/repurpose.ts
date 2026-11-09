import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, system } from "../prompts";
import { languageSchema, platformName, requiredText, shortText } from "./shared";

export const REPURPOSE_TARGETS = [
  "instagram_carousel",
  "tiktok_script",
  "youtube_shorts_script",
  "facebook_post",
  "linkedin_post",
  "x_thread",
  "threads_post",
  "pinterest_pin",
] as const;

export const REPURPOSE_LABELS: Record<(typeof REPURPOSE_TARGETS)[number], string> = {
  instagram_carousel: "Instagram carousel",
  tiktok_script: "TikTok script",
  youtube_shorts_script: "YouTube Shorts script",
  facebook_post: "Facebook post",
  linkedin_post: "LinkedIn post",
  x_thread: "X thread",
  threads_post: "Threads post",
  pinterest_pin: "Pinterest pin",
};

export const repurposeInput = z.object({
  original: requiredText(5000, "Original content"),
  targets: z.array(z.enum(REPURPOSE_TARGETS)).min(1, "Pick at least one output.").max(8),
  tone: shortText(40).optional(),
  language: languageSchema,
});

export const repurposeOutput = z.object({
  versions: z.array(
    z.object({
      target: z.string(),
      platform: z.string(),
      title: z.string(),
      /** Ordered parts: carousel slides, thread posts, script beats; single item for a post. */
      parts: z.array(z.string()),
      caption: z.string(),
      hashtags: z.array(z.string()),
      adaptationNotes: z.string(),
    }),
  ),
});

export const repurposeService = defineService({
  id: "repurpose",
  systemPrompt: system(
    "You are a content repurposing specialist. You turn one idea into multiple platform-native pieces. Each version must be genuinely adapted to the destination's format, length, audience expectations and tone. Never copy text word for word between versions.",
  ),
  inputSchema: repurposeInput,
  outputSchema: repurposeOutput,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      "",
      "Original content or idea:",
      '"""',
      clean(i.original, 5000),
      '"""',
      "",
      `Create one version for each of: ${i.targets.map((t) => REPURPOSE_LABELS[t]).join(", ")}.`,
      "Set `target` to the exact key from this list: " + i.targets.join(", ") + ".",
      "Set `platform` to the platform id (instagram, tiktok, youtube, facebook, linkedin, x, threads, pinterest).",
      "Carousels: 6-10 slides as parts. Threads/X threads: 4-8 posts as parts, each within the character limit. Scripts: beats as parts with timing. Single posts: one part.",
      i.tone && `Tone: ${i.tone}`,
      `Language: ${i.language}`,
      "adaptationNotes: one sentence on what you changed for this platform.",
    ]
      .filter(Boolean)
      .join("\n"),
  title: (i) => `Repurposed · ${i.original}`.slice(0, 120),
  toPlainText: (o) =>
    o.versions.map((v) => `## ${platformName(v.platform)} — ${v.title}\n${v.parts.join("\n")}`).join("\n\n"),
  maxOutputTokens: 8000,
});
