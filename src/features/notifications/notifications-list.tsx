"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  CheckCircle2,
  CreditCard,
  Link2,
  MailOpen,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/shared/empty-state";
import { apiFetch, toastError } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/types/database";

const ICONS: Record<string, typeof Bell> = {
  scheduled_posts: CalendarClock,
  publish_success: CheckCircle2,
  publish_failure: AlertTriangle,
  subscription: CreditCard,
  ai_limits: Sparkles,
  weekly_report: TrendingUp,
  integrations: Link2,
};

export function NotificationsList({
  items,
  page,
  totalPages,
  unreadOnly,
  unreadCount,
  timezone,
}: {
  items: NotificationRow[];
  page: number;
  totalPages: number;
  unreadOnly: boolean;
  unreadCount: number;
  timezone: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const act = (fn: () => ReturnType<typeof apiFetch>, success?: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return toastError(res.error);
      if (success) toast.success(success);
      router.refresh();
    });

  const href = (p: number, unread = unreadOnly) => `/dashboard/notifications?page=${p}${unread ? "&filter=unread" : ""}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="bg-muted inline-flex rounded-lg p-1 text-sm" role="tablist" aria-label="Filter">
          <Link href={href(1, false)} role="tab" aria-selected={!unreadOnly} className={cn("rounded-md px-3 py-1.5", !unreadOnly && "bg-background shadow-sm")}>
            All
          </Link>
          <Link href={href(1, true)} role="tab" aria-selected={unreadOnly} className={cn("rounded-md px-3 py-1.5", unreadOnly && "bg-background shadow-sm")}>
            Unread {unreadCount > 0 && <span className="text-primary tabular-nums">({unreadCount})</span>}
          </Link>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || unreadCount === 0}
          onClick={() => act(() => apiFetch("/api/notifications", { method: "PATCH", json: { action: "mark_all_read" } }), "All caught up")}
        >
          <CheckCheck className="size-4" /> Mark all as read
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={unreadOnly ? MailOpen : BellOff}
          title={unreadOnly ? "No unread notifications" : "No notifications yet"}
          description="We'll let you know about publishing results, billing events and AI usage here."
        />
      ) : (
        <Card className="divide-y gap-0 py-0">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            const unread = !n.read_at;
            const date = new Date(n.created_at);
            return (
              <div key={n.id} className={cn("flex gap-3 p-4", unread && "bg-primary/[0.03]")}>
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full",
                    n.type === "publish_failure" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm", unread ? "font-semibold" : "font-medium")}>
                      {unread && <span className="bg-primary mr-2 inline-block size-2 rounded-full align-middle" aria-label="Unread" />}
                      {n.link ? (
                        <Link
                          href={n.link}
                          className="hover:underline"
                          onClick={() => {
                            if (unread) void apiFetch(`/api/notifications/${n.id}`, { method: "PATCH", json: { read: true } });
                          }}
                        >
                          {n.title}
                        </Link>
                      ) : (
                        n.title
                      )}
                    </p>
                    <time
                      dateTime={n.created_at}
                      title={date.toLocaleString(undefined, { timeZone: timezone })}
                      className="text-muted-foreground shrink-0 text-xs"
                    >
                      {formatDistanceToNow(date, { addSuffix: true })}
                    </time>
                  </div>
                  {n.body && <p className="text-muted-foreground mt-0.5 text-sm">{n.body}</p>}
                </div>
                <div className="flex shrink-0 items-start gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        disabled={pending}
                        aria-label={unread ? "Mark as read" : "Mark as unread"}
                        onClick={() => act(() => apiFetch(`/api/notifications/${n.id}`, { method: "PATCH", json: { read: unread } }))}
                      >
                        {unread ? <MailOpen className="size-4" /> : <Bell className="size-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{unread ? "Mark as read" : "Mark as unread"}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        disabled={pending}
                        aria-label="Delete notification"
                        onClick={() => act(() => apiFetch(`/api/notifications/${n.id}`, { method: "DELETE" }), "Notification deleted")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between" aria-label="Pagination">
          <Button variant="outline" size="sm" asChild disabled={page <= 1}>
            {page > 1 ? <Link href={href(page - 1)}>Previous</Link> : <span aria-disabled>Previous</span>}
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
            {page < totalPages ? <Link href={href(page + 1)}>Next</Link> : <span aria-disabled>Next</span>}
          </Button>
        </nav>
      )}
    </div>
  );
}
