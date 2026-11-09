import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-brand-gradient inline-flex size-8 items-center justify-center rounded-lg text-white shadow-sm shadow-primary/30",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17l5-5 4 4 7-8" />
        <path d="M15 8h5v5" />
      </svg>
    </span>
  );
}

export function Logo({ className, href = "/", compact = false }: { className?: string; href?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <LogoMark />
      {!compact && <span className="text-[15px]">{siteConfig.name}</span>}
      <span className="sr-only">{siteConfig.name} home</span>
    </Link>
  );
}
