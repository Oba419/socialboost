import "server-only";
import OpenAI from "openai";
import { ConfigurationError, serverEnv } from "@/lib/env";
import type { ModelTier } from "@/config/ai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  const apiKey = serverEnv().OPENAI_API_KEY;
  if (!apiKey) throw new ConfigurationError("OpenAI", "OPENAI_API_KEY is not set, so AI generation is unavailable.");
  if (!client) client = new OpenAI({ apiKey, maxRetries: 2, timeout: 90_000 });
  return client;
}

export function modelFor(tier: ModelTier): string {
  const env = serverEnv();
  return tier === "advanced" ? env.OPENAI_MODEL_ADVANCED : env.OPENAI_MODEL_DEFAULT;
}
