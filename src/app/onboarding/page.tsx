import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SetupRequired } from "@/components/shared/setup-required";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import type { OnboardingFormValues } from "@/features/onboarding/schemas";
import { safePlan } from "@/features/auth/redirect";
import { requireUser } from "@/lib/auth/session";
import { isOpenAIConfigured, isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Get started" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  await connection(); // per-request only
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <SetupRequired integration="Supabase" envVars={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]} />
      </div>
    );
  }
  const ctx = await requireUser();
  const plan = safePlan((await searchParams).plan);
  if (ctx.profile.onboarding_completed) redirect(plan ? `/dashboard/billing?plan=${plan}` : "/dashboard");

  const org = ctx.organization;
  const followers: Record<string, string> = {};
  for (const [k, v] of Object.entries(org.current_followers ?? {})) followers[k] = String(v);

  const initialValues: OnboardingFormValues = {
    fullName: ctx.profile.full_name ?? "",
    timezone: ctx.profile.timezone,
    userType: org.user_type ?? "",
    niche: org.niche ?? "",
    platforms: org.platforms as OnboardingFormValues["platforms"],
    goals: org.goals,
    followers,
    postingFrequency: org.posting_frequency ?? "",
    targetAudience: org.target_audience ?? "",
    location: org.location ?? "",
    brandVoice: org.brand_voice ?? "",
    contentResources: org.content_resources ?? "",
    preferredFormats: org.preferred_formats,
  };

  return (
    <div className="relative min-h-screen">
      <div className="bg-hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <header className="relative flex h-16 items-center justify-between px-4 sm:px-6">
        <Logo href="/onboarding" />
        <ThemeToggle />
      </header>
      <main className="relative mx-auto w-full max-w-2xl px-4 pt-4 pb-16">
        <OnboardingWizard initialStep={ctx.profile.onboarding_step} initialValues={initialValues} aiReady={isOpenAIConfigured()} plan={plan ?? undefined} />
      </main>
    </div>
  );
}
