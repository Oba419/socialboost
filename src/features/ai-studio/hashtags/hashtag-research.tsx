"use client";

import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bookmark, Info, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Field } from "@/components/forms/field";
import { PlatformSelect } from "@/components/forms/option-select";
import { AIToolLayout } from "@/components/content/ai-tool-layout";
import { GenerationEmpty, GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { CopyButton } from "@/components/shared/copy-button";
import { apiFetch, toastError, useAIGeneration } from "@/hooks/use-api";
import type { SavedHashtagRow } from "@/types/database";
import { cn } from "@/lib/utils";
import { CreditNote, UsageFooter, tag } from "../shared";

const formSchema = z.object({
  topic: z.string().trim().min(2, "Enter a topic or keyword.").max(200),
  platform: z.string().min(1, "Choose a platform."),
  location: z.string().max(100).optional(),
});
type FormValues = z.infer<typeof formSchema>;

type TagGroup = { tag: string; reason: string }[];
interface HashtagsOutput {
  broad: TagGroup;
  niche: TagGroup;
  community: TagGroup;
  industry: TagGroup;
  location: TagGroup;
  usageTips: string[];
  disclaimer: string;
}

const GROUPS: { key: keyof Omit<HashtagsOutput, "usageTips" | "disclaimer">; label: string; hint: string }[] = [
  { key: "broad", label: "Broad", hint: "Wide reach, high competition" },
  { key: "niche", label: "Niche", hint: "Specific to your topic" },
  { key: "community", label: "Community", hint: "Where your people gather" },
  { key: "industry", label: "Industry-specific", hint: "Professional / sector tags" },
  { key: "location", label: "Location-specific", hint: "Local discovery" },
];

const clean = (t: string) => t.replace(/^#+/, "").toLowerCase();

export function HashtagResearch({ aiReady, defaultPlatform, defaultLocation }: { aiReady: boolean; defaultPlatform?: string; defaultLocation?: string }) {
  const { generate, regenerate, loading, error, result, setResult } = useAIGeneration<FormValues, HashtagsOutput>("hashtags");
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const [saved, setSaved] = useState<SavedHashtagRow[] | null>(null);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, control, formState, getValues } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { topic: "", platform: defaultPlatform ?? "instagram", location: defaultLocation ?? "" },
  });

  const loadSaved = useCallback(async () => {
    const res = await apiFetch<SavedHashtagRow[]>("/api/hashtags");
    if (res.ok) {
      setSaved(res.data);
      setSavedError(null);
    } else setSavedError(res.error.message);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiFetch<SavedHashtagRow[]>("/api/hashtags");
      if (cancelled) return;
      if (res.ok) setSaved(res.data);
      else setSavedError(res.error.message);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(t: string, category: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      const k = clean(t);
      if (next.has(k)) next.delete(k);
      else next.set(k, category);
      return next;
    });
  }

  async function saveSelected() {
    if (!selected.size) return;
    setSaving(true);
    // Group by category so each saved tag keeps its group label.
    const byCat = new Map<string, string[]>();
    for (const [t, c] of selected) byCat.set(c, [...(byCat.get(c) ?? []), t]);
    for (const [category, tags] of byCat) {
      const res = await apiFetch("/api/hashtags", { method: "POST", json: { tags, category, topic: getValues("topic") } });
      if (!res.ok) {
        setSaving(false);
        return toastError(res.error);
      }
    }
    setSaving(false);
    toast.success(`${selected.size} hashtag${selected.size === 1 ? "" : "s"} saved`);
    setSelected(new Map());
    void loadSaved();
  }

  async function removeSaved(id: string) {
    const res = await apiFetch(`/api/hashtags/${id}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    setSaved((s) => s?.filter((h) => h.id !== id) ?? null);
  }

  const out = result?.output;
  const allTags = out ? GROUPS.flatMap((g) => out[g.key].map((t) => tag(clean(t.tag)))).join(" ") : "";

  return (
    <div className="space-y-6">
      <AIToolLayout
        formDescription="Enter a topic or keyword to get grouped hashtag suggestions."
        form={
          <form
            onSubmit={handleSubmit((v) => {
              setSelected(new Map());
              return generate({ ...v, location: v.location || undefined });
            })}
            className="space-y-4"
            noValidate
          >
            <Field label="Topic or keyword" htmlFor="topic" required error={formState.errors.topic?.message}>
              <Input id="topic" placeholder="e.g. home workouts" aria-invalid={!!formState.errors.topic} {...register("topic")} />
            </Field>
            <Field label="Platform" htmlFor="platform" required>
              <Controller control={control} name="platform" render={({ field }) => <PlatformSelect id="platform" value={field.value} onChange={field.onChange} />} />
            </Field>
            <Field label="Location (optional)" htmlFor="location">
              <Input id="location" placeholder="e.g. Lagos" {...register("location")} />
            </Field>
            <Button type="submit" className="w-full" disabled={loading || !aiReady}>
              <Sparkles className="size-4" /> {loading ? "Researching…" : "Suggest hashtags"}
            </Button>
            <CreditNote service="hashtags" />
          </form>
        }
        results={
          loading && !result ? (
            <GenerationLoading label="Finding relevant hashtags…" />
          ) : error && !result ? (
            <GenerationError message={error.message} onRetry={regenerate} />
          ) : !out || !result ? (
            <GenerationEmpty title="Hashtag suggestions will appear here" description="Results are grouped from broad reach to local discovery." />
          ) : (
            <>
              <Alert className="border-warning/40 bg-warning/5">
                <Info className="text-warning" />
                <AlertTitle>AI estimates, not verified data</AlertTitle>
                <AlertDescription>{out.disclaimer}</AlertDescription>
              </Alert>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={saveSelected} disabled={!selected.size || saving}>
                  <Bookmark className="size-4" /> Save selected ({selected.size})
                </Button>
                <GenerationToolbar
                  key={result.generationId ?? "none"}
                  generationId={result.generationId}
                  text={allTags}
                  onRegenerate={regenerate}
                  regenerating={loading}
                  showCalendar={false}
                  showRepurpose={false}
                  onDeleted={() => setResult(null)}
                />
              </div>
              <p className="text-muted-foreground text-xs">Click hashtags to select them for saving.</p>
              <div className="grid gap-4 md:grid-cols-2">
                {GROUPS.map((g) => (
                  <Card key={g.key}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-sm">
                        {g.label}
                        {out[g.key].length > 0 && (
                          <CopyButton size="sm" variant="ghost" label="Copy" text={out[g.key].map((t) => tag(clean(t.tag))).join(" ")} />
                        )}
                      </CardTitle>
                      <CardDescription>{g.hint}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {out[g.key].length === 0 ? (
                        <p className="text-muted-foreground text-sm">No suggestions in this group.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {out[g.key].map((t) => {
                            const k = clean(t.tag);
                            const on = selected.has(k);
                            return (
                              <Tooltip key={k}>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggle(t.tag, g.key)}
                                    className={cn(
                                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                                      on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent",
                                    )}
                                  >
                                    {tag(k)}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">{t.reason}</TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {out.usageTips.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Usage tips</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-sm">
                      {out.usageTips.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              <UsageFooter used={result.creditsUsed} remaining={result.creditsRemaining} />
            </>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved hashtags</CardTitle>
          <CardDescription>Your hashtag bank for this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          {saved === null && !savedError ? (
            <Skeleton className="h-10 w-full" />
          ) : savedError ? (
            <p className="text-destructive text-sm">
              {savedError}{" "}
              <button className="underline" onClick={loadSaved}>
                Retry
              </button>
            </p>
          ) : saved && saved.length === 0 ? (
            <p className="text-muted-foreground text-sm">No saved hashtags yet. Select suggestions above and save them.</p>
          ) : (
            <div className="space-y-3">
              <CopyButton text={(saved ?? []).map((h) => tag(h.tag)).join(" ")} label="Copy all" />
              <div className="flex flex-wrap gap-1.5">
                {(saved ?? []).map((h) => (
                  <Badge key={h.id} variant="secondary" className="gap-1 pr-1">
                    {tag(h.tag)}
                    {h.category && <span className="text-muted-foreground text-[10px]">· {h.category}</span>}
                    <button type="button" onClick={() => removeSaved(h.id)} aria-label={`Remove ${h.tag}`} className="hover:bg-background/60 rounded-full p-0.5">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
