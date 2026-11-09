"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookmarkPlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { OptionSelect, PLATFORM_OPTIONS } from "@/components/forms/option-select";
import { AIToolLayout } from "@/components/content/ai-tool-layout";
import { GenerationEmpty, GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { AI_OPTIONS } from "@/config/ai";
import { apiFetch, toastError, useAIGeneration } from "@/hooks/use-api";
import { CreditNote, UsageFooter } from "../shared";
import { IdeaCard, type IdeaView } from "./idea-card";

const ANY = "any";
const formSchema = z.object({
  scope: z.string().min(1, "Choose an idea type."),
  topic: z.string().max(300).optional(),
  platform: z.string(),
  targetAudience: z.string().max(200).optional(),
  count: z.string(),
  language: z.string().min(1),
});
type FormValues = z.infer<typeof formSchema>;

interface IdeasOutput {
  ideas: Array<{
    title: string;
    description: string;
    targetAudience: string;
    platform: string;
    format: string;
    hook: string;
    cta: string;
    hashtags: string[];
    whyItMayResonate: string;
    suggestedDay: string | null;
  }>;
}

type Payload = Omit<FormValues, "platform" | "count"> & { platform?: string; count: number };

export function IdeaGenerator({ aiReady, onSaved }: { aiReady: boolean; onSaved?: () => void }) {
  const { generate, regenerate, loading, error, result, setResult } = useAIGeneration<Payload, IdeasOutput>("content_ideas");
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { scope: "Weekly ideas", topic: "", platform: ANY, targetAudience: "", count: "7", language: "English" },
  });

  const toView = (i: IdeasOutput["ideas"][number]): IdeaView => ({
    title: i.title,
    description: i.description,
    targetAudience: i.targetAudience,
    platform: i.platform,
    format: i.format,
    hook: i.hook,
    cta: i.cta,
    hashtags: i.hashtags,
    rationale: i.whyItMayResonate,
    suggestedDay: i.suggestedDay,
  });

  async function save(indexes: number[]) {
    if (!result) return;
    const pending = indexes.filter((i) => !savedIdx.has(i));
    if (!pending.length) return;
    setSaving(true);
    const res = await apiFetch("/api/ideas", {
      method: "POST",
      json: {
        generatedContentId: result.generationId,
        ideas: pending.map((i) => {
          const v = toView(result.output.ideas[i]);
          return { ...v, suggestedDay: undefined };
        }),
      },
    });
    setSaving(false);
    if (!res.ok) return toastError(res.error);
    setSavedIdx((s) => new Set([...s, ...pending]));
    toast.success(pending.length === 1 ? "Idea saved" : `${pending.length} ideas saved`);
    onSaved?.();
  }

  const onSubmit = handleSubmit((v) => {
    setSavedIdx(new Set());
    return generate({
      scope: v.scope,
      topic: v.topic || undefined,
      platform: v.platform === ANY ? undefined : v.platform,
      targetAudience: v.targetAudience || undefined,
      count: Number(v.count),
      language: v.language,
    });
  });

  const ideas = result?.output.ideas ?? [];

  return (
    <AIToolLayout
      formDescription="Generate concrete ideas you can produce today."
      form={
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Idea type" htmlFor="scope" required error={formState.errors.scope?.message}>
            <Controller control={control} name="scope" render={({ field }) => <OptionSelect id="scope" value={field.value} onChange={field.onChange} options={AI_OPTIONS.ideaScopes} />} />
          </Field>
          <Field label="Focus topic" htmlFor="topic" hint="Optional. Leave blank for ideas across your niche.">
            <Input id="topic" placeholder="e.g. Budget meal prep" {...register("topic")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Platform" htmlFor="platform">
              <Controller
                control={control}
                name="platform"
                render={({ field }) => (
                  <OptionSelect id="platform" value={field.value} onChange={field.onChange} options={[{ value: ANY, label: "Best fit" }, ...PLATFORM_OPTIONS]} />
                )}
              />
            </Field>
            <Field label="How many" htmlFor="count">
              <Controller control={control} name="count" render={({ field }) => <OptionSelect id="count" value={field.value} onChange={field.onChange} options={["3", "5", "7", "10", "15"]} />} />
            </Field>
          </div>
          <Field label="Target audience" htmlFor="targetAudience">
            <Input id="targetAudience" placeholder="Defaults to your brand profile" {...register("targetAudience")} />
          </Field>
          <Field label="Language" htmlFor="language">
            <Controller control={control} name="language" render={({ field }) => <OptionSelect id="language" value={field.value} onChange={field.onChange} options={AI_OPTIONS.languages} />} />
          </Field>
          <Button type="submit" className="w-full" disabled={loading || !aiReady}>
            <Sparkles className="size-4" /> {loading ? "Generating…" : "Generate ideas"}
          </Button>
          <CreditNote service="content_ideas" />
        </form>
      }
      results={
        loading && !result ? (
          <GenerationLoading label="Brainstorming ideas…" />
        ) : error && !result ? (
          <GenerationError message={error.message} onRetry={regenerate} />
        ) : !result ? (
          <GenerationEmpty title="Your ideas will appear here" description="Pick an idea type and generate a batch." />
        ) : (
          <>
            {error && <GenerationError message={error.message} />}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => save(ideas.map((_, i) => i))} disabled={saving || savedIdx.size === ideas.length}>
                <BookmarkPlus className="size-4" /> Save all
              </Button>
              <GenerationToolbar
                key={result.generationId ?? "none"}
                generationId={result.generationId}
                text={ideas.map((i, n) => `${n + 1}. ${i.title}\n${i.description}\nHook: ${i.hook}\nCTA: ${i.cta}`).join("\n\n")}
                onRegenerate={regenerate}
                regenerating={loading}
                showCalendar={false}
                showRepurpose={false}
                onDeleted={() => setResult(null)}
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {ideas.map((idea, i) => (
                <IdeaCard key={`${result.generationId}-${i}`} idea={toView(idea)} saved={savedIdx.has(i)} saving={saving} onSave={() => save([i])} />
              ))}
            </div>
            <UsageFooter used={result.creditsUsed} remaining={result.creditsRemaining} />
          </>
        )
      }
    />
  );
}
