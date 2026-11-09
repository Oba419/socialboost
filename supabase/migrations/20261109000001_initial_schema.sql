-- =============================================================================
-- SocialBoost AI — initial schema
--
-- Ownership model
--   * Every user gets a personal organization (workspace) on signup.
--   * All content lives in an organization; access = membership.
--   * Billing (subscription, AI credits) belongs to the organization OWNER.
--   * Secrets (social tokens, payment authorizations) are only reachable with
--     the service role: no RLS policy grants authenticated users access.
--   * Admin operations run server-side with the service role after an explicit
--     role check; `profiles.role` cannot be changed by users (column grants).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Utility: updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profiles & preferences
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  timezone text not null default 'Africa/Lagos',
  onboarding_step smallint not null default 1 check (onboarding_step between 1 and 8),
  onboarding_completed boolean not null default false,
  current_organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  notification_settings jsonb not null default jsonb_build_object(
    'in_app', jsonb_build_object(
      'scheduled_posts', true, 'publish_success', true, 'publish_failure', true,
      'subscription', true, 'ai_limits', true, 'weekly_report', true, 'integrations', true
    ),
    'email', jsonb_build_object(
      'publish_failure', true, 'subscription', true, 'weekly_report', false
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Organizations (workspaces / brands / agency clients)
-- -----------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  type text not null default 'personal' check (type in ('personal', 'brand', 'client')),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  parent_organization_id uuid references public.organizations (id) on delete cascade,
  -- Brand profile used to personalise AI output (collected in onboarding).
  user_type text check (user_type in ('creator', 'influencer', 'business', 'entrepreneur', 'agency', 'social_media_manager')),
  niche text,
  target_audience text,
  location text,
  brand_voice text,
  platforms text[] not null default '{}',
  goals text[] not null default '{}',
  content_resources text,
  posting_frequency text,
  preferred_formats text[] not null default '{}',
  current_followers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organizations_owner_idx on public.organizations (owner_id);
create index organizations_parent_idx on public.organizations (parent_organization_id);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

alter table public.profiles
  add constraint profiles_current_org_fk
  foreign key (current_organization_id) references public.organizations (id) on delete set null;

-- -----------------------------------------------------------------------------
-- RLS helper functions (SECURITY DEFINER to avoid recursive policy evaluation)
-- -----------------------------------------------------------------------------
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_org and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_org and user_id = auth.uid()
      and role in ('owner', 'admin', 'editor')
  );
$$;

create or replace function public.can_manage_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_org and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- current_organization_id must point at an org the user belongs to.
create or replace function public.validate_current_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.current_organization_id is not null and not exists (
    select 1 from public.organization_members
    where organization_id = new.current_organization_id and user_id = new.id
  ) then
    raise exception 'Not a member of organization %', new.current_organization_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Subscription plans, subscriptions, payments
-- -----------------------------------------------------------------------------
create table public.subscription_plans (
  id text primary key,
  name text not null,
  description text not null default '',
  price_monthly bigint not null check (price_monthly >= 0),
  price_annual bigint not null check (price_annual >= 0),
  currency text not null default 'NGN',
  price_is_starting_from boolean not null default false,
  highlighted boolean not null default false,
  features text[] not null default '{}',
  limits jsonb not null,
  marketing_bullets text[] not null default '{}',
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  plan_id text not null references public.subscription_plans (id),
  status text not null default 'active'
    check (status in ('active', 'non_renewing', 'past_due', 'cancelled', 'expired')),
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly', 'annual')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  pending_plan_id text references public.subscription_plans (id),
  pending_billing_interval text check (pending_billing_interval in ('monthly', 'annual')),
  provider text check (provider in ('paystack')),
  provider_customer_code text,
  -- Reusable card authorization for renewals. Encrypted (AES-256-GCM) by the app.
  provider_authorization_enc text,
  renewal_attempts smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_period_end_idx on public.subscriptions (current_period_end)
  where status in ('active', 'non_renewing', 'past_due');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  provider text not null default 'paystack',
  reference text not null unique,
  purpose text not null default 'subscription' check (purpose in ('subscription', 'renewal')),
  plan_id text references public.subscription_plans (id),
  billing_interval text check (billing_interval in ('monthly', 'annual')),
  amount bigint not null check (amount >= 0),
  currency text not null default 'NGN',
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed', 'abandoned', 'refunded')),
  channel text,
  gateway_response text,
  paid_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_status_idx on public.payments (status, created_at desc);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, event_key)
);

