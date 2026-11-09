import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SetupRequired } from "@/components/shared/setup-required";
import { isSupabaseConfigured } from "@/lib/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="bg-hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <header className="relative flex h-16 items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-md space-y-4">
          {!isSupabaseConfigured() && (
            <SetupRequired integration="Authentication (Supabase)" envVars={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]} />
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
