"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OptionSelect } from "@/components/forms/option-select";
import { AIUnavailable, GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { apiFetch, toastError, type AIResult } from "@/hooks/use-api";

interface ReviewOutput {
  headline: string;
  dataQualityNote: string;
  whatWorked: string[];
  whatToImprove: string[];
  recommendations: { action: string; rationale: string; priority: "high" | "medium" | "low" }[];
  experimentsToRun: string[];
}

export function AIReviewPanel({ aiReady, hasData }: { aiReady: boolean; hasData: boolean }) {
  const [period, setPeriod] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIResult<ReviewOutput> | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    const res = await apiFetch<AIResult<ReviewOutput>>("/api/analytics/review", { method: "POST", json: { periodDays: Number(period) } });
    setLoading(false);
    if (!res.ok) {
      setError(res.error.message);
      return toastError(res.error);
    }
    setResult(res.data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="text-primary size-4" /> AI performance review
        </CardTitle>
        <CardDescription>
          Recommendations based only on your stored real data (live, manual and imported). Demo data is never sent.
          {!hasData && " With no data yet, the review will be framed as initial hypotheses."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!aiReady && <AIUnavailable />}
        <div className="flex flex-wrap items-center gap-2">
          <OptionSelect
            className="w-40"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ]}
          />
          <Button onClick={run} disabled={!aiReady || loading}>
            <Sparkles className="size-4" /> {loading ? "Analysing…" : result ? "Regenerate review" : "Generate review"}
          </Button>
          <span className="text-muted-foreground text-xs">Uses 3 AI credits</span>
        </div>
        {loading && <GenerationLoading label="Reviewing your performance…" />}
        {error && !loading && <GenerationError message={error} onRetry={run} />}
        {result && !loading && (
          <div className="space-y-4 text-sm">
            <p className="text-base font-medium">{result.output.headline}</p>
            <p className="text-muted-foreground bg-muted rounded-md p-2 text-xs">{result.output.dataQualityNote}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <List title="What worked" items={result.output.whatWorked} />
              <List title="What to improve" items={result.output.whatToImprove} />
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Recommendations</h4>
              <ul className="space-y-2">
                {result.output.recommendations.map((r, i) => (
                  <li key={i} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{r.action}</p>
                      <Badge variant={r.priority === "high" ? "default" : "secondary"}>{r.priority}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">{r.rationale}</p>
                  </li>
                ))}
              </ul>
            </div>
            <List title="Experiments to run" items={result.output.experimentsToRun} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-1">
      <h4 className="font-medium">{title}</h4>
      <ul className="text-muted-foreground list-disc space-y-1 pl-5">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
