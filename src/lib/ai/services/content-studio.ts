import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, system } from "../prompts";
import { hashtagsToText, languageSchema, platformName, platformNorms, platformSchema, requiredText, shortText } from "./shared";

export const contentStudioInput = z.object({
  platform: platformSchema,
  niche: shortText(120).optional(),
  topic: requiredText(300, "Topic"),
  targetAudience: shortText(200).optional(),
  format: requiredText(60, "Format"),
  tone: requiredText(40, "Tone"),
  objective: requiredText(60, "Objective"),
  length: z.enum(["Short", "Medium", "Long"]).default("Medium"),
  language: languageSchema,
  extraInstructions: shortText(500).optional(),
});

export const contentStudioOutput = z.object({
  title: z.string(),
  hook: z.string(),
  body: z.string(),
  callToAction: z.string(),
  hashtags: z.array(z.string()),
  visualSuggestion: z.string(),
  bestPracticeNotes: z.array(z.string()),
});

export const contentStudioService = defineService({
  id: "content_studio",
  systemPrompt: system(
    "You are a senior social media copywriter. You write original, platform-native posts that match a brand's voice and a specific objective. Hooks must earn attention honestly (no clickbait that the content does not deliver).",
  ),
  inputSchema: contentStudioInput,
  outputSchema: contentStudioOutput,
  platform: (i) => i.platform,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      "",
      `Write one ${platformName(i.platform)} post.`,
      platformNorms(i.platform),
      `Topic: ${clean(i.topic)}`,
      i.niche && `Niche: ${clean(i.niche)}`,
      i.targetAudience && `Target audience: ${clean(i.targetAudience)}`,
      `Content format: ${i.format}`,
      `Tone of voice: ${i.tone}`,
      `Objective: ${i.objective}`,
      `Preferred length: ${i.length}`,
      `Language: ${i.language}`,
      i.extraInstructions && `Additional instructions: ${clean(i.extraInstructions, 500)}`,
      "",
      "Return: a short internal title, the opening hook, the full post body (including the hook at the start), a call to action, 3-10 relevant hashtags without irrelevant tags (empty array if the platform does not use them), a visual suggestion, and 2-4 brief best-practice notes for posting it.",
    ]
      .filter(Boolean)
      .join("\n"),
  title: (_i, o) => o.title,
  toPlainText: (o) => [o.body, o.callToAction, hashtagsToText(o.hashtags)].filter(Boolean).join("\n\n"),
});
