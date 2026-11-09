import { CalendarCheck, LineChart, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SetupRequired } from "@/components/shared/setup-required";
import { isSupabaseConfigured } from "@/lib/env";

const POINTS = [
  { icon: Sparkles, text: "13 AI tools for ideas, captions, scripts and plans" },
  { icon: CalendarCheck, text: "One calendar for every platform" },
  { icon: LineChart, text: "Analytics that show where each number came from" },
  { icon: ShieldCheck, text: "Official APIs only — never your passwords" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,560px)] xl:grid-cols-[1fr_640px]">
      {/* Form column */}
      <div className="relative isolate flex flex-col overflow-hidden">
        <div className="aurora -z-10 opacity-60 lg:opacity-40" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        <header className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Logo />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
          <div className="page-enter w-full max-w-md space-y-4">
            {!isSupabaseConfigured() && (
              <SetupRequired integration="Authentication (Supabase)" envVars={["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]} />
            )}
            {children}
          </div>
        </main>
      </div>

      {/* Brand panel (large screens) */}
      <aside className="noise relative hidden overflow-hidden bg-[oklch(0.18_0.05_280)] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="aurora opacity-90" aria-hidden>
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" aria-hidden />
        <div className="relative" />
        <div className="relative max-w-md">
          <p className="text-sm font-medium tracking-wide text-white/70 uppercase">Your growth workspace</p>
          <h2 className="mt-4 text-4xl leading-tight font-semibold tracking-tight text-balance">
            Create smarter. Post consistently. <span className="text-gradient-animated">Grow for real.</span>
          </h2>
          <ul className="mt-10 space-y-4">
            {POINTS.map((p, i) => (
              <li
                key={p.text}
                className="page-enter flex items-center gap-3 text-white/85"
                style={{ animationDelay: `${200 + i * 120}ms` }}
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur">
                  <p.icon className="size-4" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/50">Organic growth only. No fake followers, bots or engagement manipulation.</p>
      </aside>
    </div>
  );
}
