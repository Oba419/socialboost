import type { FeatureKey } from "./plans";

/**
 * Per-service AI configuration: which entitlement gates it, how many credits a
 * call costs and which model tier it uses. Costs are deliberately coarse so
 * users can reason about them; token usage is still tracked precisely.
 */
export type AIServiceId =
  | "content_studio"
  | "content_ideas"
  | "captions"
  | "hashtags"
  | "video_script"
  | "repurpose"
  | "profile_optimizer"
  | "growth_plan"
  | "growth_coach"
  | "trends"
  | "competitor_analysis"
  | "engagement"
  | "performance_review";

export type ModelTier = "default" | "advanced";

export interface AIServiceConfig {
  id: AIServiceId;
  label: string;
  feature: FeatureKey;
  credits: number;
  tier: ModelTier;
}

export const AI_SERVICES: Record<AIServiceId, AIServiceConfig> = {
  content_studio: { id: "content_studio", label: "AI Studio post", feature: "content_studio", credits: 2, tier: "default" },
  content_ideas: { id: "content_ideas", label: "Content ideas", feature: "content_ideas", credits: 2, tier: "default" },
  captions: { id: "captions", label: "Captions", feature: "caption_generator", credits: 1, tier: "default" },
  hashtags: { id: "hashtags", label: "Hashtag research", feature: "hashtag_research", credits: 1, tier: "default" },
  video_script: { id: "video_script", label: "Video script", feature: "video_scripts", credits: 2, tier: "default" },
  repurpose: { id: "repurpose", label: "Content repurposing", feature: "content_repurposing", credits: 3, tier: "default" },
  profile_optimizer: { id: "profile_optimizer", label: "Profile optimizer", feature: "profile_optimizer", credits: 2, tier: "default" },
  growth_plan: { id: "growth_plan", label: "Growth plan", feature: "growth_plan_7d", credits: 5, tier: "advanced" },
  growth_coach: { id: "growth_coach", label: "Growth coach", feature: "growth_coach", credits: 1, tier: "default" },
  trends: { id: "trends", label: "Trend ideas", feature: "trend_discovery", credits: 2, tier: "default" },
  competitor_analysis: { id: "competitor_analysis", label: "Competitor analysis", feature: "competitor_research", credits: 2, tier: "default" },
  engagement: { id: "engagement", label: "Engagement assistant", feature: "engagement_assistant", credits: 1, tier: "default" },
  performance_review: { id: "performance_review", label: "Performance review", feature: "analytics", credits: 3, tier: "advanced" },
};

export const AI_OPTIONS = {
  tones: ["Friendly", "Professional", "Witty", "Inspirational", "Bold", "Educational", "Conversational", "Luxury"],
  objectives: [
    "Increase reach",
    "Improve engagement",
    "Build authority",
    "Generate leads",
    "Promote products",
    "Educate audiences",
    "Build a community",
    "Increase profile visits",
  ],
  lengths: ["Short", "Medium", "Long"],
  languages: ["English", "Nigerian Pidgin", "French", "Spanish", "Portuguese", "Yoruba", "Igbo", "Hausa", "Swahili", "Arabic"],
  formats: ["Single image post", "Carousel", "Short video / Reel", "Long-form video", "Text post", "Thread", "Story", "Live session", "Pin"],
  captionStyles: ["Short", "Long", "Conversational", "Professional", "Storytelling", "Promotional", "Educational"],
  videoDurations: ["15 seconds", "30 seconds", "60 seconds", "90 seconds", "3 minutes", "5 minutes", "10 minutes"],
  ideaScopes: [
    "Daily ideas",
    "Weekly ideas",
    "Monthly content calendar",
    "Trending-topic concepts",
    "Educational posts",
    "Entertaining posts",
    "Storytelling content",
    "Promotional content",
    "Short-form video ideas",
    "Content series",
  ],
} as const;
