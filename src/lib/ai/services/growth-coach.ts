import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, performanceBlock, system } from "../prompts";
import { requiredText } from "./shared";

export const growthCoachInput = z.object({
  message: requiredText(2000, "Message"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(12)
    .default([]),
});

export const growthCoachOutput = z.object({
  reply: z.string(),
  suggestedActions: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
});

export const growthCoachService = defineService({
  id: "growth_coach",
  systemPrompt: system(
    "You are a supportive, practical AI social media growth coach. You give specific, prioritised advice grounded in the user's brand profile and any real data provided. You ask clarifying questions when needed. You keep answers concise and skimmable. You never claim to see private account data that is not provided.",
  ),
  inputSchema: growthCoachInput,
  outputSchema: growthCoachOutput,
  persist: true,
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      performanceBlock(brand),
      "",
      i.history.length ? "Conversation so far:" : "",
      ...i.history.map((m) => `${m.role === "user" ? "User" : "Coach"}: ${clean(m.content, 4000)}`),
      "",
      `User: ${clean(i.message, 2000)}`,
      "",
      "Reply as the coach. Provide 0-4 concrete suggested actions and 0-3 follow-up questions the user might ask next.",
    ]
      .filter((l) => l !== undefined)
      .join("\n"),
  title: (i) => `Coach · ${i.message}`.slice(0, 120),
  toPlainText: (o) => o.reply,
});
