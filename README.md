# SocialBoost AI

An AI-powered social media growth and management platform: plan, create, schedule, publish (where official APIs allow), analyse and improve your social presence from one workspace.

> The product name is configurable: set `NEXT_PUBLIC_APP_NAME` or edit `src/config/site.ts`.

**Status:** see [PROJECT_STATUS.md](PROJECT_STATUS.md) for exactly what is complete, what needs credentials or platform approval, and what remains.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict) |
| UI | Tailwind CSS v4, shadcn/ui (Radix), Lucide icons, Recharts, next-themes |
| Forms & validation | React Hook Form + Zod (Zod also validates every API input and every AI output) |
| Data & auth | Supabase: Postgres + Row Level Security, Auth (email + Google), Storage |
| AI | OpenAI Responses API with strict structured outputs (`zodTextFormat`) |
| Payments | Paystack (provider interface allows adding more) |
| Jobs | Vercel Cron → `/api/cron/*` (no extra infrastructure) |
| Tests | Vitest (unit), Playwright (E2E) |

## Architecture overview

```
src/
  app/
    (marketing)/          Public site: home, features, pricing, about, contact, legal
    (auth)/               Login, signup, forgot/reset password, verify email
    auth/                 OAuth/email callback + confirm routes, auth error page
    onboarding/           7-step onboarding wizard (progress saved server-side)
    dashboard/            Authenticated app (18 sections, collapsible sidebar)
    admin/                Administrator console (role = admin only)
    api/                  Route handlers (consistent { ok, data | error } envelope)
  components/             ui/ (shadcn), layout/, shared/, content/, forms/, marketing/
  config/                 site, plans, AI services, platform capability matrix, navigation
  features/               Feature modules (client components + server actions)
  lib/
    ai/                   One module per AI use case + shared runner
    auth/                 Data Access Layer (session, workspace, admin checks)
    entitlements/         Central plan/feature/limit resolution
    payments/             Payment provider interface + Paystack
    social/               OAuth state, adapters per platform, tokens, publishing
    security/             AES-256-GCM encryption, rate limiting
    supabase/             Browser, server (cookie) and service-role clients
  services/               Cross-cutting server services (billing, notifications, audit, content)
  proxy.ts                Session refresh + optimistic route protection (Next 16 "proxy")
supabase/migrations/      Schema, RLS policies, plan seed, storage bucket
tests/                    unit/ (Vitest) and e2e/ (Playwright)
```

### Key design decisions

- **Workspaces (organizations).** Every user gets a personal workspace on signup (DB trigger). All content belongs to a workspace and access is by membership, so Business and Agency plans get multi-brand and client workspaces without special cases. Billing and AI credits belong to the workspace **owner**.
- **Security boundary = server + RLS.** `src/proxy.ts` only does optimistic redirects. Every page, server action and route handler re-verifies the user (`src/lib/auth/session.ts`), and Postgres RLS isolates data per workspace. Secrets (social tokens, card authorizations) live in tables with **no** RLS policies, so only the service role can read them, and they are encrypted with AES-256-GCM.
- **Entitlements in one place.** Feature code calls `assertFeature(ctx, "content_calendar")` or `assertLimit(...)` and never checks plan names. Plan prices, features and limits live in the `subscription_plans` table (seeded from `src/config/plans.ts`) and are editable in the admin console.
- **AI credits are metered atomically.** `reserve_ai_credits()` (a Postgres function with an advisory lock) reserves credits before the model call and the runner refunds them if the call or validation fails. Every AI output is validated with Zod before it is stored or shown.
- **No faked success.** Missing credentials produce an explicit "awaiting setup" state. Posts are marked published only on platform confirmation (or explicitly labelled "marked as posted by you"). Every metric carries its source: live API, manual, imported or demo.
- **Cache Components disabled.** Almost every route is personalised, so the app uses Next's dynamic rendering model. Public pages are still prerendered.

## Getting started

### 1. Prerequisites

- Node.js 20.9+ (developed on Node 26)
- A Supabase project (free tier is fine)
- Optional: OpenAI API key, Paystack account, social platform developer apps, Resend account

### 2. Install

```bash
npm install
cp .env.example .env.local   # then fill in values (see Configuration)
```

### 3. Database

Apply the migrations in `supabase/migrations/` in filename order:

- **Supabase CLI:** `npx supabase link --project-ref <ref>` then `npx supabase db push`
- **or** paste each file into the Supabase SQL editor, in order.

Then in the Supabase dashboard:

1. **Auth → URL configuration:** set Site URL to your `NEXT_PUBLIC_APP_URL` and add `<APP_URL>/auth/callback` to Redirect URLs.
2. **Auth → Email templates (optional):** links may point to `<APP_URL>/auth/confirm?token_hash={{ .TokenHash }}&type=...`.
3. **Auth → Providers → Google (optional):** add your Google OAuth client, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.

**Create an administrator** (there is deliberately no UI or signup path for this):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

### 4. Run

```bash
npm run dev          # http://localhost:3000
```

## Configuration

All variables are documented in [.env.example](.env.example). Summary:

