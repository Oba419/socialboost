import Link from "next/link";
import { AlertTriangle, ShieldOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const metadata = { title: "Authentication error" };

const MESSAGES: Record<string, { title: string; body: string }> = {
  suspended: {
    title: "Account suspended",
    body: `This account has been suspended. If you think this is a mistake, contact ${siteConfig.supportEmail}.`,
  },
  link_expired: { title: "Link expired", body: "This link is invalid or has expired. Please request a new one." },
  invalid_link: { title: "Invalid link", body: "This link is malformed. Please use the latest email we sent you." },
  missing_code: { title: "Sign-in incomplete", body: "We didn't receive an authorization code. Please try signing in again." },
  provider: { title: "Sign-in was cancelled", body: "The sign-in provider returned an error. Please try again." },
  not_configured: { title: "Authentication unavailable", body: "Authentication is not configured on this deployment yet." },
};

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const msg = (reason && MESSAGES[reason]) || { title: "Something went wrong", body: "We couldn't complete that request. Please try again." };
  const Icon = reason === "suspended" ? ShieldOff : AlertTriangle;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo className="mb-10" />
      <span className="bg-destructive/10 text-destructive mb-4 inline-flex size-14 items-center justify-center rounded-full">
        <Icon className="size-7" />
      </span>
      <h1 className="text-xl font-semibold">{msg.title}</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">{msg.body}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {reason === "suspended" ? (
          <Button asChild>
            <Link href="/contact">Contact support</Link>
          </Button>
        ) : (
          <>
            <Button asChild>
              <Link href="/login">Back to sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/forgot-password">Reset password</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
