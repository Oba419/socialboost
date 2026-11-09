"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HeartHandshake, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { OptionSelect, PlatformSelect } from "@/components/forms/option-select";
import { AIToolLayout } from "@/components/content/ai-tool-layout";
import { GenerationEmpty, GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { CopyButton } from "@/components/shared/copy-button";
import { AI_OPTIONS } from "@/config/ai";
import { useAIGeneration } from "@/hooks/use-api";
import { CreditNote, ENGAGEMENT_MODE_LABELS, UsageFooter, type EngagementMode } from "../shared";

const MODES = Object.keys(ENGAGEMENT_MODE_LABELS) as EngagementMode[];

const formSchema = z
  .object({
    platform: z.string().min(1),
    comment: z.string().max(2000).optional(),
    postContext: z.string().max(1000).optional(),
    tone: z.string().optional(),
    mode: z.string(),
  })
  .refine((v) => v.mode !== "reply_drafts" || (v.comment ?? "").trim().length > 0, {
    message: "Paste the comment you want to reply to.",
    path: ["comment"],
  });
type FormValues = z.infer<typeof formSchema>;

interface EngagementOutput {
  suggestions: { text: string; whenToUse: string }[];
  tips: string[];
}

export function EngagementAssistant({ aiReady, defaultPlatform }: { aiReady: boolean; defaultPlatform?: string }) {
  const [mode, setMode] = useState<EngagementMode>("reply_drafts");
  const { generate, regenerate, loading, error, result, setResult } = useAIGeneration<Omit<FormValues, "mode"> & { mode: EngagementMode }, EngagementOutput>("engagement");
  const { register, handleSubmit, control, formState, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { platform: defaultPlatform ?? "instagram", comment: "", postContext: "", tone: "Friendly", mode },
  });
  const out = result?.output;

  return (
    <div className="space-y-4">
      <Alert>
        <HeartHandshake />
        <AlertTitle>Genuine engagement only</AlertTitle>
        <AlertDescription>
          Suggestions are drafts for you to review, personalise and post yourself. This tool never automates likes, comments, follows or replies.
        </AlertDescription>
      </Alert>
      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as EngagementMode);
          setValue("mode", v);
          setResult(null);
        }}
      >
        <TabsList className="h-auto flex-wrap">
          {MODES.map((m) => (
            <TabsTrigger key={m} value={m}>
              {ENGAGEMENT_MODE_LABELS[m]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <AIToolLayout
        formTitle={ENGAGEMENT_MODE_LABELS[mode]}
        form={
          <form
            onSubmit={handleSubmit((v) =>
              generate({
                mode,
                platform: v.platform,
                comment: v.comment?.trim() || undefined,
                postContext: v.postContext?.trim() || undefined,
                tone: v.tone || undefined,
              }),
            )}
            className="space-y-4"
            noValidate
          >
            <Field label="Platform" htmlFor="platform">
              <Controller control={control} name="platform" render={({ field }) => <PlatformSelect id="platform" value={field.value} onChange={field.onChange} />} />
            </Field>
            {mode === "reply_drafts" && (
              <Field label="Comment to reply to" htmlFor="comment" required error={formState.errors.comment?.message}>
                <Textarea id="comment" rows={4} aria-invalid={!!formState.errors.comment} placeholder="Paste the follower's comment" {...register("comment")} />
              </Field>
            )}
            <Field label="Post context (optional)" htmlFor="postContext" hint="What was the post about?">
              <Textarea id="postContext" rows={3} {...register("postContext")} />
            </Field>
            <Field label="Tone" htmlFor="tone">
              <Controller control={control} name="tone" render={({ field }) => <OptionSelect id="tone" value={field.value} onChange={field.onChange} options={AI_OPTIONS.tones} />} />
            </Field>
            <Button type="submit" className="w-full" disabled={loading || !aiReady}>
              <Sparkles className="size-4" /> {loading ? "Thinking…" : "Get suggestions"}
            </Button>
            <CreditNote service="engagement" />
          </form>
        }
        results={
          loading && !result ? (
            <GenerationLoading label="Drafting suggestions…" />
          ) : error && !result ? (
            <GenerationError message={error.message} onRetry={regenerate} />
          ) : !out || !result ? (
            <GenerationEmpty title="Suggestions will appear here" description="Pick a mode and get ideas to build real relationships with your audience." />
          ) : (
            <>
              {out.suggestions.map((s, i) => (
                <Card key={`${result.generationId}-${i}`}>
                  <CardContent className="flex gap-3 pt-6">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm whitespace-pre-wrap">{s.text}</p>
                      <p className="text-muted-foreground text-xs">{s.whenToUse}</p>
                    </div>
                    <CopyButton size="icon" variant="ghost" text={s.text} label="Copy suggestion" />
                  </CardContent>
                </Card>
              ))}
              {out.tips.length > 0 && (
                <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                  {out.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
              <GenerationToolbar
                key={result.generationId ?? "none"}
                generationId={result.generationId}
                text={out.suggestions.map((s) => `- ${s.text}`).join("\n")}
                onRegenerate={regenerate}
                regenerating={loading}
                showCalendar={mode === "conversation_starters"}
                showRepurpose={false}
                onDeleted={() => setResult(null)}
              />
              <UsageFooter used={result.creditsUsed} remaining={result.creditsRemaining} />
            </>
          )
        }
      />
    </div>
  );
}
