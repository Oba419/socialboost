import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getAuthUser } from "@/lib/auth/session";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const user = await getAuthUser();
  if (!user) {
    return (
      <AuthCard title="Link expired" description="This password reset link is invalid or has expired.">
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Choose a new password" description={`For ${user.email ?? "your account"}`}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
