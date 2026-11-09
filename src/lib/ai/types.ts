import type { z } from "zod";
import type { AIServiceId } from "@/config/ai";

/**
 * Non-sensitive brand context passed to the model. Deliberately excludes
 * names, emails, tokens and anything else personal.
 */
export interface BrandContext {
  userType: string | null;
  niche: string | null;
  targetAudience: string | null;
  location: string | null;
  brandVoice: string | null;
  goals: string[];
  platforms: string[];
  preferredFormats: string[];
  postingFrequency: string | null;
  contentResources: string | null;
  /** Summarised real performance data, when the workspace has any. */
  performanceSummary: string | null;
}

export interface AIServiceDefinition<I extends z.ZodType = z.ZodType, O extends z.ZodType = z.ZodType> {
  id: AIServiceId;
  /** Dedicated system instruction for this use case. */
  systemPrompt: string;
  inputSchema: I;
  /** Strict structured-output schema (no optional fields; use nullable). */
  outputSchema: O;
  buildUserPrompt: (input: z.infer<I>, brand: BrandContext) => string;
  title: (input: z.infer<I>, output: z.infer<O>) => string;
  toPlainText: (output: z.infer<O>) => string;
  platform?: (input: z.infer<I>) => string | null;
  /** Save to generated_content (history/library). Default true. */
  persist?: boolean;
  /** Persist as a saved library item (counts towards savedItems). Default false. */
  saveByDefault?: boolean;
  maxOutputTokens?: number;
}

export function defineService<I extends z.ZodType, O extends z.ZodType>(def: AIServiceDefinition<I, O>) {
  return def;
}
