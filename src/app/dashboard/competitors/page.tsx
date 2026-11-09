import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { CompetitorFormDialog } from "@/features/competitors/competitor-form";
import { platformLabel, fmtMetric } from "@/features/competitors/format";
import { loadDashboardPage } from "@/lib/auth/page";
import { createClient } from "@/lib/supabase/server";
import type { CompetitorSnapshotRow } from "@/types/database";

export const metadata = { title: "Competitor Research" };

export default async function CompetitorsPage() {
  const { ctx, ent, locked } = await loadDashboardPage("competitor_research");
  const header = (
    <PageHeader
      icon={Users}
      title="Competitor Research"
      description="Track competitors from public observations and authorised data, compare available metrics and find opportunities."
      actions={!locked && ctx.role !== "viewer" ? <CompetitorFormDialog /> : undefined}
    />
  );
  if (locked) {
    return (
      <div className="space-y-6">
        {header}
        <UpgradePrompt feature="competitor_research" currentPlan={ent.plan.name} />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: competitors } = await supabase
    .from("competitors")
    .select("*")
    .eq("organization_id", ctx.organization.id)
    .order("created_at", { ascending: false });
  const ids = (competitors ?? []).map((c) => c.id);
  const { data: snaps } = ids.length
    ? await supabase.from("competitor_snapshots").select("*").in("competitor_id", ids).order("captured_at", { ascending: false })
    : { data: [] as CompetitorSnapshotRow[] };
  const latest = (id: string) => (snaps ?? []).find((s) => s.competitor_id === id) ?? null;

  return (
    <div className="space-y-6">
      {header}
      <Alert>
        <ShieldCheck />
        <AlertDescription>
          All competitor data here is entered by you from public observation (or from authorised APIs). We don&apos;t scrape profiles or access private information. Metrics you haven&apos;t recorded are shown as &ldquo;Not available&rdquo;.
        </AlertDescription>
      </Alert>

      {!competitors?.length ? (
        <EmptyState
          icon={Users}
          title="No competitors yet"
          description="Add brands or creators in your space to compare public metrics and spot opportunities."
          action={ctx.role !== "viewer" ? <CompetitorFormDialog /> : undefined}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {competitors.map((c) => {
              const s = latest(c.id);
              return (
                <Link key={c.id} href={`/dashboard/competitors/${c.id}`} className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2">
                  <Card className="hover:border-primary/40 h-full transition-colors">
                    <CardHeader className="gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="truncate text-base">{c.name}</CardTitle>
                        <Badge variant="secondary">{platformLabel(c.platform)}</Badge>
                      </div>
                      {c.handle && <p className="text-muted-foreground text-sm">@{c.handle}</p>}
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <Stat label="Followers" value={fmtMetric(s?.followers)} />
                        <Stat label="Posts / wk" value={fmtMetric(s?.posts_per_week)} />
                        <Stat label="Avg. eng." value={fmtMetric(s?.avg_engagement)} />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {s ? `Last observed ${formatDistanceToNow(new Date(s.captured_at), { addSuffix: true })}` : "No observations recorded yet"}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparison (latest recorded public metrics)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Followers</TableHead>
                    <TableHead className="text-right">Posts / week</TableHead>
                    <TableHead className="text-right">Avg. engagement</TableHead>
                    <TableHead>Observed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitors.map((c) => {
                    const s = latest(c.id);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          <Link href={`/dashboard/competitors/${c.id}`} className="hover:underline">
                            {c.name}
                          </Link>
                        </TableCell>
                        <TableCell>{platformLabel(c.platform)}</TableCell>
                        <MetricCell value={s?.followers} />
                        <MetricCell value={s?.posts_per_week} />
                        <MetricCell value={s?.avg_engagement} />
                        <TableCell className="text-muted-foreground text-xs">{s ? new Date(s.captured_at).toLocaleDateString() : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-muted-foreground mt-3 text-xs">
                Metrics are only comparable within the same platform. &ldquo;Avg. engagement&rdquo; is whatever per-post figure you recorded (e.g. average likes + comments); it is not a platform-verified rate.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-muted/50 rounded-md p-2">
      <p className={value ? "font-semibold tabular-nums" : "text-muted-foreground text-xs"}>{value ?? "Not available"}</p>
      <p className="text-muted-foreground text-[11px]">{label}</p>
    </div>
  );
}

function MetricCell({ value }: { value: number | null | undefined }) {
  const v = fmtMetric(value);
  return <TableCell className={v ? "text-right tabular-nums" : "text-muted-foreground text-right text-xs"}>{v ?? "Not available"}</TableCell>;
}
