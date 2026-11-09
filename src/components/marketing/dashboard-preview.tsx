import { CalendarCheck, CalendarDays, CheckCircle2, Lightbulb, Sparkles, Target, TrendingUp } from "lucide-react";

/**
 * Static illustration of the product UI. All figures are clearly marked as
 * sample data — it is a design mock, not real user performance.
 */
const BARS = [34, 48, 42, 58, 52, 66, 61, 74, 70, 84, 79, 92];

export function DashboardPreview() {
  return (
    <figure className="hero-tilt relative mx-auto w-full max-w-5xl">
      {/* Glow */}
      <div className="bg-brand-gradient-animated absolute -inset-4 rounded-[2rem] opacity-30 blur-3xl" aria-hidden />

      {/* Floating chips (illustrative UI states) */}
      <div
        aria-hidden
        className="glass float-slow absolute top-16 -left-6 z-10 hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-xl lg:flex"
      >
        <CheckCircle2 className="text-success size-4" /> Caption ready
      </div>
      <div
        aria-hidden
        className="glass float-slower absolute -right-8 bottom-24 z-10 hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-xl lg:flex"
      >
        <CalendarCheck className="text-brand-blue size-4" /> Post scheduled · Fri 10:00
      </div>
      <div
        aria-hidden
        className="glass float-slow absolute -top-5 right-20 z-10 hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-xl lg:flex"
      >
        <Target className="text-brand-pink size-4" /> Growth plan · Day 3
      </div>

      <div className="gradient-border bg-card/90 relative overflow-hidden rounded-2xl shadow-2xl shadow-primary/20 backdrop-blur">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/80" aria-hidden />
          <span className="size-2.5 rounded-full bg-amber-400/80" aria-hidden />
          <span className="size-2.5 rounded-full bg-emerald-400/80" aria-hidden />
          <span className="text-muted-foreground ml-3 text-xs">Dashboard overview</span>
          <span className="border-warning/50 text-warning ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium">
            Sample data · illustration
          </span>
        </div>
        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-reveal-stagger>
              {["Followers", "Engagement", "Reach", "Posts"].map((label, i) => (
                <div key={label} className="bg-background/60 rounded-xl border p-3">
                  <p className="text-muted-foreground text-[11px]">{label}</p>
                  <div className="bg-muted mt-2 h-4 w-16 rounded" aria-hidden />
                  <div
                    className="mt-2 h-2 rounded"
                    style={{ width: `${40 + i * 8}%`, background: `var(--chart-${(i % 5) + 1})`, opacity: 0.55 }}
                    aria-hidden
                  />
                </div>
              ))}
            </div>
            <div className="bg-background/60 rounded-xl border p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium">Performance over time</p>
                <span className="text-muted-foreground text-[11px]">Last 30 days</span>
              </div>
              <div className="flex h-40 items-end gap-1.5 sm:gap-2" aria-hidden data-reveal-bars>
                {BARS.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-[var(--brand-purple)] via-[var(--brand-blue)] to-[var(--brand-cyan)] opacity-85"
                    style={{ height: `${h}%`, "--i": i } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3" data-reveal-stagger>
            <div className="bg-background/60 rounded-xl border p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="text-primary size-4" /> AI recommendation
              </p>
              <div className="space-y-1.5" aria-hidden>
                <div className="bg-muted h-2.5 w-full rounded" />
                <div className="bg-muted h-2.5 w-11/12 rounded" />
                <div className="bg-muted h-2.5 w-3/4 rounded" />
              </div>
            </div>
            {[
              { icon: CalendarDays, label: "Scheduled post", tint: "var(--brand-blue)" },
              { icon: Lightbulb, label: "Saved content idea", tint: "var(--brand-pink)" },
              { icon: TrendingUp, label: "Growth plan task", tint: "var(--brand-cyan)" },
            ].map(({ icon: Icon, label, tint }) => (
              <div key={label} className="bg-background/60 flex items-center gap-3 rounded-xl border p-3">
                <span
                  className="inline-flex size-8 items-center justify-center rounded-lg"
                  style={{ background: `color-mix(in oklch, ${tint} 15%, transparent)`, color: tint }}
                >
                  <Icon className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="text-xs font-medium">{label}</p>
                  <div className="bg-muted mt-1.5 h-2 w-24 rounded" aria-hidden />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="sr-only">Illustration of the dashboard interface using placeholder sample data.</figcaption>
    </figure>
  );
}
