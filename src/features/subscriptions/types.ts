import type { BillingInterval, SubscriptionStatus } from "@/types/database";

export interface PlanCardData {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  startingFrom: boolean;
  highlighted: boolean;
  bullets: string[];
  sortOrder: number;
}

export interface SubscriptionView {
  planId: string;
  effectivePlanId: string;
  effectivePlanName: string;
  status: SubscriptionStatus;
  interval: BillingInterval;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  pendingPlanId: string | null;
  pendingInterval: BillingInterval | null;
  card: string | null;
}

export interface UsageLimit {
  used: number;
  limit: number | null;
}

export interface UsageView {
  planName: string;
  creditsUsed: number;
  creditsLimit: number;
  periodEnd: string;
  savedItems: UsageLimit;
  socialAccounts: UsageLimit;
  scheduledPosts: UsageLimit;
}
