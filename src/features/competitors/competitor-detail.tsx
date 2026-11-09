"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ExternalLink, LineChart as ChartIcon, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { AI_SERVICES } from "@/config/ai";
import { apiFetch, toastError } from "@/hooks/use-api";
import type { CompetitorRow, CompetitorSnapshotRow } from "@/types/database";
import { CompetitorFormDialog } from "./competitor-form";
import { fmtMetric, platformLabel } from "./format";

interface Analysis {
  dataNotice: string;
  contentThemes: string[];
  postingFrequencyAssessment: string;
  engagementAssessment: string;
  formatsObserved: string[];
  strengths: string[];
  gaps: string[];
  opportunitiesForYou: string[];
  unavailableMetrics: string[];
}

export function CompetitorDetail({
  competitor,
  snapshots,
  aiReady,
  canEdit,
}: {
  competitor: CompetitorRow;
  snapshots: CompetitorSnapshotRow[];
  aiReady: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const latestWithAnalysis = [...snapshots].reverse().find((s) => s.analysis);
  const [analysis, setAnalysis] = useState<Analysis | null>((latestWithAnalysis?.analysis as unknown as Analysis) ?? null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");

  const chartData = snapshots.map((s) => ({
    date: format(new Date(s.captured_at), "d MMM"),
    followers: s.followers,
    postsPerWeek: s.posts_per_week,
    avgEngagement: s.avg_engagement,
  }));
  const hasFollowers = snapshots.some((s) => s.followers !== null);
  const hasOther = snapshots.some((s) => s.posts_per_week !== null || s.avg_engagement !== null);

  async function analyze() {
    setAnalyzing(true);
    setAnalysisError(null);
    const res = await apiFetch<{ analysis: Analysis }>(`/api/competitors/${competitor.id}/analyze`, {
      method: "POST",
      json: { extra: question.trim() || undefined },
    });
    setAnalyzing(false);
    if (!res.ok) {
      setAnalysisError(res.error.message);
      return toastError(res.error);
    }
    setAnalysis(res.data.analysis);
    toast.success("Analysis ready");
  }

  async function remove() {
    const res = await apiFetch(`/api/competitors/${competitor.id}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    toast.success("Competitor removed");
    router.push("/dashboard/competitors");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{competitor.name}</h1>
            <Badge variant="secondary">{platformLabel(competitor.platform)}</Badge>
          </div>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {competitor.handle && <span>@{competitor.handle}</span>}
            {competitor.profile_url && (
              <a href={competitor.profile_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                View public profile <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <CompetitorFormDialog
              competitor={competitor}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="size-4" /> Edit
                </Button>
              }
            />
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="size-4" /> Remove
                </Button>
              }
              title={`Remove ${competitor.name}?`}
              description="All recorded snapshots and analyses will be deleted."
              confirmLabel="Remove"
              destructive
              onConfirm={remove}
            />
          </div>
        )}
      </div>

      {competitor.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{competitor.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChartIcon className="size-4" /> Snapshot history
            </CardTitle>
            <CardDescription>Manually recorded public observations over time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {snapshots.length === 0 ? (
              <EmptyState title="No snapshots yet" description="Record what you can see publicly — follower count, posting frequency, typical engagement." className="py-8" />
            ) : (
              <>
                {snapshots.length > 1 && (hasFollowers || hasOther) ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {hasFollowers && (
                      <div className="h-56" role="img" aria-label="Follower count over time">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} width={48} tickFormatter={(v: number) => fmtMetric(v) ?? ""} />
                            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                            <Line type="monotone" dataKey="followers" name="Followers" stroke="var(--chart-1)" strokeWidth={2} connectNulls dot />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {hasOther && (
                      <div className="h-56" role="img" aria-label="Posting frequency and engagement over time">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="l" tick={{ fontSize: 11 }} width={36} />
                            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} width={40} />
                            <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Line yAxisId="l" type="monotone" dataKey="postsPerWeek" name="Posts / week" stroke="var(--chart-2)" strokeWidth={2} connectNulls />
                            <Line yAxisId="r" type="monotone" dataKey="avgEngagement" name="Avg. engagement" stroke="var(--chart-4)" strokeWidth={2} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Record at least two snapshots to see trends.</p>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Followers</TableHead>
                        <TableHead className="text-right">Posts / wk</TableHead>
                        <TableHead className="text-right">Avg. eng.</TableHead>
                        <TableHead>Themes</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...snapshots].reverse().map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="whitespace-nowrap">{format(new Date(s.captured_at), "d MMM yyyy")}</TableCell>
                          <NumCell v={s.followers} />
                          <NumCell v={s.posts_per_week} />
                          <NumCell v={s.avg_engagement} />
                          <TableCell className="max-w-48 truncate text-xs">{s.content_themes.join(", ") || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{s.source}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {canEdit && <SnapshotForm competitorId={competitor.id} onSaved={() => router.refresh()} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="text-primary size-4" /> AI analysis
          </CardTitle>
          <CardDescription>Based only on your notes and recorded snapshots. Uses {AI_SERVICES.competitor_analysis.credits} AI credits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canEdit && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="Optional question for the analysis"
                placeholder="Optional: what do you want to learn? e.g. which formats should I test?"
                value={question}
                maxLength={500}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <Button onClick={analyze} disabled={analyzing || !aiReady}>
                <Sparkles className="size-4" /> {analyzing ? "Analysing…" : analysis ? "Re-analyse" : "Analyse"}
              </Button>
            </div>
          )}
          {analyzing ? (
            <GenerationLoading label="Analysing your observations…" />
          ) : analysisError && !analysis ? (
            <GenerationError message={analysisError} onRetry={analyze} />
          ) : !analysis ? (
            <p className="text-muted-foreground text-sm">No analysis yet. Add notes or a snapshot, then run an analysis.</p>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle />
                <AlertDescription>{analysis.dataNotice}</AlertDescription>
              </Alert>
              <div className="grid gap-4 md:grid-cols-2">
                <Section title="Content themes" items={analysis.contentThemes} />
                <Section title="Formats observed" items={analysis.formatsObserved} />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Posting frequency</p>
                  <p className="text-muted-foreground">{analysis.postingFrequencyAssessment}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Public engagement indicators</p>
                  <p className="text-muted-foreground">{analysis.engagementAssessment}</p>
                </div>
                <Section title="Strengths" items={analysis.strengths} />
                <Section title="Gaps" items={analysis.gaps} />
              </div>
              <div className="bg-primary/5 border-primary/20 rounded-lg border p-4">
                <Section title="Opportunities for you" items={analysis.opportunitiesForYou} />
              </div>
              {analysis.unavailableMetrics.length > 0 && (
                <p className="text-muted-foreground text-xs">Not available from your data: {analysis.unavailableMetrics.join(", ")}.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NumCell({ v }: { v: number | null }) {
  const f = fmtMetric(v);
  return <TableCell className={f ? "text-right tabular-nums" : "text-muted-foreground text-right text-xs"}>{f ?? "Not available"}</TableCell>;
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">{title}</p>
      {items.length ? (
        <ul className="text-muted-foreground list-disc space-y-0.5 pl-4">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Not enough data.</p>
      )}
    </div>
  );
}

function SnapshotForm({ competitorId, onSaved }: { competitorId: string; onSaved: () => void }) {
  const [followers, setFollowers] = useState("");
  const [posts, setPosts] = useState("");
  const [eng, setEng] = useState("");
  const [themes, setThemes] = useState("");
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/,/g, "")));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const values = [num(followers), num(posts), num(eng)];
    if (values.some((v) => v !== null && (!Number.isFinite(v) || v < 0))) return setErr("Enter positive numbers only.");
    const contentThemes = themes
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20);
    if (values.every((v) => v === null) && !contentThemes.length) return setErr("Enter at least one observation.");
    setBusy(true);
    const res = await apiFetch(`/api/competitors/${competitorId}/snapshots`, {
      method: "POST",
      json: {
        followers: values[0] === null ? null : Math.round(values[0]),
        postsPerWeek: values[1],
        avgEngagement: values[2],
        contentThemes,
        capturedAt: new Date(`${date}T12:00:00`).toISOString(),
      },
    });
    setBusy(false);
    if (!res.ok) return toastError(res.error);
    toast.success("Snapshot recorded");
    setFollowers("");
    setPosts("");
    setEng("");
    setThemes("");
    onSaved();
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="size-4" /> Record a snapshot
        </CardTitle>
        <CardDescription>Leave blank anything you can&apos;t see publicly.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <Field label="Observed on" htmlFor="s-date">
            <Input id="s-date" type="date" value={date} max={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Followers" htmlFor="s-followers">
            <Input id="s-followers" inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Posts per week" htmlFor="s-posts">
              <Input id="s-posts" inputMode="decimal" value={posts} onChange={(e) => setPosts(e.target.value)} />
            </Field>
            <Field label="Avg. engagement" htmlFor="s-eng" hint="Per post">
              <Input id="s-eng" inputMode="decimal" value={eng} onChange={(e) => setEng(e.target.value)} />
            </Field>
          </div>
          <Field label="Content themes" htmlFor="s-themes" hint="Comma-separated">
            <Textarea id="s-themes" rows={2} value={themes} onChange={(e) => setThemes(e.target.value)} />
          </Field>
          {err && (
            <p role="alert" className="text-destructive text-xs">
              {err}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save snapshot"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
