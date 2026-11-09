import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, system } from "../prompts";
import { platformName, platformSchema, shortText } from "./shared";

export const ENGAGEMENT_MODES = ["reply_drafts", "conversation_starters", "community_activities", "feedback_ideas", "collaboration_ideas"] as const;

export const engagementInput = z
  .object({
    mode: z.enum(ENGAGEMENT_MODES),
    platform: platformSchema,
    comment: shortText(2000).optional(),
    postContext: shortText(1000).optional(),
    tone: shortText(40).optional(),
  })
  .refine((v) => v.mode !== "reply_drafts" || (v.comment && v.comment.length > 0), {
    message: "Paste the comment you want to reply to.",
    path: ["comment"],
  });

export const engagementOutput = z.object({
  suggestions: z.array(z.object({ text: z.string(), whenToUse: z.string() })),
  tips: z.array(z.string()),
});

const MODE_TEXT: Record<(typeof ENGAGEMENT_MODES)[number], string> = {
  reply_drafts: "Draft 3-5 genuine, personal replies to the comment below. They are drafts for the user to review and post manually — never generic spam.",
  conversation_starters: "Suggest 6-8 questions or conversation starters the user could post to spark authentic discussion.",
  community_activities: "Suggest 5-7 community-building activities (e.g. AMAs, challenges, spotlights) suited to the platform.",
  feedback_ideas: "Suggest 5-7 ways to collect genuine audience feedback (polls, question boxes, surveys).",
  collaboration_ideas: "Suggest 5-7 collaboration opportunities (types of partners, formats, outreach angles). Outreach must be personal and permission-based.",
};

export const engagementService = defineService({
  id: "engagement",
  systemPrompt: system(
    "You are an ethical community manager. You help creators build real relationships with their audience. You never suggest automation of likes/comments/follows, engagement pods, bots, or copy-paste mass replies.",
  ),
  inputSchema: engagementInput,
  outputSchema: engagementOutput,
  platform: (i) => i.platform,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      "",
      `Platform: ${platformName(i.platform)}`,
      MODE_TEXT[i.mode],
      i.postContext && `Post context: ${clean(i.postContext, 1000)}`,
      i.comment && `Comment:\n"""\n${clean(i.comment, 2000)}\n"""`,
      i.tone && `Tone: ${i.tone}`,
      "Add 2-3 short tips.",
    ]
      .filter(Boolean)
      .join("\n"),
  title: (i) => `Engagement · ${i.mode.replace(/_/g, " ")}`,
  toPlainText: (o) => o.suggestions.map((s) => `- ${s.text}`).join("\n"),
});
