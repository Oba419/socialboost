/** Shape of `growth_plans.plan` (the validated AI output). */
export interface GrowthPlanContent {
  title: string;
  summary: string;
  isHypothesis: boolean;
  postingFrequency: { platform: string; frequency: string; formats: string[] }[];
  days: { day: number; theme: string; tasks: { title: string; description: string; category: string; platform: string | null }[] }[];
  weeklyReviews: { week: number; checkpoints: string[] }[];
  targets: { metric: string; target: string; howToMeasure: string }[];
  risksAndNotes: string[];
}