| Integration | Variables | Without it |
| --- | --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Public site works; auth and dashboard show a setup notice |
| Security | `TOKEN_ENCRYPTION_KEY` (64 hex chars), `OAUTH_STATE_SECRET`, `CRON_SECRET` | Social connections, payments' card renewals and cron jobs are disabled |
| AI provider | `GEMINI_API_KEY` (free tier) **or** `OPENAI_API_KEY`; optional `AI_PROVIDER`, `*_MODEL_DEFAULT` / `*_MODEL_ADVANCED` | AI tools show "AI generation is awaiting setup"; requests are rejected rather than simulated |
| Paystack | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` | Plans are visible but checkout is disabled |
| Email | `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_INBOX_EMAIL` | In-app notifications only |
| Social platforms | see below | Platform cards show "Awaiting setup" |

### Paystack

1. Use test keys first (`pk_test_…`, `sk_test_…`).
2. In Paystack **Settings → API Keys & Webhooks** set the webhook URL to `<APP_URL>/api/webhooks/paystack`.
3. Paid features are granted **only** after server-side verification (`GET /transaction/verify/:reference`) from either the callback or the signed webhook. Fulfilment is idempotent.
4. Renewals charge the saved reusable authorization through the daily renewal cron. Failed renewals move the subscription to `past_due` with a 3-day grace period and then fall back to Free.

### Social platform integrations

Register a developer app on each platform with redirect URI `<APP_URL>/api/social/<platform>/callback` (`instagram` and `facebook` share the Meta app). What each platform allows is listed in the in-app capability matrix (`src/config/platforms.ts`):

| Platform | Variables | Approval required before real users can connect |
| --- | --- | --- |
| Facebook Pages / Instagram | `META_APP_ID`, `META_APP_SECRET` | Meta App Review (pages_manage_posts, instagram_content_publish, insights) + Business Verification. Instagram requires a Professional account linked to a Page |
| Threads | `THREADS_APP_ID`, `THREADS_APP_SECRET` | Meta App Review for threads_* permissions |
| TikTok | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | Login Kit + Display API approval; direct posting needs a Content Posting API audit (the app uses a manual publishing workflow until then) |
| YouTube | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth verification for YouTube scopes; uploads stay private until an API audit (manual workflow) |
| LinkedIn | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | "Sign In with LinkedIn (OIDC)" + "Share on LinkedIn" products; organization pages/analytics need Community Management API approval |
| X | `X_CLIENT_ID`, `X_CLIENT_SECRET` | A paid API tier with write access |
| Pinterest | `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET` | Trial access is sandbox-only; Standard access needs review |

Scopes and endpoints change: each adapter in `src/lib/social/adapters/` lists the endpoints it uses. Verify them against current platform docs before launch.

### Background jobs

| Path | Recommended | `vercel.json` (Hobby-safe) | Purpose |
| --- | --- | --- | --- |
| `/api/cron/publish` | every 5 min | daily 07:00 UTC | Publish due posts (exactly-once claim with `FOR UPDATE SKIP LOCKED`, retries with backoff, never double-posts) and flag manual posts that are due |
| `/api/cron/sync-metrics` | every 6 hours | daily 03:00 UTC | Pull available metrics from connected accounts |
| `/api/cron/renew-subscriptions` | daily | daily 06:00 UTC | Renewals (one charge attempt per day), downgrades at period end, expirations |

`vercel.json` uses once-a-day schedules because Vercel's Hobby plan rejects deployments with more frequent crons. For timely publishing:

- **Vercel Pro:** change the publish schedule in `vercel.json` to `*/5 * * * *` (and sync-metrics to `0 */6 * * *`).
- **Hobby (free):** create a free job at an external scheduler such as cron-job.org that calls `GET https://<your-domain>/api/cron/publish` every 5 minutes with the header `Authorization: Bearer <CRON_SECRET>`.

All cron endpoints reject requests without that header.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | Generate route types + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests (run `npm run build` first) |
| `npm run check` | typecheck + lint + unit tests + build |

## Testing

- **Unit tests** (`tests/unit`, `src/**/*.test.ts`) cover entitlements, billing periods, encryption, webhook signatures, rate limiting, log redaction, AI schema strictness, prompt construction, API error mapping, plan seed ↔ config sync and timezone conversion.
- **E2E tests** (`tests/e2e`) run on desktop and mobile viewports. Public-site and access-control tests always run. The authenticated journey (login → dashboard navigation → AI generation → save → library → calendar) runs when `E2E_EMAIL` and `E2E_PASSWORD` are set for a confirmed, onboarded user in a **non-production** Supabase project. AI steps are skipped when OpenAI isn't configured.

```bash
npx playwright install chromium   # once
npm run build && npm run test:e2e
```

## Deployment (Vercel + Supabase)

1. Push to a Git repository and import it in Vercel.
2. Add every environment variable from `.env.example` (production values).
3. Apply migrations to the production Supabase project.
4. Set Supabase Auth Site URL / redirect URLs to the production domain.
5. Register the Paystack webhook and the social OAuth redirect URIs with the production domain.
6. Deploy. Cron jobs are picked up from `vercel.json`.

## Responsible growth

The platform promotes legitimate, organic growth. It does **not** and will not implement fake followers, likes or comments, engagement pods, automated mass following, spam, scraping of private data, or storage of social media passwords. AI prompts include guardrails against promising guaranteed results or inventing statistics.
