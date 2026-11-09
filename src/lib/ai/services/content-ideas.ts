import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, performanceBlock, system } from "../prompts";
import { languageSchema, platformName, platformSchema, requiredText, shortText } from "./shared";

export const contentIdeasInput = z.object({
  scope: requiredText(60, "Idea type"),
  topic: shortText(300).optional(),
  platform: platformSchema.optional(),
  targetAudience: shortText(200).optional(),
  count: z.coerce.number().int().min(3).max(15).default(7),
  language: languageSchema,
});

export const contentIdeaSchema = z.object({
  title: z.string(),
  description: z.string(),
  targetAudience: z.string(),
  platform: z.string(),
  format: z.string(),
  hook: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()),
  whyItMayResonate: z.string(),
  suggestedDay: z.string().nullable(),
});

export const contentIdeasOutput = z.object({
  ideas: z.array(contentIdeaSchema),
});

export const contentIdeasService = defineService({
  id: "content_ideas",
  systemPrompt: system(
    "You are a creative content strategist. You generate specific, actionable content ideas tailored to a brand and audience. Every idea must be concrete enough to produce today, not a vague theme.",
  ),
  inputSchema: contentIdeasInput,
  outputSchema: contentIdeasOutput,
  platform: (i) => i.platform ?? null,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      performanceBlock(brand),
      "",
      `Generate ${i.count} content ideas. Idea type: ${i.scope}.`,
      i.topic && `Focus topic: ${clean(i.topic)}`,
      i.platform ? `Platform: ${platformName(i.platform)}` : "Recommend the best platform for each idea from the brand's active platforms.",
      i.targetAudience && `Target audience: ${clean(i.targetAudience)}`,
      `Language: ${i.language}`,
      i.scope.toLowerCase().includes("calendar") || i.scope.toLowerCase().includes("weekly") || i.scope.toLowerCase().includes("series")
        ? "Assign a suggestedDay to each idea (e.g. 'Week 1 · Monday' or 'Day 3') so they form a coherent schedule."
        : "Set suggestedDay to null unless a schedule is implied.",
      "For each idea give: title, description, target audience, recommended platform, content format, a hook, a CTA, 3-8 relevant hashtags, and why the idea may resonate (reasoning, not guarantees).",
    ]
      .filter(Boolean)
      .join("\n"),
  title: (i) => `${i.scope}${i.topic ? ` · ${i.topic}` : ""}`.slice(0, 120),
  toPlainText: (o) => o.ideas.map((idea, n) => `${n + 1}. ${idea.title} — ${idea.description}`).join("\n"),
  maxOutputTokens: 6000,
});
