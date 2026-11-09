import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResendVerification } from "@/features/auth/components/resend-verification";

export const metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const safeEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254 ? email : undefined;
  return (
    <AuthCard
      title="Check your inbox"
      footer={
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="space-y-5 text-center">
        <span className="bg-primary/10 text-primary mx-auto inline-flex size-14 items-center justify-center rounded-full">
          <MailCheck className="size-7" />
        </span>
        <p className="text-muted-foreground text-sm">
          We sent a verification link to {safeEmail ? <strong className="text-foreground">{safeEmail}</strong> : "your email address"}. Click it to
          activate your account and start onboarding. Check your spam folder if you can&apos;t find it.
        </p>
        <ResendVerification initialEmail={safeEmail} />
      </div>
    </AuthCard>
  );
}
