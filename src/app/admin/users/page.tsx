import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminTitle, fmtDateTime, Pager, StatusBadge } from "@/features/admin/ui";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Admin · Users" };
const PAGE_SIZE = 25;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select("id, email, full_name, role, status, onboarding_completed, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) {
    // Strip PostgREST filter syntax characters from the search term.
    const safe = q.replace(/[%_,()*\\]/g, "");
    query = query.or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`);
  }
  const { data: users, count } = await query;

  const ids = (users ?? []).map((u) => u.id);
  const { data: subs } = ids.length
    ? await admin.from("subscriptions").select("user_id, plan_id, status").in("user_id", ids)
    : { data: [] };
  const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <AdminTitle title="Users" description={`${count ?? 0} registered users`} />
      <form className="flex max-w-md gap-2" role="search">
        <Input name="q" defaultValue={q} placeholder="Search by email or name" aria-label="Search users" />
        <Button type="submit" variant="outline">
          <Search className="size-4" /> Search
        </Button>
      </form>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          {!users?.length ? (
            <EmptyState title="No users found" className="m-4" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const s = subByUser.get(u.id);
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                          {u.full_name || "—"}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {u.email}
                          {u.role === "admin" ? " · admin" : ""}
                          {!u.onboarding_completed ? " · onboarding" : ""}
                        </p>
                      </TableCell>
                      <TableCell>
                        {s?.plan_id ?? "free"}
                        {s && s.status !== "active" && <span className="text-muted-foreground text-xs"> · {s.status}</span>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={u.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden text-xs md:table-cell">{fmtDateTime(u.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Pager page={page} totalPages={totalPages} baseHref={(p) => `/admin/users?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`} />
    </div>
  );
}
