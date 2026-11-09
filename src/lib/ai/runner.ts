import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { AI_SERVICES } from "@/config/ai";
import { AppError, isAppError } from "@/lib/errors";
import { ConfigurationError, isOpenAIConfigured, isServiceRoleConfigured, serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertFeature, getEntitlements } from "@/lib/entitlements";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import type { AuthContext } from "@/lib/auth/session";
import type { FeatureKey } from "@/config/plans";
import type { Json } from "@/types/database";
import { getOpenAI, modelFor } from "./client";
import { buildBrandContext } from "./context";
import type { AIServiceDefinition } from "./types";
import { notify } from "@/services/notifications";

export interface AIRunResult<T> {
  output: T;
  generationId: string | null;
  creditsUsed: number;
  creditsRemaining: number;
  model: string;
}

interface RunOptions {
  /** Override the entitlement checked (e.g. growth_plan_30d). */
  feature?: FeatureKey;
  withPerformance?: boolean;
  /** Save as a library item instead of history only. */
  save?: boolean;
}

/**
 * Executes one AI use case end to end:
 *   entitlement → rate limit → config check → atomic credit reservation →
 *   model call (structured output) → Zod validation → persistence + usage.
 * Credits are refunded if the call or validation fails.
 */
export async function runAIService<I extends z.ZodType, O extends z.ZodType>(
  def: AIServiceDefinition<I, O>,
  ctx: AuthContext,
  rawInput: unknown,
  options: RunOptions = {},
): Promise<AIRunResult<z.infer<O>>> {
  const config = AI_SERVICES[def.id];
  const input = def.inputSchema.parse(rawInput) as z.infer<I>;

  if (ctx.role === "viewer") throw new AppError("FORBIDDEN", "You have view-only access to this workspace.");
  await assertFeature(ctx, options.feature ?? config.feature);
  await rateLimit("ai", ctx.userId);

  if (!isOpenAIConfigured()) {
    throw new ConfigurationError("OpenAI", "AI generation is not configured yet. Add OPENAI_API_KEY to enable it.");
  }
  if (!isServiceRoleConfigured()) {
    throw new ConfigurationError(
      "Usage metering",
      "SUPABASE_SERVICE_ROLE_KEY is required to meter AI credits securely.",
    );
  }

  const admin = createAdminClient();
  const ent = await getEntitlements(ctx.billingUserId);

  // 1) Reserve credits atomically.
  const { data: reservation, error: reserveError } = await admin.rpc("reserve_ai_credits", {
    p_billing_user: ctx.billingUserId,
    p_user: ctx.userId,
    p_org: ctx.organization.id,
    p_service: def.id,
    p_credits: config.credits,
    p_limit: ent.plan.limits.aiCreditsPerPeriod,
    p_period_start: ent.periodStart.toISOString(),
  });
  if (reserveError) {
    logger.error("Credit reservation failed", reserveError.message);
    throw new AppError("INTERNAL_ERROR", "Could not check your AI credits. Please try again.");
  }
  const res = reservation as { allowed: boolean; used: number; limit: number; usage_id?: string };
  if (!res.allowed) {
    void notify({
      userId: ctx.billingUserId,
      organizationId: ctx.organization.id,
      category: "ai_limits",
      title: "AI credit limit reached",
      body: `You've used ${res.used} of ${res.limit} AI credits this period.`,
      link: "/dashboard/billing",
      dedupeHours: 24,
    });
    throw new AppError(
      "QUOTA_EXCEEDED",
      `You've used all ${res.limit} AI credits in your ${ent.plan.name} plan this period. Upgrade or wait for your credits to reset.`,
      { used: res.used, limit: res.limit },
    );
  }

  const model = modelFor(config.tier);
  const started = Date.now();
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  try {
    const brand = await buildBrandContext(ctx, { withPerformance: options.withPerformance });
    const response = await getOpenAI().responses.parse({
      model,
      instructions: def.systemPrompt,
      input: def.buildUserPrompt(input, brand),
      text: { format: zodTextFormat(def.outputSchema, `${def.id}_output`) },
      max_output_tokens: def.maxOutputTokens ?? serverEnv().OPENAI_MAX_OUTPUT_TOKENS,
      // Do not let OpenAI store prompts for training/debugging beyond the request.
      store: false,
    });

    inputTokens = response.usage?.input_tokens ?? null;
    outputTokens = response.usage?.output_tokens ?? null;

    if (response.status === "incomplete") {
      throw new AppError("AI_OUTPUT_INVALID", "The AI response was cut short. Try a shorter request.");
    }

    // 2) Validate again with Zod before anything is stored or displayed.
    const parsed = def.outputSchema.safeParse(response.output_parsed);
    if (!parsed.success) {
      throw new AppError("AI_OUTPUT_INVALID", "The AI returned an unexpected format. Your credits were not charged.");
    }
    const output = parsed.data as z.infer<O>;

    // 3) Persist.
    let generationId: string | null = null;
    if (def.persist !== false) {
      const supabase = await createClient();
      const { data: row, error } = await supabase
        .from("generated_content")
        .insert({
          organization_id: ctx.organization.id,
          created_by: ctx.userId,
          service: def.id,
          platform: def.platform?.(input) ?? null,
          title: def.title(input, output).slice(0, 200),
          content: output as Json,
          body_text: def.toPlainText(output).slice(0, 20000),
          input: sanitiseInput(input),
          is_saved: options.save ?? def.saveByDefault ?? false,
        })
        .select("id")
        .single();
      if (error) logger.error("Failed to persist generation", error.message);
      generationId = row?.id ?? null;
    }

    await Promise.all([
      res.usage_id
        ? admin.from("ai_usage").update({ input_tokens: inputTokens, output_tokens: outputTokens }).eq("id", res.usage_id)
        : Promise.resolve(),
      admin.from("ai_generation_history").insert({
        organization_id: ctx.organization.id,
        user_id: ctx.userId,
        service: def.id,
        model,
        status: "success",
        generated_content_id: generationId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        latency_ms: Date.now() - started,
      }),
    ]);

    return {
      output,
      generationId,
      creditsUsed: config.credits,
      creditsRemaining: Math.max(0, res.limit - res.used),
      model,
    };
  } catch (error) {
    // Refund the reservation.
    if (res.usage_id) await admin.from("ai_usage").delete().eq("id", res.usage_id);
    const code = isAppError(error) ? error.code : "PROVIDER_ERROR";
    await admin.from("ai_generation_history").insert({
      organization_id: ctx.organization.id,
      user_id: ctx.userId,
      service: def.id,
      model,
      status: "error",
      error_code: code,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      latency_ms: Date.now() - started,
    });
    if (isAppError(error) || error instanceof ConfigurationError) throw error;
    logger.error(`AI service ${def.id} failed`, error);
    throw new AppError("PROVIDER_ERROR", "The AI service is temporarily unavailable. Your credits were not charged.");
  }
}

function sanitiseInput(input: unknown): Json {
  try {
    return JSON.parse(JSON.stringify(input)) as Json;
  } catch {
    return {};
  }
}
