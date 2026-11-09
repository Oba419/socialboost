import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, performanceBlock, system } from "../prompts";

export const performanceReviewInput = z.object({
  periodDays: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(7),
});

export const performanceReviewOutput = z.object({
  headline: z.string(),
  dataQualityNote: z.string(),
  whatWorked: z.array(z.string()),
  whatToImprove: z.array(z.string()),
  recommendations: z.array(z.object({ action: z.string(), rationale: z.string(), priority: z.enum(["high", "medium", "low"]) })),
  experimentsToRun: z.array(z.string()),
});

export const performanceReviewService = defineService({
  id: "performance_review",
  systemPrompt: system(
    "You are a social media performance analyst. You interpret ONLY the metrics provided, respect that metrics differ by platform and must not be combined into misleading totals, and you state clearly when data is missing or too thin to draw conclusions.",
  ),
  inputSchema: performanceReviewInput,
  outputSchema: performanceReviewOutput,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      performanceBlock(brand),
      "",
      `Write a performance review for the last ${i.periodDays} days with 3-6 prioritised recommendations and 2-3 experiments.`,
      "dataQualityNote must state which sources the data came from and any gaps.",
    ].join("\n"),
  title: (i) => `Performance review · last ${i.periodDays} days`,
  toPlainText: (o) => `${o.headline}\n\n${o.recommendations.map((r) => `- ${r.action}`).join("\n")}`,
});
