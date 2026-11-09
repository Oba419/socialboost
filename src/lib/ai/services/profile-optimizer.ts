import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, system } from "../prompts";
import { platformName, platformSchema, requiredText, shortText } from "./shared";

export const profileOptimizerInput = z.object({
  platform: platformSchema,
  bio: requiredText(1500, "Current bio"),
  profileUrl: z.string().trim().url("Enter a valid URL.").max(300).optional().or(z.literal("")),
  displayName: shortText(100).optional(),
  username: shortText(100).optional(),
  link: shortText(300).optional(),
  category: shortText(100).optional(),
  goal: shortText(200).optional(),
});

const scored = z.object({ score: z.number(), assessment: z.string(), recommendation: z.string() });

export const profileOptimizerOutput = z.object({
  overallScore: z.number(),
  summary: z.string(),
  positioning: scored,
  bioClarity: scored,
  keywords: z.object({ score: z.number(), present: z.array(z.string()), suggested: z.array(z.string()), recommendation: z.string() }),
  callToAction: scored,
  brandIdentity: scored,
  audienceRelevance: scored,
  completeness: z.object({ score: z.number(), missing: z.array(z.string()), recommendation: z.string() }),
  alternativeBios: z.array(z.object({ angle: z.string(), bio: z.string(), characterCount: z.number() })),
  quickWins: z.array(z.string()),
});

export const profileOptimizerService = defineService({
  id: "profile_optimizer",
  systemPrompt: system(
    "You are a social profile optimisation expert. You assess ONLY the information the user provides (you cannot visit URLs or see private account data, and you must not pretend to). Scores are 0-100 qualitative assessments, not platform metrics.",
  ),
  inputSchema: profileOptimizerInput,
  outputSchema: profileOptimizerOutput,
  platform: (i) => i.platform,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      "",
      `Platform: ${platformName(i.platform)}`,
      i.displayName && `Display name: ${clean(i.displayName, 100)}`,
      i.username && `Username: ${clean(i.username, 100)}`,
      i.category && `Category: ${clean(i.category, 100)}`,
      i.link && `Link in bio: ${clean(i.link, 300)}`,
      i.profileUrl && `Profile URL (for reference only; you cannot open it): ${clean(i.profileUrl, 300)}`,
      i.goal && `Profile goal: ${clean(i.goal, 200)}`,
      `Current bio:\n"""\n${clean(i.bio, 1500)}\n"""`,
      "",
      "Analyse positioning, bio clarity, keywords, call to action, brand identity, audience relevance and completeness. Give 3 alternative bios that respect the platform's bio length limit, and 3-5 quick wins.",
    ]
      .filter(Boolean)
      .join("\n"),
  title: (i) => `Profile review · ${platformName(i.platform)}`,
  toPlainText: (o) => `${o.summary}\n\n${o.alternativeBios.map((b) => `${b.angle}: ${b.bio}`).join("\n")}`,
});
