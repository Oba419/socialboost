import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeNext } from "@/features/auth/redirect";
import { getAuthUser } from "@/lib/auth/session";
import { isGoogleAuthEnabled } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNext(rawNext);
  if (await getAuthUser()) redirect(next);
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue growing your audience."
      footer={
        <span>
          New here?{" "}
          <Link href="/signup" className="text-primary font-medium underline-offset-4 hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <LoginForm next={next} googleEnabled={isGoogleAuthEnabled()} />
    </AuthCard>
  );
}
