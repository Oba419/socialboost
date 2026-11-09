import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import { AI_SERVICES } from "@/config/ai";
import { DIRECT_AI_SERVICES } from "@/lib/ai/registry";
import { GUARDRAILS } from "@/lib/ai/prompts";
import { growthPlanService } from "@/lib/ai/services/growth-plan";
import { competitorAnalysisService } from "@/lib/ai/services/competitor-analysis";
import { performanceReviewService } from "@/lib/ai/services/performance-review";
import { captionsService } from "@/lib/ai/services/captions";
import { engagementService } from "@/lib/ai/services/engagement";
import { contentStudioService } from "@/lib/ai/services/content-studio";
import { formatPerformanceSummary } from "@/lib/ai/context";
import type { AIServiceDefinition, BrandContext } from "@/lib/ai/types";

const ALL = [
  ...Object.values(DIRECT_AI_SERVICES),
  growthPlanService,
  competitorAnalysisService,
  performanceReviewService,
] as unknown as AIServiceDefinition[];

const brand: BrandContext = {
  userType: "creator",
  niche: "Skincare",
  targetAudience: "Women 20-35 in Lagos",
  location: "Lagos, Nigeria",
  brandVoice: "Warm and expert",
  goals: ["Increase engagement"],
  platforms: ["Instagram"],
  preferredFormats: ["Reels"],
  postingFrequency: "3x per week",
  contentResources: "Phone camera",
  performanceSummary: null,
};

describe("AI service definitions", () => {
  it("every service has a config entry", () => {
    for (const def of ALL) expect(AI_SERVICES[def.id]).toBeDefined();
  });

  it("every system prompt includes the safety guardrails", () => {
    for (const def of ALL) expect(def.systemPrompt).toContain(GUARDRAILS);
  });

  it("every output schema converts to an OpenAI strict structured-output format", () => {
    for (const def of ALL) {
      const format = zodTextFormat(def.outputSchema, `${def.id}_output`);
      expect(format.type).toBe("json_schema");
      expect(format.strict).toBe(true);
      // Strict mode requires every property to be listed as required.
      const schema = format.schema as { properties?: Record<string, unknown>; required?: string[] };
      expect(Object.keys(schema.properties ?? {}).sort()).toEqual([...(schema.required ?? [])].sort());
    }
  });

  it("guardrails forbid guaranteed growth and fake engagement", () => {
    expect(GUARDRAILS).toMatch(/guaranteed/i);
    expect(GUARDRAILS).toMatch(/buying followers/i);
  });
});

describe("input validation", () => {
  it("captions: requires a description and at least one style", () => {
    expect(captionsService.inputSchema.safeParse({ platform: "instagram", description: "", styles: [] }).success).toBe(false);
    expect(
      captionsService.inputSchema.safeParse({ platform: "instagram", description: "Launch day", styles: ["Short"] }).success,
    ).toBe(true);
  });
  it("rejects unknown platforms", () => {
    expect(captionsService.inputSchema.safeParse({ platform: "myspace", description: "x", styles: ["Short"] }).success).toBe(false);
  });
  it("engagement: reply drafts require a comment", () => {
    expect(engagementService.inputSchema.safeParse({ mode: "reply_drafts", platform: "x" }).success).toBe(false);
    expect(engagementService.inputSchema.safeParse({ mode: "reply_drafts", platform: "x", comment: "Love this!" }).success).toBe(true);
  });
  it("growth plan: only 7 or 30 days", () => {
    expect(growthPlanService.inputSchema.safeParse({ durationDays: 14 }).success).toBe(false);
    expect(growthPlanService.inputSchema.safeParse({ durationDays: 30 }).success).toBe(true);
  });
});

describe("prompt construction", () => {
  it("includes brand context and user input, and strips control characters", () => {
    const input = contentStudioService.inputSchema.parse({
      platform: "linkedin",
      topic: "Hiring\u0000 tips",
      format: "Text post",
      tone: "Professional",
      objective: "Build authority",
    });
    const prompt = contentStudioService.buildUserPrompt(input, brand);
    expect(prompt).toContain("Skincare");
    expect(prompt).toContain("LinkedIn");
    expect(prompt).toContain("Hiring tips");
    expect(prompt).not.toContain("\u0000");
  });
  it("marks recommendations as hypotheses when no performance data exists", () => {
    const prompt = growthPlanService.buildUserPrompt({ durationDays: 7 }, brand);
    expect(prompt).toMatch(/NONE AVAILABLE/);
    expect(prompt).toMatch(/hypothes/i);
  });
});

describe("performance summary", () => {
  it("summarises per platform without mixing metrics", () => {
    const text = formatPerformanceSummary(
      [
        { platform: "instagram", metric_key: "followers", metric_date: "2026-11-01", value: 1000, source: "api" },
        { platform: "instagram", metric_key: "followers", metric_date: "2026-11-07", value: 1080, source: "api" },
        { platform: "instagram", metric_key: "reach", metric_date: "2026-11-01", value: 500, source: "api" },
        { platform: "instagram", metric_key: "reach", metric_date: "2026-11-02", value: 300, source: "api" },
        { platform: "linkedin", metric_key: "impressions", metric_date: "2026-11-02", value: 200, source: "manual" },
      ],
      30,
    );
    expect(text).toContain("followers: 1000 → 1080 (+80)");
    expect(text).toContain("reach: 800 total");
    expect(text).toMatch(/LinkedIn \[source: manual\]: impressions: 200 total/);
    expect(text).toMatch(/not comparable across platforms/);
  });
});
