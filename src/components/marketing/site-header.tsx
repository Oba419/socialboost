"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MARKETING_NAV } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="scroll-progress" aria-hidden />
      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-500",
          scrolled ? "glass border-border/60 border-b shadow-[0_8px_30px_-12px_rgb(0_0_0/0.12)]" : "border-b border-transparent",
        )}
      >
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <div className={cn("mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 transition-[height] duration-500 sm:px-6", scrolled ? "h-14" : "h-18")}>
          <Logo />
          <nav aria-label="Main" className="hidden md:block">
            <ul className="bg-background/40 flex items-center gap-1 rounded-full border border-transparent p-1 backdrop-blur-sm">
              {MARKETING_NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative rounded-full px-4 py-1.5 text-sm transition-colors duration-300",
                        active
                          ? "bg-foreground/[0.06] text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]",
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/login">Log in</Link>
            </Button>
            <Button variant="gradient" asChild className="hidden rounded-full px-5 sm:inline-flex">
              <Link href="/signup">
                Start Growing <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle asChild>
                    <div>
                      <Logo />
                    </div>
                  </SheetTitle>
                </SheetHeader>
                <nav aria-label="Mobile" className="px-4">
                  <ul className="space-y-1">
                    {MARKETING_NAV.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "hover:bg-accent block rounded-lg px-3 py-2.5 text-sm",
                            pathname === item.href && "bg-accent font-medium",
                          )}
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 grid gap-2">
                    <Button variant="outline" asChild>
                      <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
                    </Button>
                    <Button variant="gradient" asChild>
                      <Link href="/signup" onClick={() => setOpen(false)}>Start Growing</Link>
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
