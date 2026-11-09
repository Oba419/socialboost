"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MARKETING_NAV } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-background/75 sticky top-0 z-40 border-b backdrop-blur-md">
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only rounded-md px-3 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {MARKETING_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "text-muted-foreground hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors",
                      active && "text-foreground font-medium",
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
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/signup">Start Growing</Link>
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
                        className="hover:bg-accent block rounded-md px-3 py-2.5 text-sm"
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
                  <Button asChild>
                    <Link href="/signup" onClick={() => setOpen(false)}>Start Growing</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
