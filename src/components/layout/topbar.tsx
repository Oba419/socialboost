"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronsUpDown, LogOut, Settings, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { switchWorkspace } from "@/features/workspaces/actions";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

export interface TopbarProps {
  user: { name: string; email: string; avatarUrl: string | null };
  workspaces: { id: string; name: string; type: string }[];
  currentWorkspaceId: string;
  planName: string;
  credits: { used: number; limit: number };
  unreadNotifications: number;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Topbar({ user, workspaces, currentWorkspaceId, planName, credits, unreadNotifications }: TopbarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = workspaces.find((w) => w.id === currentWorkspaceId);
  const pct = credits.limit > 0 ? Math.min(100, Math.round((credits.used / credits.limit) * 100)) : 100;

  return (
    <div className="flex flex-1 items-center justify-between gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="max-w-[220px] justify-between gap-2 px-2" disabled={pending}>
            <span className="truncate text-sm font-medium">{current?.name ?? "Workspace"}</span>
            <ChevronsUpDown className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onSelect={() =>
                w.id !== currentWorkspaceId &&
                startTransition(async () => {
                  const res = await switchWorkspace(w.id);
                  if (res.ok) {
                    toast.success(`Switched to ${w.name}`);
                    router.refresh();
                  } else toast.error(res.error.message);
                })
              }
            >
              <span className="flex-1 truncate">{w.name}</span>
              <span className="text-muted-foreground text-[10px] uppercase">{w.type}</span>
              {w.id === currentWorkspaceId && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings?tab=workspaces">Manage workspaces</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-1 sm:gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/dashboard/billing"
              className="hover:bg-accent hidden items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs sm:flex"
            >
              <Sparkles className="text-primary size-3.5" />
              <span className="tabular-nums">
                {Math.max(0, credits.limit - credits.used)} credits
              </span>
              <span className="bg-muted h-1.5 w-14 overflow-hidden rounded-full" aria-hidden>
                <span
                  className={cn("block h-full rounded-full", pct >= 90 ? "bg-destructive" : "bg-brand-gradient")}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            {planName} plan · {credits.used} of {credits.limit} AI credits used this period
          </TooltipContent>
        </Tooltip>

        <Button variant="ghost" size="icon" asChild className="relative">
          <Link href="/dashboard/notifications" aria-label={`Notifications (${unreadNotifications} unread)`}>
            <Bell className="size-[18px]" />
            {unreadNotifications > 0 && (
              <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 text-[10px] leading-4 font-medium tabular-nums">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>
        </Button>
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-9 rounded-full p-0" aria-label="Account menu">
              <Avatar className="size-8">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                <AvatarFallback className="bg-primary/15 text-primary text-xs">{initials(user.name || user.email)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-muted-foreground truncate text-xs">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings"><User className="size-4" /> Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/billing"><Sparkles className="size-4" /> {planName} plan</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings?tab=notifications"><Settings className="size-4" /> Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => startTransition(() => signOut())}>
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
