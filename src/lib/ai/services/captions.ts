import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, system } from "../prompts";
import { languageSchema, platformName, platformNorms, platformSchema, requiredText, shortText } from "./shared";

export const captionsInput = z.object({
  platform: platformSchema,
  description: requiredText(1000, "Post description"),
  styles: z.array(z.string().max(40)).min(1, "Pick at least one caption style.").max(7),
  tone: shortText(40).optional(),
  cta: shortText(200).optional(),
  includeHashtags: z.boolean().default(true),
  includeEmojis: z.boolean().default(true),
  language: languageSchema,
});

export const captionsOutput = z.object({
  captions: z.array(
    z.object({
      style: z.string(),
      caption: z.string(),
      callToAction: z.string(),
      hashtags: z.array(z.string()),
      characterCount: z.number(),
    }),
  ),
});

export const captionsService = defineService({
  id: "captions",
  systemPrompt: system(
    "You are an expert caption writer who adapts tone and length to each platform. Captions are original, readable on mobile, and end with a clear, natural call to action.",
  ),
  inputSchema: captionsInput,
  outputSchema: captionsOutput,
  platform: (i) => i.platform,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      "",
      `Write ${platformName(i.platform)} captions for this post: ${clean(i.description, 1000)}`,
      platformNorms(i.platform),
      `Write exactly one caption for each of these styles: ${i.styles.join(", ")}.`,
      i.tone && `Overall tone: ${i.tone}`,
      i.cta && `Preferred call to action: ${clean(i.cta)}`,
      i.includeHashtags ? "Include 3-8 relevant hashtags per caption (in the hashtags field, not inline)." : "Do not include hashtags (empty array).",
      i.includeEmojis ? "Emojis are welcome where natural." : "Do not use emojis.",
      `Language: ${i.language}`,
      "characterCount must be the length of the caption text.",
    ]
      .filter(Boolean)
      .join("\n"),
  title: (i) => `Captions · ${i.description}`.slice(0, 120),
  toPlainText: (o) => o.captions.map((c) => `[${c.style}] ${c.caption}`).join("\n\n"),
});
