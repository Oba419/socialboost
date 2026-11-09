"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DASHBOARD_NAV, type NavItem } from "@/config/navigation";
import type { FeatureKey } from "@/config/plans";
import { cn } from "@/lib/utils";

export interface ShellProps {
  features: FeatureKey[];
  topbar: React.ReactNode;
  children: React.ReactNode;
  isAdmin: boolean;
}

const COLLAPSE_KEY = "sb:sidebar-collapsed";

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  features,
  collapsed,
  onNavigate,
}: {
  features: FeatureKey[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const renderItem = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    const locked = item.feature ? !features.includes(item.feature) : false;
    const link = (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-all duration-300",
          "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "focus-visible:ring-sidebar-ring outline-none focus-visible:ring-2",
          active &&
            "text-sidebar-accent-foreground bg-[linear-gradient(90deg,color-mix(in_oklch,var(--brand-purple)_16%,transparent),color-mix(in_oklch,var(--brand-blue)_6%,transparent))] font-medium",
          collapsed && "justify-center px-0",
        )}
      >
        {active && (
          <span aria-hidden className="bg-brand-gradient absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full" />
        )}
        <item.icon
          className={cn(
            "size-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110",
            active ? "text-primary" : "opacity-80",
          )}
        />
        {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
        {!collapsed && locked && <Lock className="size-3.5 opacity-50" aria-label="Upgrade required" />}
      </Link>
    );
    if (!collapsed) return <li key={item.href}>{link}</li>;
    return (
      <li key={item.href}>
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">
            {item.title}
            {locked ? " (upgrade)" : ""}
          </TooltipContent>
        </Tooltip>
      </li>
    );
  };

  return (
    <nav aria-label="Dashboard" className="space-y-5">
      {DASHBOARD_NAV.map((group, i) => (
        <div key={group.label || i}>
          {group.label && !collapsed && (
            <p className="text-sidebar-foreground/45 mb-1.5 px-2.5 text-[11px] font-medium tracking-wider uppercase">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">{group.items.map(renderItem)}</ul>
        </div>
      ))}
    </nav>
  );
}

// Tiny external store so the persisted preference hydrates without a mismatch.
const collapseListeners = new Set<() => void>();
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsed(value: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    /* storage unavailable: preference just won't persist */
  }
  collapseListeners.forEach((l) => l());
}
function subscribeCollapsed(listener: () => void) {
  collapseListeners.add(listener);
  return () => collapseListeners.delete(listener);
}

export function DashboardShell({ features, topbar, children, isAdmin }: ShellProps) {
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = () => writeCollapsed(!collapsed);

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "bg-sidebar border-sidebar-border sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center px-4", collapsed && "justify-center px-0")}>
          {collapsed ? (
            <Link href="/dashboard" aria-label="Dashboard home">
              <LogoMark />
            </Link>
          ) : (
            <Logo href="/dashboard" />
          )}
        </div>
        <ScrollArea className="flex-1 px-3 pb-4">
          <NavLinks features={features} collapsed={collapsed} />
          {isAdmin && !collapsed && (
            <Link href="/admin" className="text-muted-foreground hover:text-foreground mt-6 block px-2.5 text-xs underline-offset-4 hover:underline">
              Admin console →
            </Link>
          )}
        </ScrollArea>
        <div className="border-sidebar-border border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className={cn("w-full justify-start gap-2", collapsed && "justify-center")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>

      <div className="relative isolate flex min-w-0 flex-1 flex-col">
        {/* Soft brand glow behind page content */}
        <div aria-hidden className="bg-hero-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] opacity-60" />
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-2 border-b px-4 sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-sidebar w-72 p-0">
              <SheetHeader className="h-16 justify-center px-4">
                <SheetTitle asChild>
                  <div>
                    <Logo href="/dashboard" />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-4rem)] px-3 pb-6">
                <NavLinks features={features} collapsed={false} onNavigate={() => setMobileOpen(false)} />
                {isAdmin && (
                  <Link href="/admin" className="text-muted-foreground mt-6 block px-2.5 text-xs underline" onClick={() => setMobileOpen(false)}>
                    Admin console →
                  </Link>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>
          {topbar}
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
