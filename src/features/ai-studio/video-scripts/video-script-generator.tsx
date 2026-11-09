"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clapperboard, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { OptionSelect } from "@/components/forms/option-select";
import { AIToolLayout } from "@/components/content/ai-tool-layout";
import { GenerationEmpty, GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { CopyButton } from "@/components/shared/copy-button";
import { AI_OPTIONS } from "@/config/ai";
import { useAIGeneration } from "@/hooks/use-api";
import { CreditNote, UsageFooter, VIDEO_TARGET_OPTIONS } from "../shared";

const formSchema = z.object({
  target: z.enum(VIDEO_TARGET_OPTIONS),
  topic: z.string().trim().min(3, "Enter a topic.").max(300),
  duration: z.string().min(1),
  tone: z.string().optional(),
  objective: z.string().optional(),
  targetAudience: z.string().max(200).optional(),
  language: z.string().min(1),
});
type FormValues = z.infer<typeof formSchema>;

interface ScriptOutput {
  title: string;
  openingHook: string;
  introduction: string;
  scenes: { timestamp: string; talkingPoint: string; sceneSuggestion: string; voiceover: string; onScreenText: string }[];
  callToAction: string;
  suggestedCaption: string;
  suggestedTitles: string[];
  productionTips: string[];
}

const PLATFORM_FOR: Record<FormValues["target"], string> = {
  TikTok: "tiktok",
  "Instagram Reels": "instagram",
  "YouTube Shorts": "youtube",
  "YouTube (long-form)": "youtube",
  "Facebook video": "facebook",
};

function scriptText(o: ScriptOutput) {
  return [
    o.title,
    `HOOK: ${o.openingHook}`,
    `INTRO: ${o.introduction}`,
    ...o.scenes.map((s) => `[${s.timestamp}] ${s.talkingPoint}\nScene: ${s.sceneSuggestion}\nVO: ${s.voiceover}\nOn-screen: ${s.onScreenText}`),
    `CTA: ${o.callToAction}`,
    `Caption: ${o.suggestedCaption}`,
  ].join("\n\n");
}

export function VideoScriptGenerator({ aiReady, defaultTopic }: { aiReady: boolean; defaultTopic?: string }) {
  const { generate, regenerate, loading, error, result, setResult } = useAIGeneration<FormValues, ScriptOutput>("video_script");
  const { register, handleSubmit, control, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      target: "TikTok",
      topic: defaultTopic ?? "",
      duration: "30 seconds",
      tone: "Conversational",
      objective: "Improve engagement",
      targetAudience: "",
      language: "English",
    },
  });
  const target = useWatch({ control, name: "target" });
  const out = result?.output;

  return (
    <AIToolLayout
      formDescription="Get a scene-by-scene script you can film with a phone."
      form={
        <form onSubmit={handleSubmit((v) => generate(v))} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Video type" htmlFor="target" required>
              <Controller control={control} name="target" render={({ field }) => <OptionSelect id="target" value={field.value} onChange={field.onChange} options={VIDEO_TARGET_OPTIONS} />} />
            </Field>
            <Field label="Duration" htmlFor="duration" required>
              <Controller control={control} name="duration" render={({ field }) => <OptionSelect id="duration" value={field.value} onChange={field.onChange} options={AI_OPTIONS.videoDurations} />} />
            </Field>
          </div>
          <Field label="Topic" htmlFor="topic" required error={formState.errors.topic?.message}>
            <Textarea id="topic" rows={3} placeholder="e.g. How I plan a week of content in 30 minutes" aria-invalid={!!formState.errors.topic} {...register("topic")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tone" htmlFor="tone">
              <Controller control={control} name="tone" render={({ field }) => <OptionSelect id="tone" value={field.value} onChange={field.onChange} options={AI_OPTIONS.tones} />} />
            </Field>
            <Field label="Objective" htmlFor="objective">
              <Controller control={control} name="objective" render={({ field }) => <OptionSelect id="objective" value={field.value} onChange={field.onChange} options={AI_OPTIONS.objectives} />} />
            </Field>
          </div>
          <Field label="Target audience" htmlFor="targetAudience">
            <Input id="targetAudience" placeholder="Defaults to your brand profile" {...register("targetAudience")} />
          </Field>
          <Field label="Language" htmlFor="language">
            <Controller control={control} name="language" render={({ field }) => <OptionSelect id="language" value={field.value} onChange={field.onChange} options={AI_OPTIONS.languages} />} />
          </Field>
          <Button type="submit" className="w-full" disabled={loading || !aiReady}>
            <Sparkles className="size-4" /> {loading ? "Writing script…" : "Generate script"}
          </Button>
          <CreditNote service="video_script" />
        </form>
      }
      results={
        loading && !result ? (
          <GenerationLoading label="Writing your script…" />
        ) : error && !result ? (
          <GenerationError message={error.message} onRetry={regenerate} />
        ) : !out || !result ? (
          <GenerationEmpty title="Your script will appear here" description="Choose a video type, duration and topic." />
        ) : (
          <>
            {error && <GenerationError message={error.message} />}
            <Card>
              <CardHeader className="gap-2">
                <Badge variant="secondary" className="w-fit">
                  <Clapperboard className="size-3" /> {target}
                </Badge>
                <CardTitle className="text-lg">{out.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="bg-primary/5 border-primary/20 rounded-lg border p-3">
                    <p className="text-primary mb-1 text-xs font-medium uppercase">Opening hook</p>
                    <p className="text-sm font-medium">{out.openingHook}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">Introduction</p>
                    <p className="text-sm">{out.introduction}</p>
                  </div>
                </div>

                <ol className="relative space-y-4 border-l pl-5" aria-label="Scenes">
                  {out.scenes.map((s, i) => (
                    <li key={i} className="relative">
                      <span className="bg-primary absolute top-1.5 -left-[25px] size-2.5 rounded-full" aria-hidden />
                      <div className="flex flex-wrap items-baseline gap-2">
                        <Badge variant="outline" className="font-mono text-[11px]">{s.timestamp}</Badge>
                        <p className="text-sm font-medium">{s.talkingPoint}</p>
                      </div>
                      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                        <div className="bg-muted/50 rounded-md p-2">
                          <dt className="text-muted-foreground text-[11px] uppercase">Scene</dt>
                          <dd>{s.sceneSuggestion}</dd>
                        </div>
                        <div className="bg-muted/50 rounded-md p-2">
                          <dt className="text-muted-foreground text-[11px] uppercase">Voiceover</dt>
                          <dd>{s.voiceover}</dd>
                        </div>
                        <div className="bg-muted/50 rounded-md p-2">
                          <dt className="text-muted-foreground text-[11px] uppercase">On-screen text</dt>
                          <dd>{s.onScreenText}</dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ol>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="mb-1 font-medium">Call to action</p>
                    <p className="text-muted-foreground">{out.callToAction}</p>
                  </div>
                  <div className="rounded-lg border p-3 text-sm">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-medium">Suggested caption</p>
                      <CopyButton size="icon" variant="ghost" label="Copy caption" text={out.suggestedCaption} />
                    </div>
                    <p className="text-muted-foreground whitespace-pre-wrap">{out.suggestedCaption}</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="text-sm">
                    <p className="mb-1 font-medium">Title options</p>
                    <ul className="text-muted-foreground list-disc space-y-1 pl-4">
                      {out.suggestedTitles.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-sm">
                    <p className="mb-1 font-medium">Production tips</p>
                    <ul className="text-muted-foreground list-disc space-y-1 pl-4">
                      {out.productionTips.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <GenerationToolbar
                  key={result.generationId ?? "none"}
                  generationId={result.generationId}
                  text={scriptText(out)}
                  platform={PLATFORM_FOR[target]}
                  onRegenerate={regenerate}
                  regenerating={loading}
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
