/**
 * Database types for supabase-js.
 *
 * Hand-maintained to mirror supabase/migrations. Once a Supabase project is
 * linked you can replace this file with generated types:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.generated.ts
 */

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type { Json };

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type Timestamps = { created_at: string; updated_at: string };

export type ProfileRow = Timestamps & {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  status: "active" | "suspended";
  timezone: string;
  onboarding_step: number;
  onboarding_completed: boolean;
  current_organization_id: string | null;
};

export type UserPreferencesRow = Timestamps & {
  user_id: string;
  theme: "light" | "dark" | "system";
  notification_settings: NotificationSettings;
};

export type NotificationSettings = {
  in_app: Record<NotificationCategory, boolean>;
  email: Partial<Record<NotificationCategory, boolean>>;
};

export type NotificationCategory =
  | "scheduled_posts"
  | "publish_success"
  | "publish_failure"
  | "subscription"
  | "ai_limits"
  | "weekly_report"
  | "integrations";

export type UserType = "creator" | "influencer" | "business" | "entrepreneur" | "agency" | "social_media_manager";

export type OrganizationRow = Timestamps & {
  id: string;
  name: string;
  type: "personal" | "brand" | "client";
  owner_id: string;
  parent_organization_id: string | null;
  user_type: UserType | null;
  niche: string | null;
  target_audience: string | null;
  location: string | null;
  brand_voice: string | null;
  platforms: string[];
  goals: string[];
  content_resources: string | null;
  posting_frequency: string | null;
  preferred_formats: string[];
  current_followers: Record<string, number>;
};

export type OrgRole = "owner" | "admin" | "editor" | "viewer";

export type OrganizationMemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type SubscriptionPlanRow = Timestamps & {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  currency: string;
  price_is_starting_from: boolean;
  highlighted: boolean;
  features: string[];
  limits: Json;
  marketing_bullets: string[];
  is_active: boolean;
  sort_order: number;
};

export type SubscriptionStatus = "active" | "non_renewing" | "past_due" | "cancelled" | "expired";
export type BillingInterval = "monthly" | "annual";

export type SubscriptionRow = Timestamps & {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  pending_plan_id: string | null;
  pending_billing_interval: BillingInterval | null;
  provider: "paystack" | null;
  provider_customer_code: string | null;
  provider_authorization_enc: string | null;
  renewal_attempts: number;
};

export type PaymentStatus = "pending" | "success" | "failed" | "abandoned" | "refunded";

export type PaymentRow = Timestamps & {
  id: string;
  user_id: string;
  subscription_id: string | null;
  provider: string;
  reference: string;
  purpose: "subscription" | "renewal";
  plan_id: string | null;
  billing_interval: BillingInterval | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  channel: string | null;
  gateway_response: string | null;
  paid_at: string | null;
  verified_at: string | null;
};

export type WebhookEventRow = {
  id: string;
  provider: string;
  event_key: string;
  event_type: string;
  payload: Json;
  processed_at: string | null;
  error: string | null;
  created_at: string;
};

export type SocialAccountStatus = "connected" | "expired" | "revoked" | "error";

export type SocialAccountRow = Timestamps & {
  id: string;
  organization_id: string;
  platform: string;
  provider_account_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  status: SocialAccountStatus;
  scopes: string[];
  last_synced_at: string | null;
  last_error: string | null;
  connected_by: string | null;
};

export type SocialAccountTokenRow = {
  social_account_id: string;
  access_token_enc: string;
  refresh_token_enc: string | null;
  token_type: string | null;
  expires_at: string | null;
  refresh_expires_at: string | null;
  extra_enc: string | null;
  updated_at: string;
};

export type MetricSource = "api" | "manual" | "import" | "demo";

export type SocialAccountMetricRow = {
  id: string;
  organization_id: string;
  social_account_id: string | null;
  platform: string;
  metric_date: string;
  metric_key: string;
  platform_metric_name: string | null;
  value: number;
  source: MetricSource;
  created_by: string | null;
  created_at: string;
};

export type GeneratedContentRow = Timestamps & {
  id: string;
  organization_id: string;
  created_by: string | null;
  service: string;
  platform: string | null;
  title: string;
  content: Json;
  body_text: string;
  input: Json;
  rating: -1 | 1 | null;
  is_saved: boolean;
};

export type ContentIdeaRow = Timestamps & {
  id: string;
  organization_id: string;
  created_by: string | null;
  generated_content_id: string | null;
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
};

export type PostStatus = "draft" | "ready" | "scheduled" | "published" | "failed" | "archived";
export type PostContentType = "text" | "image" | "video" | "carousel" | "thread" | "story";

export type SocialPostRow = Timestamps & {
  id: string;
  organization_id: string;
  created_by: string | null;
  generated_content_id: string | null;
  title: string | null;
  body: string;
  platform: string | null;
  content_type: PostContentType;
  status: PostStatus;
  hashtags: string[];
  tags: string[];
  category: string | null;
};

