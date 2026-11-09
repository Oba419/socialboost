import type { BrandContext } from "./types";

/** Shared rules appended to every system prompt. */
export const GUARDRAILS = `
Rules you must always follow:
- Never promise or imply guaranteed virality, guaranteed follower growth or guaranteed sales. Frame outcomes as possibilities and recommend measuring results.
- Recommend only legitimate, sustainable organic growth tactics. Never suggest buying followers, likes or comments, engagement pods, bots, mass follow/unfollow, spam or any platform-manipulation tactic.
- Do not invent statistics, study results, trending data or platform metrics. If you give a number, it must be a clearly labelled estimate or come from data provided in the prompt.
- Respect each platform's conventions (length, tone, format, hashtag norms).
- Keep content original. Do not copy or imitate specific copyrighted works or impersonate real people or brands.
- Avoid irrelevant hashtags and keyword stuffing.
- Write in the requested language. Content must be appropriate for a professional brand.
`.trim();

export function system(role: string): string {
  return `${role}\n\n${GUARDRAILS}`;
}

export function brandBlock(brand: BrandContext): string {
  const lines = [
    brand.userType && `Account type: ${brand.userType}`,
    brand.niche && `Niche / industry: ${brand.niche}`,
    brand.targetAudience && `Target audience: ${brand.targetAudience}`,
    brand.location && `Location / market: ${brand.location}`,
    brand.brandVoice && `Brand voice: ${brand.brandVoice}`,
    brand.goals.length && `Growth goals: ${brand.goals.join(", ")}`,
    brand.platforms.length && `Active platforms: ${brand.platforms.join(", ")}`,
    brand.preferredFormats.length && `Preferred formats: ${brand.preferredFormats.join(", ")}`,
    brand.postingFrequency && `Posting capacity: ${brand.postingFrequency}`,
    brand.contentResources && `Available resources: ${brand.contentResources}`,
  ].filter(Boolean);
  return lines.length ? `Brand profile:\n${lines.join("\n")}` : "Brand profile: not provided.";
}

export function performanceBlock(brand: BrandContext): string {
  return brand.performanceSummary
    ? `Historical performance data (real, from connected or manually entered sources):\n${brand.performanceSummary}`
    : "Historical performance data: NONE AVAILABLE. Treat all recommendations as initial hypotheses to test, and say so.";
}

/** Strip characters that could break prompt structure; cap length. */
export function clean(value: string | undefined | null, max = 2000): string {
  return (value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max).trim();
}
