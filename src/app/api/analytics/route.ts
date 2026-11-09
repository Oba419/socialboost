import { parseQuery, route } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { analyticsQuerySchema } from "@/features/analytics/schemas";

/** GET /api/analytics?from&to&platform&accountId — real metric rows (never demo). */
export const GET = route(async (req) => {
  const ctx = await requireApiUser();
  const q = parseQuery(req, analyticsQuerySchema);
  const supabase = await createClient();
  let query = supabase
    .from("social_account_metrics")
    .select("id, platform, social_account_id, metric_date, metric_key, platform_metric_name, value, source")
    .eq("organization_id", ctx.organization.id)
    .in("source", ["api", "manual", "import"])
    .gte("metric_date", q.from)
    .lte("metric_date", q.to)
    .order("metric_date", { ascending: true })
    .limit(10000);
  if (q.platform) query = query.eq("platform", q.platform);
  if (q.accountId) query = query.eq("social_account_id", q.accountId);
  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not load analytics.");
  return data ?? [];
});