export type MediaAssetRow = {
  id: string;
  organization_id: string;
  created_by: string | null;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: "image" | "video";
  category: string | null;
  created_at: string;
};

export type PostMediaRow = {
  post_id: string;
  media_id: string;
  organization_id: string;
  position: number;
};

export type ScheduledPostStatus = "scheduled" | "processing" | "published" | "failed" | "manual_required" | "cancelled";

export type ScheduledPostRow = Timestamps & {
  id: string;
  organization_id: string;
  post_id: string;
  social_account_id: string | null;
  platform: string;
  scheduled_at: string;
  timezone: string;
  publish_mode: "auto" | "manual";
  status: ScheduledPostStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  locked_at: string | null;
  provider_post_id: string | null;
  provider_post_url: string | null;
  published_at: string | null;
  idempotency_key: string;
  created_by: string | null;
};

export type GrowthPlanRow = Timestamps & {
  id: string;
  organization_id: string;
  created_by: string | null;
  title: string;
  duration_days: 7 | 30;
  status: "active" | "completed" | "archived";
  summary: string;
  plan: Json;
  is_hypothesis: boolean;
  start_date: string;
};

export type GrowthPlanTaskRow = Timestamps & {
  id: string;
  plan_id: string;
  organization_id: string;
  day_number: number;
  title: string;
  description: string;
  category: string;
  platform: string | null;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
};

export type SavedHashtagRow = {
  id: string;
  organization_id: string;
  created_by: string | null;
  tag: string;
  category: string | null;
  topic: string | null;
  created_at: string;
};

export type CompetitorRow = Timestamps & {
  id: string;
  organization_id: string;
  created_by: string | null;
  name: string;
  platform: string;
  handle: string | null;
  profile_url: string | null;
  notes: string | null;
};

export type CompetitorSnapshotRow = {
  id: string;
  competitor_id: string;
  organization_id: string;
  captured_at: string;
  followers: number | null;
  posts_per_week: number | null;
  avg_engagement: number | null;
  content_themes: string[];
  source: "manual" | "api";
  analysis: Json | null;
  created_by: string | null;
};

export type AIGenerationHistoryRow = {
  id: string;
  organization_id: string | null;
  user_id: string;
  service: string;
  model: string | null;
  status: "success" | "error";
  error_code: string | null;
  generated_content_id: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  created_at: string;
};

export type AIUsageRow = {
  id: string;
  billing_user_id: string;
  user_id: string;
  organization_id: string | null;
  service: string;
  credits: number;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type ActivityLogRow = {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Json;
  ip_address: string | null;
  created_at: string;
};

export type ContactMessageRow = Timestamps & {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved";
};

export type AppSettingRow = { key: string; value: Json; updated_by: string | null; updated_at: string };

export type JobRunRow = {
  id: string;
  job: string;
  status: "running" | "success" | "failed";
  details: Json;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

export type RateLimitRow = { key: string; window_start: string; count: number };

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      user_preferences: Table<UserPreferencesRow>;
      organizations: Table<OrganizationRow>;
      organization_members: Table<OrganizationMemberRow>;
      subscription_plans: Table<SubscriptionPlanRow>;
      subscriptions: Table<SubscriptionRow>;
      payments: Table<PaymentRow>;
      webhook_events: Table<WebhookEventRow>;
      social_accounts: Table<SocialAccountRow>;
      social_account_tokens: Table<SocialAccountTokenRow>;
      social_account_metrics: Table<SocialAccountMetricRow>;
      generated_content: Table<GeneratedContentRow>;
      content_ideas: Table<ContentIdeaRow>;
      social_posts: Table<SocialPostRow>;
      media_assets: Table<MediaAssetRow>;
      post_media: Table<PostMediaRow>;
      scheduled_posts: Table<ScheduledPostRow>;
      growth_plans: Table<GrowthPlanRow>;
      growth_plan_tasks: Table<GrowthPlanTaskRow>;
      saved_hashtags: Table<SavedHashtagRow>;
      competitors: Table<CompetitorRow>;
      competitor_snapshots: Table<CompetitorSnapshotRow>;
      ai_generation_history: Table<AIGenerationHistoryRow>;
      ai_usage: Table<AIUsageRow>;
      notifications: Table<NotificationRow>;
      activity_logs: Table<ActivityLogRow>;
      contact_messages: Table<ContactMessageRow>;
      app_settings: Table<AppSettingRow>;
      job_runs: Table<JobRunRow>;
      rate_limits: Table<RateLimitRow>;
    };
    Views: { [_ in never]: never };
    Functions: {
      reserve_ai_credits: {
        Args: {
          p_billing_user: string;
          p_user: string;
          p_org: string | null;
          p_service: string;
          p_credits: number;
          p_limit: number;
          p_period_start: string;
        };
        Returns: Json;
      };
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
      claim_due_scheduled_posts: {
        Args: { p_limit: number };
        Returns: ScheduledPostRow[];
      };
      is_org_member: { Args: { p_org: string }; Returns: boolean };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
