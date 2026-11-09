# Project status — SocialBoost AI

_Last updated: 2026-11-09_

## Summary

All eight development phases are implemented in code. The app **builds, type-checks, lints and passes its automated tests** on this machine. It has **not yet run against a real Supabase project, OpenAI key, Paystack account or any social platform API**, because no credentials were provided. The database migrations were syntax-checked with the real Postgres parser (libpg_query) but have **not** been applied to a database.

| Check | Result |
| --- | --- |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 errors, 0 warnings |
| `npm test` (Vitest) | ✅ 95 tests in 9 files |
| `npm run build` | ✅ production build (Webpack mode, see note below) |
| `npm run test:e2e` (Playwright) | ✅ 20 passed, 12 skipped (authenticated journey needs a Supabase test user) |
| Migrations | ✅ parse cleanly (136 + 1 + 4 statements) · ⏳ not applied |

## Modules

| Module | Status | Notes |
| --- | --- | --- |
| Public website (home, features, pricing, about, contact, privacy, terms) | ✅ Built, E2E tested | Testimonials are labelled placeholders. Legal pages are templates: have a lawyer review them |
| Contact form + API | ✅ Built | Stores to DB and/or emails; returns NOT_CONFIGURED if neither is set up |
| Auth (email/password, Google, verify, forgot/reset, callback) | ✅ Built | ⏳ Needs Supabase to exercise |
| Onboarding (7 steps, saved progress, AI assessment) | ✅ Built | ⏳ Needs Supabase (+ OpenAI for step 7) |
| Dashboard shell (collapsible sidebar, mobile nav, workspace switcher, credits meter) | ✅ Built | |
| AI tools: Studio, Ideas, Captions, Hashtags, Video scripts, Repurposing, Profile optimizer, Growth coach, Engagement, Trends | ✅ Built | ⏳ Need `OPENAI_API_KEY` |
| Growth plans (7/30-day, tasks, progress) | ✅ Built | ⏳ OpenAI |
| Competitor research (manual snapshots, charts, AI analysis) | ✅ Built | Manual/public data only, by design |
| Content library (posts, generations, ideas, media uploads) | ✅ Built | ⏳ Supabase Storage |
| Content calendar (month/week/day, drag & drop, timezones) | ✅ Built | Timezone conversion unit-tested incl. DST |
| Scheduling + publishing worker | ✅ Built | Exactly-once claim; never marks published without platform confirmation |
| Social integrations (8 platforms, OAuth, encrypted tokens) | ✅ Built | ⏳ Needs developer apps + platform approvals. Endpoints were written from documentation knowledge; **verify each adapter against current docs** |
| Analytics + overview dashboard | ✅ Built | Real/manual/imported/demo data clearly labelled |
| Payments (Paystack), subscriptions, billing page | ✅ Built | ⏳ Needs Paystack keys + webhook URL |
| Entitlements / usage limits (server-enforced) | ✅ Built, unit tested | |
| Notifications (in-app + optional email) | ✅ Built | Email requires Resend |
| Settings (profile, brand, theme, notifications, workspaces/team, export, delete) | ✅ Built | |
| Admin console (stats, users, suspend, subscriptions, plans, support, jobs, config) | ✅ Built | Grant admin via SQL only |

## Required credentials / external setup

1. **Supabase** (required for anything beyond the public site): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus apply migrations and set auth redirect URLs (README › Database).
2. **Security secrets:** `TOKEN_ENCRYPTION_KEY`, `OAUTH_STATE_SECRET` (≥ 32 chars), `CRON_SECRET`.
3. **OpenAI:** `OPENAI_API_KEY`. Model IDs are configurable (`OPENAI_MODEL_DEFAULT` / `OPENAI_MODEL_ADVANCED`); confirm they exist on your account.
4. **Paystack:** `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`, webhook → `/api/webhooks/paystack`.
5. **Email (optional):** `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_INBOX_EMAIL`.
6. **Social platforms (optional, each needs approval):** see README › Social platform integrations. Extra optional vars: `META_GRAPH_VERSION`, `LINKEDIN_API_VERSION`.

## Database migration status

| File | Status |
| --- | --- |
| `20261109000001_initial_schema.sql` (tables, RLS, functions, triggers) | Written, parsed ✅, not applied |
| `20261109000002_seed_plans.sql` (plan catalogue; unit test keeps it in sync with `src/config/plans.ts`) | Written, parsed ✅, not applied |
| `20261109000003_storage.sql` (private `media` bucket + policies) | Written, parsed ✅, not applied |

## Known issues / limitations

- **Windows Smart App Control on the dev machine** blocks Next.js's unsigned native compiler. `dev` and `build` therefore use `--webpack` with the WASM compiler (slower first compiles, otherwise identical). On Vercel or machines without that policy you can drop `--webpack` to use Turbopack.
- `src/types/database.ts` is hand-written and declares no relationships, so typed embedded joins are avoided. Regenerate with `supabase gen types` once a project is linked.
- "Best-performing content" is an empty state: there is no per-post metrics table yet (would need a `post_metrics` table + ingestion).
- The AI performance review always summarises the last 30 days of data regardless of the 7/30/90 option.
- The pricing page reads the plan config file, not the DB, so admin price edits don't appear there until it is wired to `subscription_plans`. The billing page and checkout already use the DB.
- Billing: no proration on upgrades (full price, new period). If activation fails after a verified payment, the payment is audited and must be reconciled by an admin.
- Team members can only be added if they already have an account (no email invitations yet).
- Saved hashtags and competitor snapshots don't count toward the saved-items limit.
- `/auth/confirm` requires Supabase email templates that use `token_hash`; the default links work via `/auth/callback`.
- npm reports 8 moderate-severity advisories in transitive dependencies (`npm audit`); not yet reviewed.

## Next development tasks

1. Create a Supabase dev project → apply migrations → fill `.env.local` → manually walk through signup, onboarding, generation, scheduling and billing (Paystack test mode).
2. Create an E2E test user and run the authenticated Playwright journey (`E2E_EMAIL`, `E2E_PASSWORD`).
3. Register developer apps, starting with the best-supported platforms (LinkedIn, Facebook Pages, X), and verify each adapter's endpoints and scopes against current docs.
4. Wire the pricing page to `subscription_plans` with revalidation.
5. Add a `post_metrics` table for per-post analytics and best-performing content.
6. Email invitations for team members.
7. Review `npm audit` findings.

## Commands to continue

```bash
npm install
cp .env.example .env.local          # fill in values
npx supabase link --project-ref <ref> && npx supabase db push
npm run dev                         # http://localhost:3000
npm run check                       # typecheck + lint + unit tests + build
npx playwright install chromium && npm run build && npm run test:e2e
```