-- -----------------------------------------------------------------------------
-- Social accounts, tokens, metrics
-- -----------------------------------------------------------------------------
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x', 'pinterest', 'threads')),
  provider_account_id text not null,
  username text,
  display_name text,
  avatar_url text,
  account_type text,
  status text not null default 'connected' check (status in ('connected', 'expired', 'revoked', 'error')),
  scopes text[] not null default '{}',
  last_synced_at timestamptz,
  last_error text,
  connected_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, platform, provider_account_id)
);
create index social_accounts_org_idx on public.social_accounts (organization_id);

-- Encrypted credentials. NO RLS policies: service role only.
create table public.social_account_tokens (
  social_account_id uuid primary key references public.social_accounts (id) on delete cascade,
  access_token_enc text not null,
  refresh_token_enc text,
  token_type text,
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  extra_enc text, -- encrypted JSON for platform-specific secrets (e.g. page tokens)
  updated_at timestamptz not null default now()
);

create table public.social_account_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  social_account_id uuid references public.social_accounts (id) on delete cascade,
  platform text not null,
  metric_date date not null,
  metric_key text not null,         -- internal normalized key, e.g. 'followers'
  platform_metric_name text,        -- original platform name, e.g. 'follower_count'
  value numeric not null,
  source text not null check (source in ('api', 'manual', 'import', 'demo')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
-- One value per account/day/metric/source. social_account_id may be null for
-- manually tracked platforms, so coalesce it into the uniqueness key.
create unique index social_account_metrics_unique
  on public.social_account_metrics (
    organization_id, platform,
    coalesce(social_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
    metric_date, metric_key, source
  );
create index social_account_metrics_lookup on public.social_account_metrics (organization_id, metric_date);

-- -----------------------------------------------------------------------------
-- Content
-- -----------------------------------------------------------------------------
create table public.generated_content (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  service text not null,
  platform text,
  title text not null,
  content jsonb not null,
  body_text text not null default '',
  input jsonb not null default '{}'::jsonb,
  rating smallint check (rating in (-1, 1)),
  is_saved boolean not null default true,
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body_text, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index generated_content_org_idx on public.generated_content (organization_id, created_at desc);
create index generated_content_search_idx on public.generated_content using gin (search);

create table public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  generated_content_id uuid references public.generated_content (id) on delete set null,
  title text not null,
  description text not null default '',
  target_audience text,
  platform text,
  format text,
  hook text,
  cta text,
  hashtags text[] not null default '{}',
  rationale text,
  status text not null default 'saved' check (status in ('saved', 'used', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_ideas_org_idx on public.content_ideas (organization_id, created_at desc);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  generated_content_id uuid references public.generated_content (id) on delete set null,
  title text,
  body text not null default '',
  platform text,
  content_type text not null default 'text' check (content_type in ('text', 'image', 'video', 'carousel', 'thread', 'story')),
  status text not null default 'draft' check (status in ('draft', 'ready', 'scheduled', 'published', 'failed', 'archived')),
  hashtags text[] not null default '{}',
  tags text[] not null default '{}',
  category text,
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index social_posts_org_idx on public.social_posts (organization_id, updated_at desc);
create index social_posts_search_idx on public.social_posts using gin (search);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  kind text not null check (kind in ('image', 'video')),
  category text,
  created_at timestamptz not null default now()
);
create index media_assets_org_idx on public.media_assets (organization_id, created_at desc);

create table public.post_media (
  post_id uuid not null references public.social_posts (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  position smallint not null default 0,
  primary key (post_id, media_id)
);

create table public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  post_id uuid not null references public.social_posts (id) on delete cascade,
  social_account_id uuid references public.social_accounts (id) on delete set null,
  platform text not null,
  scheduled_at timestamptz not null,       -- always stored in UTC
  timezone text not null,                  -- IANA zone the user picked, for display
  publish_mode text not null default 'manual' check (publish_mode in ('auto', 'manual')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'processing', 'published', 'failed', 'manual_required', 'cancelled')),
  attempts smallint not null default 0,
  max_attempts smallint not null default 3,
  next_attempt_at timestamptz,
  last_error text,
  locked_at timestamptz,
  provider_post_id text,
  provider_post_url text,
  published_at timestamptz,
  idempotency_key uuid not null default gen_random_uuid() unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index scheduled_posts_org_time_idx on public.scheduled_posts (organization_id, scheduled_at);
create index scheduled_posts_due_idx on public.scheduled_posts (scheduled_at)
  where status = 'scheduled';

-- -----------------------------------------------------------------------------
-- Growth plans
-- -----------------------------------------------------------------------------
create table public.growth_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  title text not null,
  duration_days smallint not null check (duration_days in (7, 30)),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  summary text not null default '',
  plan jsonb not null,
  is_hypothesis boolean not null default true, -- true when no historical data was available
  start_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index growth_plans_org_idx on public.growth_plans (organization_id, created_at desc);

create table public.growth_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.growth_plans (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 31),
  title text not null,
  description text not null default '',
  category text not null default 'content',
  platform text,
  is_completed boolean not null default false,
  completed_at timestamptz,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index growth_plan_tasks_plan_idx on public.growth_plan_tasks (plan_id, day_number, sort_order);

-- -----------------------------------------------------------------------------
-- Research
-- -----------------------------------------------------------------------------
create table public.saved_hashtags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  tag text not null check (tag ~ '^#?[[:alnum:]_]{1,100}$'),
  category text,
  topic text,
  created_at timestamptz not null default now(),
  unique (organization_id, tag)
);

create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  name text not null,
  platform text not null,
  handle text,
  profile_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index competitors_org_idx on public.competitors (organization_id);

create table public.competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  captured_at timestamptz not null default now(),
  followers bigint,
  posts_per_week numeric,
  avg_engagement numeric,
  content_themes text[] not null default '{}',
  source text not null default 'manual' check (source in ('manual', 'api')),
  analysis jsonb,
  created_by uuid references public.profiles (id) on delete set null
);
create index competitor_snapshots_idx on public.competitor_snapshots (competitor_id, captured_at desc);

-- -----------------------------------------------------------------------------
-- AI usage & history
-- -----------------------------------------------------------------------------
create table public.ai_generation_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  service text not null,
  model text,
  status text not null check (status in ('success', 'error')),
  error_code text,
  generated_content_id uuid references public.generated_content (id) on delete set null,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  created_at timestamptz not null default now()
);
create index ai_generation_history_user_idx on public.ai_generation_history (user_id, created_at desc);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  billing_user_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  service text not null,
  credits integer not null check (credits >= 0),
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
create index ai_usage_billing_idx on public.ai_usage (billing_user_id, created_at);

-- Atomic credit reservation. Serialised per billing user with an advisory lock
-- so concurrent requests cannot overspend. Service role only.
create or replace function public.reserve_ai_credits(
  p_billing_user uuid,
  p_user uuid,
  p_org uuid,
  p_service text,
  p_credits integer,
  p_limit integer,
  p_period_start timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_billing_user::text, 0));
  select coalesce(sum(credits), 0) into v_used
    from public.ai_usage
    where billing_user_id = p_billing_user and created_at >= p_period_start;
  if v_used + p_credits > p_limit then
    return jsonb_build_object('allowed', false, 'used', v_used, 'limit', p_limit);
  end if;
  insert into public.ai_usage (billing_user_id, user_id, organization_id, service, credits)
    values (p_billing_user, p_user, p_org, p_service, p_credits)
    returning id into v_id;
  return jsonb_build_object('allowed', true, 'used', v_used + p_credits, 'limit', p_limit, 'usage_id', v_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- Notifications, activity, support, settings, jobs, rate limits
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete cascade,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index activity_logs_user_idx on public.activity_logs (user_id, created_at desc);
create index activity_logs_org_idx on public.activity_logs (organization_id, created_at desc);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  status text not null check (status in ('running', 'success', 'failed')),
  details jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index job_runs_idx on public.job_runs (job, started_at desc);

create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);

