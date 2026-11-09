import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { PLATFORM_IDS, type PlatformId } from "@/config/platforms";
import { AnalyticsView } from "@/features/analytics/analytics-view";
import { loadMetricRows, readFilters, type SearchParams } from "@/features/analytics/load";
import { RangeFilter } from "@/features/analytics/range-filter";
import { loadDashboardPage } from "@/lib/auth/page";
import { hasFeature } from "@/lib/entitlements";
import { isDemoMode, isOpenAIConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { ctx, ent, locked } = await loadDashboardPage("analytics");
  const f = readFilters(await searchParams);

  if (locked) {
    return (
      <div className="space-y-6">
        <PageHeader icon={BarChart3} title="Analytics" description="Performance across your connected and manually tracked platforms." />
        <UpgradePrompt feature="analytics" currentPlan={ent.plan.name} />
      </div>
    );
  }

  const supabase = await createClient();
  const [rows, accountsRes, manualRes] = await Promise.all([
    loadMetricRows(supabase, ctx.organization.id, f),
    supabase.from("social_accounts").select("id, platform, username, display_name").eq("organization_id", ctx.organization.id),
    supabase
      .from("social_account_metrics")
      .select("id, platform, social_account_id, metric_date, metric_key, value, source")
      .eq("organization_id", ctx.organization.id)
      .in("source", ["manual", "import"])
      .order("created_at", { ascending: false })
      .limit(25),
  ]);
  const accounts = (accountsRes.data ?? []).map((a) => ({
    id: a.id,
    platform: a.platform,
    label: `${a.display_name ?? a.username ?? a.platform}`,
  }));
  const platforms = [
    ...new Set<string>([...ctx.organization.platforms, ...accounts.map((a) => a.platform), ...rows.map((r) => r.platform)]),
  ].filter((p): p is PlatformId => (PLATFORM_IDS as string[]).includes(p));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        description="Platform-specific performance. Metrics are never combined across platforms, and every figure shows where it came from."
        actions={
          <RangeFilter range={f.range} from={f.from} to={f.to} platform={f.platform} accountId={f.accountId} platforms={platforms} accounts={accounts} />
        }
      />
      <AnalyticsView
        rows={rows}
        from={f.from}
        to={f.to}
        rangeLabel={f.label}
        platformFilter={f.platform}
        accountFilter={f.accountId}
        platforms={platforms.length ? platforms : (["instagram", "tiktok"] as PlatformId[])}
        accounts={accounts}
        manualEntries={(manualRes.data ?? []).map((m) => ({ ...m, value: Number(m.value) }))}
        canEdit={ctx.role !== "viewer"}
        canExport={hasFeature(ent.plan, "report_export")}
        aiReady={isOpenAIConfigured()}
        demoMode={isDemoMode()}
      />
    </div>
  );
}
