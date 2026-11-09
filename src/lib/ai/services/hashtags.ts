import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, system } from "../prompts";
import { platformName, platformSchema, requiredText, shortText } from "./shared";

export const hashtagsInput = z.object({
  topic: requiredText(200, "Topic or keyword"),
  platform: platformSchema,
  location: shortText(100).optional(),
});

const tagGroup = z.array(z.object({ tag: z.string(), reason: z.string() }));

export const hashtagsOutput = z.object({
  broad: tagGroup,
  niche: tagGroup,
  community: tagGroup,
  industry: tagGroup,
  location: tagGroup,
  usageTips: z.array(z.string()),
  disclaimer: z.string(),
});

export const hashtagsService = defineService({
  id: "hashtags",
  systemPrompt: system(
    "You are a hashtag strategist. You recommend relevant hashtags grouped by reach type. You have NO access to live hashtag volume data, so you never state post counts, volumes or 'trending' status as facts.",
  ),
  inputSchema: hashtagsInput,
  outputSchema: hashtagsOutput,
  platform: (i) => i.platform,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      "",
      `Suggest hashtags for ${platformName(i.platform)} about: ${clean(i.topic)}.`,
      i.location ? `Location focus: ${clean(i.location, 100)}` : "No location given: return location tags only if the brand profile has a location, otherwise an empty array.",
      "Group into broad, niche, community, industry-specific and location-specific (4-8 tags per group, no '#' prefix needed). Give a one-line reason for each.",
      "Add 2-4 usage tips for this platform.",
      "The disclaimer must state that these are AI suggestions, not verified by live platform data, and that the user should check them on the platform before use.",
    ].join("\n"),
  title: (i) => `Hashtags · ${i.topic}`.slice(0, 120),
  toPlainText: (o) =>
    [...o.broad, ...o.niche, ...o.community, ...o.industry, ...o.location]
      .map((t) => (t.tag.startsWith("#") ? t.tag : `#${t.tag}`))
      .join(" "),
});
