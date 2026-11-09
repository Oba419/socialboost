import { describe, expect, it } from "vitest";
import { isAIConfigured, activeAIProvider } from "@/lib/env";
import { generateStructured } from "@/lib/ai/runner";
import { captionsService } from "@/lib/ai/services/captions";
import { contentIdeasService } from "@/lib/ai/services/content-ideas";
import { hashtagsService } from "@/lib/ai/services/hashtags";
import { profileOptimizerService } from "@/lib/ai/services/profile-optimizer";
import { repurposeService } from "@/lib/ai/services/repurpose";
import { growthPlanService } from "@/lib/ai/services/growth-plan";
import type { BrandContext } from "@/lib/ai/types";

/**
 * Sends REAL requests to the configured AI provider with each service's real
 * system prompt + strict schema, through the same code path the app uses.
 * Covers the structurally hardest schemas (nested arrays, nullables, enums).
 */
const brand: BrandContext = {
  userType: "business",
  niche: "Handmade skincare",
  targetAudience: "Women 22-35 in Lagos who care about natural ingredients",
  location: "Lagos, Nigeria",
  brandVoice: "Warm, knowledgeable, playful",
  goals: ["Increase engagement", "Generate leads"],
  platforms: ["Instagram", "TikTok"],
  preferredFormats: ["Reels", "Carousels"],
  postingFrequency: "4 posts per week",
  contentResources: "Smartphone, ring light",
  performanceSummary: null,
};

describe.skipIf(!isAIConfigured())(`live AI provider (${activeAIProvider() ?? "none"})`, () => {
  it("captions", async () => {
    const out = await generateStructured(
      captionsService,
      captionsService.inputSchema.parse({ platform: "instagram", description: "New shea butter body cream launch", styles: ["Short", "Storytelling"] }),
      brand,
    );
    expect(out.captions.length).toBeGreaterThanOrEqual(2);
    expect(out.captions[0].caption.length).toBeGreaterThan(10);
  });

  it("content ideas (nullable fields)", async () => {
    const out = await generateStructured(
      contentIdeasService,
      contentIdeasService.inputSchema.parse({ scope: "Weekly ideas", count: 3 }),
      brand,
    );
    expect(out.ideas.length).toBeGreaterThanOrEqual(3);
    expect(out.ideas[0].title).toBeTruthy();
  });

  it("hashtags (grouped + disclaimer)", async () => {
    const out = await generateStructured(
      hashtagsService,
      hashtagsService.inputSchema.parse({ topic: "natural skincare routine", platform: "instagram" }),
      brand,
    );
    expect(out.broad.length).toBeGreaterThan(0);
    expect(out.disclaimer.length).toBeGreaterThan(10);
  });

  it("profile optimizer (nested scored objects)", async () => {
    const out = await generateStructured(
      profileOptimizerService,
      profileOptimizerService.inputSchema.parse({ platform: "instagram", bio: "We make skincare. DM to order." }),
      brand,
    );
    expect(out.overallScore).toBeGreaterThanOrEqual(0);
    expect(out.alternativeBios.length).toBeGreaterThan(0);
  });

  it("repurpose (multi-part versions)", async () => {
    const out = await generateStructured(
      repurposeService,
      repurposeService.inputSchema.parse({ original: "Five ways to protect your skin during harmattan.", targets: ["instagram_carousel", "x_thread"] }),
      brand,
    );
    expect(out.versions.length).toBe(2);
  });

  it("7-day growth plan (largest schema, enums + nullable)", async () => {
    const out = await generateStructured(growthPlanService, growthPlanService.inputSchema.parse({ durationDays: 7 }), brand);
    expect(out.days.length).toBe(7);
    expect(out.isHypothesis).toBe(true);
  });
});
