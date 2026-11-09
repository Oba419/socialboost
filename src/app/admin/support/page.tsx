import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminTitle, fmtDateTime, Pager, StatusBadge } from "@/features/admin/ui";
import { SupportStatusSelect } from "@/features/admin/support-status-select";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin · Support" };
const PAGE_SIZE = 20;
const STATUSES = ["open", "in_progress", "resolved"] as const;

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof STATUSES)[number]) : undefined;

  let query = createAdminClient()
    .from("contact_messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  const { data: messages, count } = await query;
  const chip = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-xs", active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent");

  return (
    <div className="space-y-4">
      <AdminTitle title="Support requests" description="Messages submitted through the contact form." />
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/support" className={chip(!status)}>
          All
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/support?status=${s}`} className={chip(status === s)}>
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>
      {!messages?.length ? (
        <EmptyState title="No support requests" description="New contact form submissions will appear here." />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id}>
              <CardHeader className="flex-col gap-2 space-y-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base">{m.subject}</CardTitle>
                  <p className="text-muted-foreground text-xs">
                    {m.name} · <a href={`mailto:${m.email}`} className="hover:underline">{m.email}</a> · {fmtDateTime(m.created_at)}
                    {m.user_id && (
                      <>
                        {" · "}
                        <Link href={`/admin/users/${m.user_id}`} className="hover:underline">
                          account
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={m.status} />
                  <SupportStatusSelect id={m.id} status={m.status} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{m.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Pager
        page={page}
        totalPages={Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))}
        baseHref={(p) => `/admin/support?${new URLSearchParams({ ...(status && { status }), page: String(p) })}`}
      />
    </div>
  );
}
