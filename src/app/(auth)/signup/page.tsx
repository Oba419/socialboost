import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";
import { safePlan } from "@/features/auth/redirect";
import { getAuthUser } from "@/lib/auth/session";
import { isGoogleAuthEnabled } from "@/lib/env";
import { getDefaultPlan } from "@/config/plans";

export const metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const plan = safePlan((await searchParams).plan);
  if (await getAuthUser()) redirect(plan ? `/dashboard/billing?plan=${plan}` : "/dashboard");
  const planName = plan ? getDefaultPlan(plan)?.name : null;
  return (
    <AuthCard
      title="Start growing"
      description={
        <span className="inline-flex flex-wrap items-center justify-center gap-2">
          Create your free account.
          {planName && <Badge variant="secondary">Selected plan: {planName}</Badge>}
        </span>
      }
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium underline-offset-4 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <SignupForm plan={plan ?? undefined} googleEnabled={isGoogleAuthEnabled()} />
    </AuthCard>
  );
}
