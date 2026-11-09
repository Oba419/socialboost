import { cn } from "@/lib/utils";

/**
 * Marketing section with an animated heading block. The heading reveals on
 * scroll; pass `data-reveal` / `data-reveal-stagger` on children for content.
 */
export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  centered = true,
  as: Heading = "h2",
  revealChildren = true,
}: {
  as?: "h1" | "h2";
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  centered?: boolean;
  /** Fade the children block in as one unit (disable when children animate themselves). */
  revealChildren?: boolean;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("relative scroll-mt-20 py-20 sm:py-28", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={cn("mb-14 max-w-2xl space-y-4", centered && "mx-auto text-center")} data-reveal>
          {eyebrow && (
            <p className="eyebrow">
              <span className="bg-brand-gradient size-1.5 rounded-full" aria-hidden />
              {eyebrow}
            </p>
          )}
          <Heading
            id={headingId}
            className={cn(
              "font-semibold tracking-tight text-balance",
              Heading === "h1" ? "text-4xl sm:text-6xl" : "text-3xl sm:text-5xl",
            )}
          >
            {title}
          </Heading>
          {description && <p className="text-muted-foreground text-pretty sm:text-lg">{description}</p>}
        </div>
        {children && (revealChildren ? <div data-reveal style={{ "--reveal-delay": "120ms" } as React.CSSProperties}>{children}</div> : children)}
      </div>
    </section>
  );
}

/** Thin gradient divider between sections. */
export function GradientDivider() {
  return (
    <div aria-hidden className="mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-[var(--brand-purple)]/40 to-transparent" />
  );
}
