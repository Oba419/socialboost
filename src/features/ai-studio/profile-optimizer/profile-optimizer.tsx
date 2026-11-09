"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info, Sparkles, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { PlatformSelect } from "@/components/forms/option-select";
import { AIToolLayout } from "@/components/content/ai-tool-layout";
import { GenerationEmpty, GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { CopyButton } from "@/components/shared/copy-button";
import { useAIGeneration } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { CreditNote, UsageFooter } from "../shared";

const formSchema = z.object({
  platform: z.string().min(1, "Choose a platform."),
  bio: z.string().trim().min(5, "Paste your current bio.").max(1500),
  profileUrl: z.union([z.literal(""), z.string().trim().url("Enter a valid URL (including https://).")]).optional(),
  displayName: z.string().max(100).optional(),
  username: z.string().max(100).optional(),
  link: z.string().max(300).optional(),
  category: z.string().max(100).optional(),
  goal: z.string().max(200).optional(),
});
type FormValues = z.infer<typeof formSchema>;

type Scored = { score: number; assessment: string; recommendation: string };
interface ProfileOutput {
  overallScore: number;
  summary: string;
  positioning: Scored;
  bioClarity: Scored;
  keywords: { score: number; present: string[]; suggested: string[]; recommendation: string };
  callToAction: Scored;
  brandIdentity: Scored;
  audienceRelevance: Scored;
  completeness: { score: number; missing: string[]; recommendation: string };
  alternativeBios: { angle: string; bio: string; characterCount: number }[];
  quickWins: string[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const tone = (n: number) => (n >= 75 ? "text-success" : n >= 50 ? "text-warning" : "text-destructive");

function ScoreCard({ title, score, children }: { title: string; score: number; children: React.ReactNode }) {
  const s = clamp(score);
  return (
    <Card>
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{title}</CardTitle>
          <span className={cn("text-sm font-semibold tabular-nums", tone(s))}>{s}/100</span>
        </div>
        <Progress value={s} aria-label={`${title} score ${s} out of 100`} />
      </CardHeader>
      <CardContent className="space-y-2 text-sm">{children}</CardContent>
    </Card>
  );
}

const optional = (v?: string) => (v && v.trim() ? v.trim() : undefined);

export function ProfileOptimizer({ aiReady, defaultPlatform }: { aiReady: boolean; defaultPlatform?: string }) {
  const { generate, regenerate, loading, error, result, setResult } = useAIGeneration<FormValues, ProfileOutput>("profile_optimizer");
  const { register, handleSubmit, control, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { platform: defaultPlatform ?? "instagram", bio: "", profileUrl: "", displayName: "", username: "", link: "", category: "", goal: "" },
  });
  const out = result?.output;
  const scored: [string, Scored][] = out
    ? [
        ["Positioning", out.positioning],
        ["Bio clarity", out.bioClarity],
        ["Call to action", out.callToAction],
        ["Brand identity", out.brandIdentity],
        ["Audience relevance", out.audienceRelevance],
      ]
    : [];

  return (
    <AIToolLayout
      formDescription="Paste your profile details. The AI analyses only what you enter here."
      form={
        <form
          onSubmit={handleSubmit((v) =>
            generate({
              platform: v.platform,
              bio: v.bio,
              profileUrl: optional(v.profileUrl),
              displayName: optional(v.displayName),
              username: optional(v.username),
              link: optional(v.link),
              category: optional(v.category),
              goal: optional(v.goal),
            }),
          )}
          className="space-y-4"
          noValidate
        >
          <Field label="Platform" htmlFor="platform" required>
            <Controller control={control} name="platform" render={({ field }) => <PlatformSelect id="platform" value={field.value} onChange={field.onChange} />} />
          </Field>
          <Field label="Current bio" htmlFor="bio" required error={formState.errors.bio?.message}>
            <Textarea id="bio" rows={4} aria-invalid={!!formState.errors.bio} {...register("bio")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Display name" htmlFor="displayName">
              <Input id="displayName" {...register("displayName")} />
            </Field>
            <Field label="Username" htmlFor="username">
              <Input id="username" placeholder="@handle" {...register("username")} />
            </Field>
            <Field label="Category" htmlFor="category">
              <Input id="category" placeholder="e.g. Fitness coach" {...register("category")} />
            </Field>
            <Field label="Link in bio" htmlFor="link">
              <Input id="link" placeholder="yourshop.com" {...register("link")} />
            </Field>
          </div>
          <Field label="Profile URL (reference only)" htmlFor="profileUrl" error={formState.errors.profileUrl?.message} hint="The AI cannot open links or see private data.">
            <Input id="profileUrl" type="url" placeholder="https://" {...register("profileUrl")} />
          </Field>
          <Field label="What should your profile achieve?" htmlFor="goal">
            <Input id="goal" placeholder="e.g. Get coaching enquiries" {...register("goal")} />
          </Field>
          <Button type="submit" className="w-full" disabled={loading || !aiReady}>
            <Sparkles className="size-4" /> {loading ? "Analysing…" : "Analyse profile"}
          </Button>
          <CreditNote service="profile_optimizer" />
        </form>
      }
      results={
        loading && !result ? (
          <GenerationLoading label="Reviewing your profile…" />
        ) : error && !result ? (
          <GenerationError message={error.message} onRetry={regenerate} />
        ) : !out || !result ? (
          <GenerationEmpty title="Your profile review will appear here" description="Get scores, recommendations and alternative bios." />
        ) : (
          <>
            <Alert>
              <Info />
              <AlertDescription>
                This review is based only on the details you entered. Scores are qualitative AI assessments, not platform metrics.
              </AlertDescription>
            </Alert>
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
                <div className="text-center">
                  <p className={cn("text-4xl font-semibold tabular-nums", tone(clamp(out.overallScore)))}>{clamp(out.overallScore)}</p>
                  <p className="text-muted-foreground text-xs">Overall score</p>
                </div>
                <p className="text-sm sm:border-l sm:pl-4">{out.summary}</p>
              </CardContent>
            </Card>
            {out.quickWins.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="text-primary size-4" /> Quick wins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {out.quickWins.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {scored.map(([title, s]) => (
                <ScoreCard key={title} title={title} score={s.score}>
                  <p className="text-muted-foreground">{s.assessment}</p>
                  <p>
                    <span className="font-medium">Recommendation: </span>
                    {s.recommendation}
                  </p>
                </ScoreCard>
              ))}
              <ScoreCard title="Keywords" score={out.keywords.score}>
                {out.keywords.present.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {out.keywords.present.map((k) => (
                      <Badge key={k} variant="secondary">{k}</Badge>
                    ))}
                  </div>
                )}
                {out.keywords.suggested.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-muted-foreground text-xs">Add:</span>
                    {out.keywords.suggested.map((k) => (
                      <Badge key={k} variant="outline">{k}</Badge>
                    ))}
                  </div>
                )}
                <p>{out.keywords.recommendation}</p>
              </ScoreCard>
              <ScoreCard title="Completeness" score={out.completeness.score}>
                {out.completeness.missing.length > 0 && <p className="text-muted-foreground">Missing: {out.completeness.missing.join(", ")}</p>}
                <p>{out.completeness.recommendation}</p>
              </ScoreCard>
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Alternative bios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {out.alternativeBios.map((b, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Badge variant="secondary">{b.angle}</Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs tabular-nums">{b.bio.length} chars</span>
                        <CopyButton size="icon" variant="ghost" label="Copy bio" text={b.bio} />
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{b.bio}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <GenerationToolbar
              key={result.generationId ?? "none"}
              generationId={result.generationId}
              text={out.alternativeBios.map((b) => `${b.angle}:\n${b.bio}`).join("\n\n")}
              onRegenerate={regenerate}
              regenerating={loading}
              showCalendar={false}
              showRepurpose={false}
              onDeleted={() => setResult(null)}
            />
            <UsageFooter used={result.creditsUsed} remaining={result.creditsRemaining} />
          </>
        )
      }
    />
  );
}
