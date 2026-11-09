import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, performanceBlock, system } from "../prompts";
import { shortText } from "./shared";

export const growthPlanInput = z.object({
  durationDays: z.union([z.literal(7), z.literal(30)]),
  focus: shortText(300).optional(),
  hoursPerWeek: z.coerce.number().int().min(1).max(80).optional(),
});

export const growthPlanOutput = z.object({
  title: z.string(),
  summary: z.string(),
  isHypothesis: z.boolean(),
  postingFrequency: z.array(z.object({ platform: z.string(), frequency: z.string(), formats: z.array(z.string()) })),
  days: z.array(
    z.object({
      day: z.number(),
      theme: z.string(),
      tasks: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          category: z.enum(["content", "engagement", "community", "optimization", "analysis", "collaboration"]),
          platform: z.string().nullable(),
        }),
      ),
    }),
  ),
  weeklyReviews: z.array(z.object({ week: z.number(), checkpoints: z.array(z.string()) })),
  targets: z.array(
    z.object({ metric: z.string(), target: z.string(), howToMeasure: z.string() }),
  ),
  risksAndNotes: z.array(z.string()),
});

export const growthPlanService = defineService({
  id: "growth_plan",
  systemPrompt: system(
    "You are a social media growth strategist. You build realistic, personalised day-by-day plans that fit the user's available time and resources. Targets must be measurable, modest and framed as goals to track, never guarantees.",
  ),
  inputSchema: growthPlanInput,
  outputSchema: growthPlanOutput,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      performanceBlock(brand),
      "",
      `Create a ${i.durationDays}-day growth plan with exactly ${i.durationDays} entries in "days" (day 1..${i.durationDays}), each with 1-4 tasks.`,
      i.focus && `Special focus: ${clean(i.focus, 300)}`,
      i.hoursPerWeek && `The user can spend about ${i.hoursPerWeek} hours per week.`,
      "Include content creation, audience engagement, community-building, profile optimisation and review tasks.",
      `Include ${i.durationDays === 7 ? "1 weekly review" : "4 weekly reviews"}.`,
      "Targets: 3-6 measurable targets with how to measure each. If no historical data is available, set isHypothesis=true and phrase targets as starting hypotheses.",
    ]
      .filter(Boolean)
      .join("\n"),
  title: (_i, o) => o.title,
  toPlainText: (o) => `${o.summary}\n\n${o.days.map((d) => `Day ${d.day}: ${d.theme}`).join("\n")}`,
  maxOutputTokens: 16000,
});
