import { paginationSchema, parseQuery, route } from "@/lib/api/handler";
import { paginate } from "@/lib/api/response";
import { requireApiUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

/** GET /api/billing/payments — the signed-in user's payment history (RLS: own rows only). */
export const GET = route(async (req) => {
  const ctx = await requireApiUser();
  const q = parseQuery(req, paginationSchema);
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("payments")
    .select("id, reference, purpose, plan_id, billing_interval, amount, currency, status, channel, paid_at, created_at", { count: "exact" })
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false })
    .range((q.page - 1) * q.pageSize, q.page * q.pageSize - 1);
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load payment history.");
  return paginate(data ?? [], q.page, q.pageSize, count ?? 0);
});
