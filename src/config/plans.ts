/**
 * Default subscription plan catalogue.
 *
 * This file seeds the `subscription_plans` table (see supabase/seed.sql) and is
 * the fallback when the database is unavailable. At runtime the database row is
 * the source of truth, so administrators can change prices and limits without a
 * deploy. Never check plan names in feature code: use `src/lib/entitlements`.
 *
 * Amounts are stored in the smallest currency unit (kobo for NGN).
 */

export const FEATURE_KEYS = [
  "content_ideas",
  "caption_generator",
  "hashtag_research",
  "video_scripts",
  "content_studio",
  "content_repurposing",
  "content_calendar",
  "growth_plan_7d",
  "growth_plan_30d",
  "growth_coach",
  "profile_optimizer",
  "trend_discovery",
  "competitor_research",
  "engagement_assistant",
  "analytics",
  "advanced_reporting",
  "report_export",
  "multi_brand",
  "team_members",
  "client_workspaces",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type PlanId = "free" | "starter" | "creator_pro" | "business" | "agency";

export interface PlanLimits {
  /** AI credits per billing period. */
  aiCreditsPerPeriod: number;
  /** Saved items (generated content + ideas + library assets). null = unlimited. */
  savedItems: number | null;
  socialAccounts: number;
  scheduledPostsPerMonth: number | null;
  workspaces: number;
  teamMembers: number;
  mediaStorageMb: number;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  priceMonthly: number; // kobo
  priceAnnual: number; // kobo, billed yearly
  currency: string;
  /** Agency is "from" pricing. */
  priceIsStartingFrom?: boolean;
  highlighted?: boolean;
  features: FeatureKey[];
  limits: PlanLimits;
  marketingBullets: string[];
  sortOrder: number;
}

const naira = (n: number) => n * 100;
/** Annual billing: pay for 10 months, get 12. Adjust per plan in the DB if needed. */
const annual = (monthlyNaira: number) => naira(monthlyNaira * 10);

const FREE_FEATURES: FeatureKey[] = ["content_ideas", "caption_generator", "hashtag_research"];
const STARTER_FEATURES: FeatureKey[] = [
  ...FREE_FEATURES,
  "video_scripts",
  "content_studio",
  "content_calendar",
  "growth_plan_7d",
  "engagement_assistant",
];
const PRO_FEATURES: FeatureKey[] = [
  ...STARTER_FEATURES,
  "content_repurposing",
  "growth_plan_30d",
  "growth_coach",
  "profile_optimizer",
  "trend_discovery",
  "competitor_research",
  "analytics",
];
const BUSINESS_FEATURES: FeatureKey[] = [
  ...PRO_FEATURES,
  "advanced_reporting",
  "report_export",
  "multi_brand",
  "team_members",
];
const AGENCY_FEATURES: FeatureKey[] = [...BUSINESS_FEATURES, "client_workspaces"];

export const DEFAULT_PLANS: PlanDefinition[] = [
  {
    id: "free",
    name: "Free",
    description: "Try the essentials and plan your first posts.",
    priceMonthly: 0,
    priceAnnual: 0,
    currency: "NGN",
    features: FREE_FEATURES,
    limits: {
      aiCreditsPerPeriod: 30,
      savedItems: 50,
      socialAccounts: 2,
      scheduledPostsPerMonth: 0,
      workspaces: 1,
      teamMembers: 1,
      mediaStorageMb: 100,
    },
    marketingBullets: [
      "30 AI credits / month",
      "Content ideas, captions & hashtags",
      "Up to 50 saved items",
      "Basic dashboard",
    ],
    sortOrder: 0,
  },
  {
    id: "starter",
    name: "Starter",
    description: "For creators building a consistent posting habit.",
    priceMonthly: naira(5_000),
    priceAnnual: annual(5_000),
    currency: "NGN",
    features: STARTER_FEATURES,
    limits: {
      aiCreditsPerPeriod: 200,
      savedItems: 500,
      socialAccounts: 5,
      scheduledPostsPerMonth: 60,
      workspaces: 1,
      teamMembers: 1,
      mediaStorageMb: 1_000,
    },
    marketingBullets: [
      "200 AI credits / month",
      "Content calendar & scheduling",
      "Video scripts & AI Studio",
      "7-day growth plans",
    ],
    sortOrder: 1,
  },
  {
    id: "creator_pro",
    name: "Creator Pro",
    description: "Advanced AI and analytics for serious creators.",
    priceMonthly: naira(12_000),
    priceAnnual: annual(12_000),
    currency: "NGN",
    highlighted: true,
    features: PRO_FEATURES,
    limits: {
      aiCreditsPerPeriod: 1_000,
      savedItems: null,
      socialAccounts: 10,
      scheduledPostsPerMonth: 300,
      workspaces: 1,
      teamMembers: 1,
      mediaStorageMb: 5_000,
    },
    marketingBullets: [
      "1,000 AI credits / month",
      "Content repurposing",
      "30-day growth plans & AI coach",
      "Analytics, trends & competitor research",
    ],
    sortOrder: 2,
  },
  {
    id: "business",
    name: "Business",
    description: "Multi-brand management with your team.",
    priceMonthly: naira(25_000),
    priceAnnual: annual(25_000),
    currency: "NGN",
    features: BUSINESS_FEATURES,
    limits: {
      aiCreditsPerPeriod: 3_000,
      savedItems: null,
      socialAccounts: 25,
      scheduledPostsPerMonth: null,
      workspaces: 3,
      teamMembers: 5,
      mediaStorageMb: 20_000,
    },
    marketingBullets: [
      "3,000 AI credits / month",
      "Up to 3 brands",
      "5 team members",
      "Advanced reporting & exports",
    ],
    sortOrder: 3,
  },
  {
    id: "agency",
    name: "Agency",
    description: "Client workspaces, team management and reporting.",
    priceMonthly: naira(50_000),
    priceAnnual: annual(50_000),
    currency: "NGN",
    priceIsStartingFrom: true,
    features: AGENCY_FEATURES,
    limits: {
      aiCreditsPerPeriod: 10_000,
      savedItems: null,
      socialAccounts: 100,
      scheduledPostsPerMonth: null,
      workspaces: 25,
      teamMembers: 20,
      mediaStorageMb: 100_000,
    },
    marketingBullets: [
      "10,000 AI credits / month",
      "Up to 25 client workspaces",
      "20 team members",
      "Client reporting",
    ],
    sortOrder: 4,
  },
];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  content_ideas: "Content idea generator",
  caption_generator: "Caption generator",
  hashtag_research: "Hashtag research",
  video_scripts: "Video script generator",
  content_studio: "AI Content Studio",
  content_repurposing: "Content repurposing",
  content_calendar: "Content calendar & scheduling",
  growth_plan_7d: "7-day growth plans",
  growth_plan_30d: "30-day growth plans",
  growth_coach: "AI growth coach",
  profile_optimizer: "Profile optimizer",
  trend_discovery: "Trend discovery",
  competitor_research: "Competitor research",
  engagement_assistant: "Engagement assistant",
  analytics: "Analytics",
  advanced_reporting: "Advanced reporting",
  report_export: "Report export",
  multi_brand: "Multi-brand workspaces",
  team_members: "Team members",
  client_workspaces: "Client workspaces",
};

export function getDefaultPlan(id: string): PlanDefinition | undefined {
  return DEFAULT_PLANS.find((p) => p.id === id);
}

export function formatMoney(amountMinor: number, currency = "NGN"): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}
