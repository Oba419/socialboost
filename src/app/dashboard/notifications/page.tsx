import { Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationsList } from "@/features/notifications/notifications-list";
import { loadDashboardPage } from "@/lib/auth/page";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notifications" };

const PAGE_SIZE = 20;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string; filter?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const unreadOnly = sp.filter === "unread";
  const { ctx } = await loadDashboardPage();
  const supabase = await createClient();

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (unreadOnly) query = query.is("read_at", null);

  const [{ data, count }, unread] = await Promise.all([
    query,
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", ctx.userId).is("read_at", null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader icon={Bell} title="Notifications" description="Publishing results, billing events, AI usage alerts and account updates." />
      <NotificationsList
        items={data ?? []}
        page={page}
        totalPages={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))}
        unreadOnly={unreadOnly}
        unreadCount={unread.count ?? 0}
        timezone={ctx.profile.timezone}
      />
    </div>
  );
}
