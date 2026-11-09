"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { OptionSelect } from "@/components/forms/option-select";
import { AIToolLayout } from "@/components/content/ai-tool-layout";
import { GenerationEmpty, GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { CopyButton } from "@/components/shared/copy-button";
import { AI_OPTIONS } from "@/config/ai";
import { apiFetch, useAIGeneration } from "@/hooks/use-api";
import { CreditNote, REPURPOSE_TARGET_LABELS, UsageFooter, tagsText, type RepurposeTarget } from "../shared";

const TARGETS = Object.keys(REPURPOSE_TARGET_LABELS) as RepurposeTarget[];

const formSchema = z.object({
  original: z.string().trim().min(10, "Paste your original content or idea (at least 10 characters).").max(5000),
  targets: z.array(z.string()).min(1, "Pick at least one output."),
  tone: z.string().optional(),
  language: z.string().min(1),
});
type FormValues = z.infer<typeof formSchema>;

interface RepurposeOutput {
  versions: { target: string; platform: string; title: string; parts: string[]; caption: string; hashtags: string[]; adaptationNotes: string }[];
}

function versionText(v: RepurposeOutput["versions"][number]) {
  const parts = v.parts.length > 1 ? v.parts.map((p, i) => `${i + 1}. ${p}`).join("\n\n") : (v.parts[0] ?? "");
  return [parts, v.caption, tagsText(v.hashtags)].filter(Boolean).join("\n\n");
}

const partLabel = (target: string) =>
  target.includes("carousel") ? "Slide" : target.includes("thread") ? "Post" : target.includes("script") ? "Beat" : "Part";

export function RepurposeTool({ aiReady, fromId }: { aiReady: boolean; fromId?: string }) {
  const { generate, regenerate, loading, error, result, setResult } = useAIGeneration<FormValues, RepurposeOutput>("repurpose");
  const [prefilling, setPrefilling] = useState(Boolean(fromId));
  const { register, handleSubmit, control, formState, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { original: "", targets: ["instagram_carousel", "linkedin_post", "x_thread"], tone: "", language: "English" },
  });

  useEffect(() => {
    if (!fromId) return;
    let cancelled = false;
    (async () => {
      const res = await apiFetch<{ body_text: string; title: string }>(`/api/content/generated/${fromId}`);
      if (cancelled) return;
      setPrefilling(false);
      if (res.ok) {
        setValue("original", res.data.body_text.slice(0, 5000), { shouldValidate: true });
        toast.success("Loaded your content — choose outputs and generate");
      } else toast.error("Couldn't load that content. Paste it below instead.");
    })();
    return () => {
      cancelled = true;
    };
  }, [fromId, setValue]);

  const out = result?.output;

  return (
    <AIToolLayout
      formDescription="One idea in, many platform-native versions out."
      form={
        <form onSubmit={handleSubmit((v) => generate({ ...v, tone: v.tone || undefined }))} className="space-y-4" noValidate>
          <Field label="Original content or idea" htmlFor="original" required error={formState.errors.original?.message}>
            <div className="relative">
              <Textarea
                id="original"
                rows={7}
                placeholder="e.g. Five ways to improve your business…"
                aria-invalid={!!formState.errors.original}
                disabled={prefilling}
                {...register("original")}
              />
              {prefilling && (
                <span className="text-muted-foreground absolute inset-0 flex items-center justify-center gap-2 text-sm">
                  <Loader2 className="size-4 animate-spin" /> Loading content…
                </span>
              )}
            </div>
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Create versions for</legend>
            <Controller
              control={control}
              name="targets"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {TARGETS.map((t) => (
                    <label key={t} className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(t)}
                        onCheckedChange={(c) => field.onChange(c ? [...field.value, t] : field.value.filter((v) => v !== t))}
                      />
                      {REPURPOSE_TARGET_LABELS[t]}
                    </label>
                  ))}
                </div>
              )}
            />
            {formState.errors.targets && <p className="text-destructive text-xs">{formState.errors.targets.message}</p>}
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tone" htmlFor="tone">
              <Controller control={control} name="tone" render={({ field }) => <OptionSelect id="tone" value={field.value} onChange={field.onChange} options={AI_OPTIONS.tones} placeholder="Brand default" />} />
            </Field>
            <Field label="Language" htmlFor="language">
              <Controller control={control} name="language" render={({ field }) => <OptionSelect id="language" value={field.value} onChange={field.onChange} options={AI_OPTIONS.languages} />} />
            </Field>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !aiReady || prefilling}>
            <Sparkles className="size-4" /> {loading ? "Repurposing…" : "Repurpose content"}
          </Button>
          <CreditNote service="repurpose" />
        </form>
      }
      results={
        loading && !result ? (
          <GenerationLoading label="Adapting for each platform…" />
        ) : error && !result ? (
          <GenerationError message={error.message} onRetry={regenerate} />
        ) : !out || !result ? (
          <GenerationEmpty title="Platform versions will appear here" description="Each version is adapted to its platform — not copied word for word." />
        ) : (
          <>
            {error && <GenerationError message={error.message} />}
            <GenerationToolbar
              key={result.generationId ?? "none"}
              generationId={result.generationId}
              text={out.versions.map((v) => `## ${REPURPOSE_TARGET_LABELS[v.target as RepurposeTarget] ?? v.target}\n${versionText(v)}`).join("\n\n")}
              onRegenerate={regenerate}
              regenerating={loading}
              showCalendar={false}
              showRepurpose={false}
              onDeleted={() => setResult(null)}
            />
            {out.versions.map((v, i) => (
              <VersionCard key={`${result.generationId}-${i}`} version={v} generationId={result.generationId} />
            ))}
            <UsageFooter used={result.creditsUsed} remaining={result.creditsRemaining} />
          </>
        )
      }
    />
  );
}

function VersionCard({ version: v, generationId }: { version: RepurposeOutput["versions"][number]; generationId: string | null }) {
  const label = REPURPOSE_TARGET_LABELS[v.target as RepurposeTarget] ?? v.target;
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{label}</Badge>
          <CopyButton size="sm" variant="ghost" text={versionText(v)} />
        </div>
        <CardTitle className="text-base">{v.title}</CardTitle>
        <p className="text-muted-foreground text-xs">{v.adaptationNotes}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {v.parts.length > 1 ? (
          <ol className="space-y-2">
            {v.parts.map((p, i) => (
              <li key={i} className="bg-muted/40 rounded-lg border p-3 text-sm">
                <span className="text-muted-foreground mb-1 block text-[11px] font-medium uppercase">
                  {partLabel(v.target)} {i + 1}
                </span>
                <span className="whitespace-pre-wrap">{p}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{v.parts[0]}</p>
        )}
        {v.caption && (
          <p className="text-sm">
            <span className="font-medium">Caption: </span>
            {v.caption}
          </p>
        )}
        {v.hashtags.length > 0 && <p className="text-primary text-sm">{tagsText(v.hashtags)}</p>}
        <GenerationToolbar
          generationId={null}
          text={versionText(v)}
          platform={v.platform}
          showRepurpose={false}
          // Per-version scheduling links back to the parent generation.
          key={`${generationId}-${v.target}`}
        />
      </CardContent>
    </Card>
  );
}
