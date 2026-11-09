import "server-only";
import OpenAI from "openai";
import { ConfigurationError, activeAIProvider, serverEnv, type AIProvider } from "@/lib/env";
import type { ModelTier } from "@/config/ai";

/**
 * AI provider client. Both providers are called through the OpenAI SDK:
 * OpenAI natively, Google Gemini through its OpenAI-compatible endpoint.
 * Switch with AI_PROVIDER (or by which key is set). See README › AI.
 */
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

const clients = new Map<AIProvider, OpenAI>();

export function requireProvider(): AIProvider {
  const provider = activeAIProvider();
  if (!provider) {
    throw new ConfigurationError(
      "AI generation",
      "No AI provider is configured. Add OPENAI_API_KEY or GEMINI_API_KEY to enable it.",
    );
  }
  return provider;
}

export function getAIClient(provider: AIProvider = requireProvider()): OpenAI {
  const existing = clients.get(provider);
  if (existing) return existing;
  const env = serverEnv();
  const client =
    provider === "gemini"
      ? // Fail fast: when Gemini is overloaded we switch to the fallback model instead of waiting.
        new OpenAI({ apiKey: env.GEMINI_API_KEY, baseURL: GEMINI_BASE_URL, maxRetries: 1, timeout: 60_000 })
      : new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 2, timeout: 90_000 });
  clients.set(provider, client);
  return client;
}

/** Model to retry with when the primary is overloaded, or null. */
export function fallbackModelFor(provider: AIProvider): string | null {
  return provider === "gemini" ? serverEnv().GEMINI_MODEL_FALLBACK || null : null;
}

/** True for transient provider errors worth retrying on another model. */
export function isOverloadError(error: unknown): boolean {
  return error instanceof OpenAI.APIError && (error.status === 503 || error.status === 429 || error.status === 500);
}

export function modelFor(tier: ModelTier, provider: AIProvider = requireProvider()): string {
  const env = serverEnv();
  if (provider === "gemini") return tier === "advanced" ? env.GEMINI_MODEL_ADVANCED : env.GEMINI_MODEL_DEFAULT;
  return tier === "advanced" ? env.OPENAI_MODEL_ADVANCED : env.OPENAI_MODEL_DEFAULT;
}
