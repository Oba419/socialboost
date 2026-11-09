import { NextResponse } from "next/server";
import { parseQuery, route } from "@/lib/api/handler";
import { requireApiUser } from "@/lib/auth/session";
import { assertFeature } from "@/lib/entitlements";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { analyticsQuerySchema } from "@/features/analytics/schemas";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { csvCell } from "@/features/analytics/csv";

/** GET /api/analytics/export?from&to[&platform][&accountId] — CSV report. */
export const GET = route(async (req) => {
  const ctx = await requireApiUser();
  await assertFeature(ctx, "report_export");
  const q = parseQuery(req, analyticsQuerySchema);
  const supabase = await createClient();

  let query = supabase
    .from("social_account_metrics")
    .select("platform, social_account_id, metric_date, metric_key, platform_metric_name, value, source, social_accounts(username, display_name)")
    .eq("organization_id", ctx.organization.id)
    .in("source", ["api", "manual", "import"])
    .gte("metric_date", q.from)
    .lte("metric_date", q.to)
    .order("metric_date", { ascending: true })
    .limit(50000);
  if (q.platform) query = query.eq("platform", q.platform);
  if (q.accountId) query = query.eq("social_account_id", q.accountId);
  const { data, error } = await query;
  if (error) throw new AppError("INTERNAL_ERROR", "Could not build the export.");

  const header = ["date", "platform", "account", "metric", "platform_metric_name", "value", "source"];
  const lines = [header.join(",")];
  for (const r of data ?? []) {
    const acct = r.social_accounts as unknown as { username: string | null; display_name: string | null } | null;
    lines.push(
      [
        r.metric_date,
        isPlatformId(r.platform) ? PLATFORMS[r.platform].name : r.platform,
        acct?.display_name ?? acct?.username ?? (r.social_account_id ? "" : "manual (no account)"),
        r.metric_key,
        r.platform_metric_name ?? "",
        r.value,
        r.source,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics_${q.from}_${q.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