-- Fixed-window rate limiter. Returns true when the request is allowed.
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
    values (p_key, now(), 1)
  on conflict (key) do update
    set count = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else r.count + 1 end,
        window_start = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else r.window_start end
  returning count into v_count;
  return v_count <= p_max;
end;
$$;

-- Claim due auto-publish jobs exactly once (SKIP LOCKED). Service role only.
create or replace function public.claim_due_scheduled_posts(p_limit integer)
returns setof public.scheduled_posts
language sql
security definer
set search_path = public
as $$
  update public.scheduled_posts sp
     set status = 'processing', locked_at = now(), attempts = sp.attempts + 1
   where sp.id in (
     select id from public.scheduled_posts
      where status = 'scheduled'
        and publish_mode = 'auto'
        and scheduled_at <= now()
        and (next_attempt_at is null or next_attempt_at <= now())
      order by scheduled_at
      limit p_limit
      for update skip locked
   )
  returning sp.*;
$$;

-- -----------------------------------------------------------------------------
-- New-user bootstrap: profile, preferences, personal workspace, free plan
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_name text;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));

  insert into public.profiles (id, email, full_name, avatar_url)
    values (new.id, new.email, v_name, new.raw_user_meta_data ->> 'avatar_url');

  insert into public.user_preferences (user_id) values (new.id);

  insert into public.organizations (name, type, owner_id)
    values (coalesce(nullif(v_name, ''), 'My') || '''s workspace', 'personal', new.id)
    returning id into v_org;

  insert into public.organization_members (organization_id, user_id, role)
    values (v_org, new.id, 'owner');

  update public.profiles set current_organization_id = v_org where id = new.id;

  insert into public.subscriptions (user_id, plan_id, status, billing_interval, current_period_start, current_period_end)
    values (new.id, 'free', 'active', 'monthly', now(), null);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync with auth.users.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'user_preferences', 'organizations', 'subscription_plans', 'subscriptions',
    'payments', 'social_accounts', 'generated_content', 'content_ideas', 'social_posts',
    'scheduled_posts', 'growth_plans', 'growth_plan_tasks', 'competitors', 'contact_messages'
  ] loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

create trigger profiles_validate_current_org
  before insert or update of current_organization_id on public.profiles
  for each row execute function public.validate_current_org();

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_account_tokens enable row level security;
alter table public.social_account_metrics enable row level security;
alter table public.generated_content enable row level security;
alter table public.content_ideas enable row level security;
alter table public.social_posts enable row level security;
alter table public.media_assets enable row level security;
alter table public.post_media enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.growth_plans enable row level security;
alter table public.growth_plan_tasks enable row level security;
alter table public.saved_hashtags enable row level security;
alter table public.competitors enable row level security;
alter table public.competitor_snapshots enable row level security;
alter table public.ai_generation_history enable row level security;
alter table public.ai_usage enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.contact_messages enable row level security;
alter table public.app_settings enable row level security;
alter table public.job_runs enable row level security;
alter table public.rate_limits enable row level security;

-- Profiles: read/update self. Role/status are NOT user-updatable (column grants below).
create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- Teammates can see each other's basic profile within a shared organization.
create policy profiles_select_teammates on public.profiles for select using (
  exists (
    select 1 from public.organization_members a
    join public.organization_members b on a.organization_id = b.organization_id
    where a.user_id = auth.uid() and b.user_id = profiles.id
  )
);

revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url, timezone, onboarding_step, onboarding_completed, current_organization_id)
  on public.profiles to authenticated;

create policy prefs_all_self on public.user_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Organizations
create policy orgs_select_member on public.organizations for select using (public.is_org_member(id));
create policy orgs_update_manager on public.organizations for update
  using (public.can_manage_org(id)) with check (public.can_manage_org(id));
-- Creation/deletion of extra workspaces goes through the server (plan-limited).

create policy org_members_select on public.organization_members for select
  using (public.is_org_member(organization_id));

-- Plans are public catalogue data.
create policy plans_select_all on public.subscription_plans for select using (is_active or public.is_admin());

-- Billing: users can read their own; all writes are server-side (service role).
create policy subscriptions_select_self on public.subscriptions for select using (user_id = auth.uid());
create policy payments_select_self on public.payments for select using (user_id = auth.uid());

-- Social accounts: members read; writes are server-side (OAuth flow).
create policy social_accounts_select on public.social_accounts for select using (public.is_org_member(organization_id));
-- social_account_tokens: intentionally no policies.

create policy metrics_select on public.social_account_metrics for select using (public.is_org_member(organization_id));
create policy metrics_insert_manual on public.social_account_metrics for insert
  with check (public.can_edit_org(organization_id) and source in ('manual', 'import') and created_by = auth.uid());
create policy metrics_delete_manual on public.social_account_metrics for delete
  using (public.can_edit_org(organization_id) and source in ('manual', 'import'));

-- Standard org-scoped content tables: members read, editors write.
do $$
declare t text;
begin
  foreach t in array array[
    'generated_content', 'content_ideas', 'social_posts', 'media_assets', 'post_media',
    'growth_plans', 'growth_plan_tasks', 'saved_hashtags', 'competitors', 'competitor_snapshots'
  ] loop
    execute format('create policy %1$s_select on public.%1$I for select using (public.is_org_member(organization_id))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert with check (public.can_edit_org(organization_id))', t);
    execute format('create policy %1$s_update on public.%1$I for update using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete using (public.can_edit_org(organization_id))', t);
  end loop;
end $$;

-- Scheduled posts: editors can create/cancel, but publishing state is server-owned.
create policy scheduled_select on public.scheduled_posts for select using (public.is_org_member(organization_id));
create policy scheduled_insert on public.scheduled_posts for insert
  with check (public.can_edit_org(organization_id) and status in ('scheduled', 'manual_required'));
create policy scheduled_update on public.scheduled_posts for update
  using (public.can_edit_org(organization_id) and status in ('scheduled', 'manual_required', 'failed', 'cancelled'))
  with check (public.can_edit_org(organization_id) and status in ('scheduled', 'manual_required', 'cancelled'));
create policy scheduled_delete on public.scheduled_posts for delete
  using (public.can_edit_org(organization_id) and status <> 'processing');

create policy ai_history_select_self on public.ai_generation_history for select using (user_id = auth.uid());
create policy ai_usage_select_self on public.ai_usage for select using (billing_user_id = auth.uid() or user_id = auth.uid());

create policy notifications_select_self on public.notifications for select using (user_id = auth.uid());
create policy notifications_update_self on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_self on public.notifications for delete using (user_id = auth.uid());

create policy activity_select_self on public.activity_logs for select using (user_id = auth.uid());

-- contact_messages, app_settings, job_runs, rate_limits, webhook_events: service role only.

-- Lock down privileged functions.
revoke execute on function public.reserve_ai_credits(uuid, uuid, uuid, text, integer, integer, timestamptz) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.claim_due_scheduled_posts(integer) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
