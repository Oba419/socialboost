import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex items-start gap-4">
        {Icon && (
          <span className="bg-brand-gradient-animated mt-0.5 hidden size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-primary/25 sm:inline-flex">
            <Icon className="size-5" />
          </span>
        )}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{title}</h1>
          {description && <p className="text-muted-foreground max-w-2xl text-sm">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
