import type { SocialPostRow } from "@/types/database";

export type LibraryPost = SocialPostRow & {
  post_media?: { media_id: string; position: number }[];
};

export interface LibraryGeneration {
  id: string;
  service: string;
  platform: string | null;
  title: string;
  body_text: string;
  rating: 1 | -1 | null;
  is_saved: boolean;
  created_at: string;
  updated_at: string;
}

export interface LibraryIdea {
  id: string;
  title: string;
  description: string;
  target_audience: string | null;
  platform: string | null;
  format: string | null;
  hook: string | null;
  cta: string | null;
  hashtags: string[];
  rationale: string | null;
  status: "saved" | "used" | "archived";
  created_at: string;
}

export const SERVICE_LABELS: Record<string, string> = {
  content_studio: "AI Studio",
  content_ideas: "Content ideas",
  captions: "Captions",
  hashtags: "Hashtags",
  video_script: "Video script",
  repurpose: "Repurposed",
  profile_optimizer: "Profile review",
  growth_plan: "Growth plan",
  growth_coach: "Coach",
  trends: "Trend ideas",
  competitor_analysis: "Competitor analysis",
  engagement: "Engagement",
  performance_review: "Performance review",
  growth_assessment: "Growth assessment",
};

export function splitTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[\s,]+/)
        .map((t) => t.trim().replace(/^#+/, ""))
        .filter(Boolean),
    ),
  ];
}
