import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, system } from "../prompts";
import { platformName, shortText } from "./shared";

export const competitorAnalysisInput = z.object({
  competitorId: z.string().uuid(),
});

/** Data assembled server-side from the user's saved competitor + snapshots. */
export interface CompetitorAnalysisData {
  name: string;
  platform: string;
  handle: string | null;
  notes: string | null;
  snapshots: Array<{
    capturedAt: string;
    followers: number | null;
    postsPerWeek: number | null;
    avgEngagement: number | null;
    contentThemes: string[];
  }>;
}

export const competitorAnalysisOutput = z.object({
  dataNotice: z.string(),
  contentThemes: z.array(z.string()),
  postingFrequencyAssessment: z.string(),
  engagementAssessment: z.string(),
  formatsObserved: z.array(z.string()),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  opportunitiesForYou: z.array(z.string()),
  unavailableMetrics: z.array(z.string()),
});

export const competitorAnalysisPromptInput = z.object({
  data: z.custom<CompetitorAnalysisData>(),
  extra: shortText(500).optional(),
});

export const competitorAnalysisService = defineService({
  id: "competitor_analysis",
  systemPrompt: system(
    "You are a competitive content analyst. You analyse ONLY the data provided (manually entered public observations or authorised API data). You never claim to have visited the competitor's profile, and you clearly list metrics that are unavailable instead of guessing them.",
  ),
  inputSchema: competitorAnalysisPromptInput,
  outputSchema: competitorAnalysisOutput,
  platform: (i) => i.data.platform,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      "",
      `Competitor: ${clean(i.data.name, 120)} on ${platformName(i.data.platform)}${i.data.handle ? ` (@${clean(i.data.handle, 100)})` : ""}`,
      i.data.notes && `User's notes and observations: ${clean(i.data.notes, 2000)}`,
      i.data.snapshots.length
        ? `Recorded snapshots (oldest to newest):\n${i.data.snapshots
            .map(
              (s) =>
                `- ${s.capturedAt.slice(0, 10)}: followers=${s.followers ?? "n/a"}, posts/week=${s.postsPerWeek ?? "n/a"}, avg engagement=${s.avgEngagement ?? "n/a"}, themes=${s.contentThemes.join("; ") || "n/a"}`,
            )
            .join("\n")}`
        : "No snapshots recorded yet.",
      i.extra && `Question from the user: ${clean(i.extra, 500)}`,
      "",
      "Analyse content themes, posting frequency, public engagement indicators, formats and common topics using only this data, then list market opportunities for the user's brand. List any metric you could not assess in unavailableMetrics.",
    ]
      .filter(Boolean)
      .join("\n"),
  title: (i) => `Competitor analysis · ${i.data.name}`.slice(0, 120),
  toPlainText: (o) => o.opportunitiesForYou.join("\n"),
});
