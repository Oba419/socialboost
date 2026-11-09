import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, performanceBlock, system } from "../prompts";

/** Initial growth assessment shown at the end of onboarding. */
export const growthAssessmentInput = z.object({
  /** Manually entered follower counts from onboarding, by platform name. */
  followers: z.record(z.string().max(40), z.number().int().min(0).max(1_000_000_000)).default({}),
});

export const growthAssessmentOutput = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  priorities: z.array(z.object({ title: z.string(), why: z.string() })),
  quickWins: z.array(z.string()),
  recommendedPostingCadence: z.array(z.object({ platform: z.string(), cadence: z.string(), formats: z.array(z.string()) })),
  first7DaysFocus: z.array(z.string()),
  isHypothesis: z.boolean(),
});

export const growthAssessmentService = defineService({
  id: "growth_assessment",
  systemPrompt: system(
    "You are a social media growth strategist giving a new user their first assessment. Be encouraging, specific and realistic. Base everything on the brand profile and the self-reported follower counts provided; these are unverified, so treat recommendations as starting hypotheses to test.",
  ),
  inputSchema: growthAssessmentInput,
  outputSchema: growthAssessmentOutput,
  saveByDefault: true,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      performanceBlock(brand),
      Object.keys(i.followers).length
        ? `Self-reported follower counts (unverified): ${Object.entries(i.followers)
            .map(([p, n]) => `${p}: ${n}`)
            .join(", ")}`
        : "No follower counts provided.",
      "",
      "Write an initial growth assessment: a 2-3 sentence summary, 2-4 strengths/assets, 3 priorities with reasons, 3-5 quick wins for this week, a realistic posting cadence per selected platform that fits their stated capacity, and 3-5 focus points for the first 7 days. Set isHypothesis=true unless real historical performance data was provided.",
    ].join("\n"),
  title: () => "Initial growth assessment",
  toPlainText: (o) => `${o.summary}\n\n${o.priorities.map((p) => `- ${p.title}: ${p.why}`).join("\n")}`,
});
