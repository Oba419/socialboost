import { cn } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  centered = true,
  as: Heading = "h2",
}: {
  as?: "h1" | "h2";
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  centered?: boolean;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("scroll-mt-20 py-20 sm:py-24", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={cn("mb-12 max-w-2xl space-y-3", centered && "mx-auto text-center")}>
          {eyebrow && <p className="text-primary text-sm font-medium tracking-wide">{eyebrow}</p>}
          <Heading
            id={headingId}
            className={cn(
              "font-semibold tracking-tight text-balance",
              Heading === "h1" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
            )}
          >
            {title}
          </Heading>
          {description && <p className="text-muted-foreground text-pretty sm:text-lg">{description}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
