import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, system } from "../prompts";
import { platformName, platformSchema, requiredText, shortText } from "./shared";

export const trendsInput = z.object({
  niche: requiredText(120, "Niche"),
  industry: shortText(120).optional(),
  targetAudience: shortText(200).optional(),
  platform: platformSchema.optional(),
  location: shortText(100).optional(),
  topic: shortText(200).optional(),
});

export const trendsOutput = z.object({
  dataNotice: z.string(),
  themes: z.array(
    z.object({
      theme: z.string(),
      whyRelevant: z.string(),
      contentAngles: z.array(z.string()),
      formats: z.array(z.string()),
    }),
  ),
  audienceQuestions: z.array(z.string()),
  evergreenOpportunities: z.array(z.string()),
  howToValidate: z.array(z.string()),
});

export const trendsService = defineService({
  id: "trends",
  systemPrompt: system(
    "You are a content research analyst. You do NOT have access to live or real-time trend data. You suggest discussion themes and content angles that are plausibly relevant, based on general knowledge, and you explicitly label them as ideas to validate — never as verified trends. Never invent search volumes, growth percentages or 'trending now' claims.",
  ),
  inputSchema: trendsInput,
  outputSchema: trendsOutput,
  platform: (i) => i.platform ?? null,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      "",
      `Niche: ${clean(i.niche, 120)}`,
      i.industry && `Industry: ${clean(i.industry, 120)}`,
      i.targetAudience && `Audience: ${clean(i.targetAudience, 200)}`,
      i.platform && `Platform: ${platformName(i.platform)}`,
      i.location && `Location: ${clean(i.location, 100)}`,
      i.topic && `Topic focus: ${clean(i.topic, 200)}`,
      "",
      "Give 5-8 emerging or recurring discussion themes with content angles and formats, 5-8 questions this audience frequently asks, 3-5 evergreen opportunities, and 3-4 ways the user can validate these ideas with real data (e.g. platform search, native analytics, comments).",
      "dataNotice must clearly say these are AI-generated ideas, not real-time verified trends.",
    ]
      .filter(Boolean)
      .join("\n"),
  title: (i) => `Trend ideas · ${i.niche}`.slice(0, 120),
  toPlainText: (o) => o.themes.map((t) => `${t.theme}: ${t.whyRelevant}`).join("\n"),
});
