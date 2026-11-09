import { CalendarDays, Lightbulb, Sparkles, TrendingUp } from "lucide-react";

/**
 * Static illustration of the product UI. All figures are clearly marked as
 * sample data — it is a design mock, not real user performance.
 */
const BARS = [38, 52, 45, 61, 58, 72, 68, 80, 74, 88, 83, 92];

export function DashboardPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-5xl">
      <div className="bg-brand-gradient absolute -inset-px rounded-2xl opacity-40 blur-2xl" aria-hidden />
      <div className="bg-card relative overflow-hidden rounded-2xl border shadow-2xl shadow-primary/10">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="size-2.5 rounded-full bg-red-400/70" aria-hidden />
          <span className="size-2.5 rounded-full bg-amber-400/70" aria-hidden />
          <span className="size-2.5 rounded-full bg-emerald-400/70" aria-hidden />
          <span className="text-muted-foreground ml-3 text-xs">Dashboard overview</span>
          <span className="border-warning/50 text-warning ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium">
            Sample data · illustration
          </span>
        </div>
        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["Followers", "Engagement", "Reach", "Posts"].map((label) => (
                <div key={label} className="rounded-xl border p-3">
                  <p className="text-muted-foreground text-[11px]">{label}</p>
                  <div className="bg-muted mt-2 h-4 w-16 rounded" aria-hidden />
                  <div className="bg-success/30 mt-2 h-2 w-10 rounded" aria-hidden />
                </div>
              ))}
            </div>
            <div className="rounded-xl border p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium">Performance over time</p>
                <span className="text-muted-foreground text-[11px]">Last 30 days</span>
              </div>
              <div className="flex h-36 items-end gap-1.5 sm:gap-2" aria-hidden>
                {BARS.map((h, i) => (
                  <div key={i} className="bg-brand-gradient flex-1 rounded-t-md opacity-80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border p-4">
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
              { icon: CalendarDays, label: "Scheduled post" },
              { icon: Lightbulb, label: "Saved content idea" },
              { icon: TrendingUp, label: "Growth plan task" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border p-3">
                <span className="bg-primary/10 text-primary inline-flex size-8 items-center justify-center rounded-lg">
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
