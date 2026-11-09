"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { OptionSelect, PlatformSelect } from "@/components/forms/option-select";
import { AIToolLayout } from "@/components/content/ai-tool-layout";
import { GenerationEmpty, GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { AI_OPTIONS } from "@/config/ai";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { useAIGeneration } from "@/hooks/use-api";
import { CreditNote, UsageFooter, tag, tagsText } from "../shared";

const formSchema = z.object({
  platform: z.string().min(1, "Choose a platform."),
  niche: z.string().max(120).optional(),
  topic: z.string().trim().min(3, "Enter a topic (at least 3 characters).").max(300),
  targetAudience: z.string().max(200).optional(),
  format: z.string().min(1, "Choose a format."),
  tone: z.string().min(1, "Choose a tone."),
  objective: z.string().min(1, "Choose an objective."),
  length: z.enum(["Short", "Medium", "Long"]),
  language: z.string().min(1),
  extraInstructions: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface StudioOutput {
  title: string;
  hook: string;
  body: string;
  callToAction: string;
  hashtags: string[];
  visualSuggestion: string;
  bestPracticeNotes: string[];
}

export function ContentStudio({
  aiReady,
  defaults,
}: {
  aiReady: boolean;
  defaults: { platform?: string; topic?: string; format?: string; niche?: string; audience?: string };
}) {
  const { generate, regenerate, loading, error, result, setResult } = useAIGeneration<FormValues, StudioOutput>("content_studio");
  const { register, handleSubmit, control, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: defaults.platform && isPlatformId(defaults.platform) ? defaults.platform : "instagram",
      niche: defaults.niche ?? "",
      topic: defaults.topic ?? "",
      targetAudience: defaults.audience ?? "",
      format: defaults.format && (AI_OPTIONS.formats as readonly string[]).includes(defaults.format) ? defaults.format : "Carousel",
      tone: "Friendly",
      objective: "Improve engagement",
      length: "Medium",
      language: "English",
      extraInstructions: "",
    },
  });
  const platform = useWatch({ control, name: "platform" });
  const limit = isPlatformId(platform) ? PLATFORMS[platform].textLimit : null;
  const out = result?.output;
  const text = out ? [out.body, out.callToAction, tagsText(out.hashtags)].filter(Boolean).join("\n\n") : "";

  return (
    <AIToolLayout
      formDescription="Tell the AI what to create. Your brand profile is applied automatically."
      form={
        <form onSubmit={handleSubmit((v) => generate(v))} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform" htmlFor="platform" required error={formState.errors.platform?.message}>
              <Controller control={control} name="platform" render={({ field }) => <PlatformSelect id="platform" value={field.value} onChange={field.onChange} />} />
            </Field>
            <Field label="Format" htmlFor="format" required error={formState.errors.format?.message}>
              <Controller control={control} name="format" render={({ field }) => <OptionSelect id="format" value={field.value} onChange={field.onChange} options={AI_OPTIONS.formats} />} />
            </Field>
          </div>
          <Field label="Topic" htmlFor="topic" required error={formState.errors.topic?.message}>
            <Textarea id="topic" rows={3} placeholder="e.g. 3 mistakes first-time founders make with pricing" aria-invalid={!!formState.errors.topic} {...register("topic")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Niche" htmlFor="niche">
              <Input id="niche" placeholder="e.g. Fintech" {...register("niche")} />
            </Field>
            <Field label="Target audience" htmlFor="targetAudience">
              <Input id="targetAudience" placeholder="e.g. SME owners" {...register("targetAudience")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tone" htmlFor="tone" required>
              <Controller control={control} name="tone" render={({ field }) => <OptionSelect id="tone" value={field.value} onChange={field.onChange} options={AI_OPTIONS.tones} />} />
            </Field>
            <Field label="Objective" htmlFor="objective" required>
              <Controller control={control} name="objective" render={({ field }) => <OptionSelect id="objective" value={field.value} onChange={field.onChange} options={AI_OPTIONS.objectives} />} />
            </Field>
            <Field label="Length" htmlFor="length">
              <Controller control={control} name="length" render={({ field }) => <OptionSelect id="length" value={field.value} onChange={(v) => field.onChange(v)} options={AI_OPTIONS.lengths} />} />
            </Field>
            <Field label="Language" htmlFor="language">
              <Controller control={control} name="language" render={({ field }) => <OptionSelect id="language" value={field.value} onChange={field.onChange} options={AI_OPTIONS.languages} />} />
            </Field>
          </div>
          <Field label="Extra instructions" htmlFor="extraInstructions" hint="Optional: offers, keywords to include, things to avoid.">
            <Textarea id="extraInstructions" rows={2} {...register("extraInstructions")} />
          </Field>
          <Button type="submit" className="w-full" disabled={loading || !aiReady}>
            <Sparkles className="size-4" /> {loading ? "Generating…" : "Generate post"}
          </Button>
          <CreditNote service="content_studio" />
        </form>
      }
      results={
        loading && !result ? (
          <GenerationLoading label="Writing your post…" />
        ) : error && !result ? (
          <GenerationError message={error.message} onRetry={regenerate} />
        ) : !out || !result ? (
          <GenerationEmpty title="Your post will appear here" description="Choose a platform, topic and objective, then generate." />
        ) : (
          <>
            {error && <GenerationError message={error.message} />}
            <Card>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{isPlatformId(platform) ? PLATFORMS[platform].name : platform}</Badge>
                  <span className={limit && out.body.length > limit ? "text-destructive text-xs" : "text-muted-foreground text-xs tabular-nums"}>
                    {out.body.length}
                    {limit ? ` / ${limit}` : ""} chars
                  </span>
                </div>
                <CardTitle className="text-lg">{out.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Hook</p>
                  <p className="text-sm font-medium">{out.hook}</p>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{out.body}</p>
                <p className="text-sm">
                  <span className="font-medium">CTA: </span>
                  {out.callToAction}
                </p>
                {out.hashtags.length > 0 && <p className="text-primary text-sm">{out.hashtags.map(tag).join(" ")}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="mb-1 font-medium">Visual suggestion</p>
                    <p className="text-muted-foreground">{out.visualSuggestion}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="mb-1 flex items-center gap-1 font-medium">
                      <Lightbulb className="size-3.5" /> Posting notes
                    </p>
                    <ul className="text-muted-foreground list-disc space-y-1 pl-4">
                      {out.bestPracticeNotes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <GenerationToolbar
                  key={result.generationId ?? "none"}
                  generationId={result.generationId}
                  text={text}
                  platform={platform}
                  onRegenerate={regenerate}
                  regenerating={loading}
                  onEdited={(t) => setResult({ ...result, output: { ...out, body: t, callToAction: "", hashtags: [] } })}
                  onDeleted={() => setResult(null)}
                />
              </CardContent>
            </Card>
            <UsageFooter used={result.creditsUsed} remaining={result.creditsRemaining} />
          </>
        )
      }
    />
  );
}
