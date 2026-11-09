import { z } from "zod";
import { defineService } from "../types";
import { brandBlock, clean, system } from "../prompts";
import { languageSchema, requiredText, shortText } from "./shared";

export const VIDEO_TARGETS = ["TikTok", "Instagram Reels", "YouTube Shorts", "YouTube (long-form)", "Facebook video"] as const;

export const videoScriptInput = z.object({
  target: z.enum(VIDEO_TARGETS),
  topic: requiredText(300, "Topic"),
  duration: requiredText(30, "Duration"),
  tone: shortText(40).optional(),
  objective: shortText(60).optional(),
  targetAudience: shortText(200).optional(),
  language: languageSchema,
});

export const videoScriptOutput = z.object({
  title: z.string(),
  openingHook: z.string(),
  introduction: z.string(),
  scenes: z.array(
    z.object({
      timestamp: z.string(),
      talkingPoint: z.string(),
      sceneSuggestion: z.string(),
      voiceover: z.string(),
      onScreenText: z.string(),
    }),
  ),
  callToAction: z.string(),
  suggestedCaption: z.string(),
  suggestedTitles: z.array(z.string()),
  productionTips: z.array(z.string()),
});

export const videoScriptService = defineService({
  id: "video_script",
  systemPrompt: system(
    "You are a short- and long-form video scriptwriter. You structure scripts with a strong opening hook, clear beats and practical shot suggestions that a solo creator with a phone could film.",
  ),
  inputSchema: videoScriptInput,
  outputSchema: videoScriptOutput,
  platform: (i) => (i.target.startsWith("YouTube") ? "youtube" : i.target === "TikTok" ? "tiktok" : i.target === "Instagram Reels" ? "instagram" : "facebook"),
  buildUserPrompt: (i, brand) =>
    [
      brandBlock(brand),
      "",
      `Write a ${i.duration} ${i.target} video script about: ${clean(i.topic)}.`,
      i.tone && `Tone: ${i.tone}`,
      i.objective && `Objective: ${i.objective}`,
      i.targetAudience && `Audience: ${clean(i.targetAudience)}`,
      `Language: ${i.language}`,
      "Pace the scenes so timestamps fit the requested duration. Include opening hook, introduction, main talking points as scenes (each with scene suggestion, voiceover and on-screen text), a CTA, a suggested caption, 3 title options and 2-4 production tips.",
    ]
      .filter(Boolean)
      .join("\n"),
  title: (_i, o) => o.title,
  toPlainText: (o) =>
    [o.openingHook, o.introduction, ...o.scenes.map((s) => `[${s.timestamp}] ${s.voiceover}`), o.callToAction].join("\n\n"),
  maxOutputTokens: 6000,
});
