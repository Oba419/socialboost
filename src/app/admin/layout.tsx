import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SetupRequired } from "@/components/shared/setup-required";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminNav } from "@/features/admin/admin-nav";
import { requireAdmin } from "@/lib/auth/session";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Always render per request: never prerender authenticated/admin UI at build time.
  await connection();
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <SetupRequired integration="Supabase" envVars={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]} />
      </div>
    );
  }
  // Server-side role check (profiles.role = 'admin'); non-admins are redirected.
  const ctx = await requireAdmin();

  return (
    <div className="min-h-screen">
      <header className="bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo href="/admin" compact />
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
            <ShieldCheck className="size-3.5" /> Admin
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground hidden text-xs sm:inline">{ctx.email}</span>
            <ThemeToggle />
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
              <ArrowLeft className="size-4" /> App
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {isServiceRoleConfigured() ? (
          children
        ) : (
          <SetupRequired integration="Admin console" envVars={["SUPABASE_SERVICE_ROLE_KEY"]} />
        )}
      </main>
    </div>
  );
}
