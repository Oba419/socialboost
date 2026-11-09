"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { OptionSelect, PlatformSelect } from "@/components/forms/option-select";
import { AIToolLayout } from "@/components/content/ai-tool-layout";
import { GenerationEmpty, GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { AI_OPTIONS } from "@/config/ai";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { useAIGeneration } from "@/hooks/use-api";

const formSchema = z.object({
  platform: z.string().min(1, "Choose a platform."),
  description: z.string().trim().min(10, "Describe the post in at least 10 characters.").max(1000),
  styles: z.array(z.string()).min(1, "Pick at least one caption style."),
  tone: z.string().optional(),
  cta: z.string().max(200).optional(),
  includeHashtags: z.boolean(),
  includeEmojis: z.boolean(),
  language: z.string().min(1),
});
type FormValues = z.infer<typeof formSchema>;

interface CaptionsOutput {
  captions: { style: string; caption: string; callToAction: string; hashtags: string[]; characterCount: number }[];
}

export function CaptionGenerator({ aiReady, defaultPlatform }: { aiReady: boolean; defaultPlatform?: string }) {
  const { generate, regenerate, loading, error, result, setResult } = useAIGeneration<FormValues, CaptionsOutput>("captions");
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform: defaultPlatform && isPlatformId(defaultPlatform) ? defaultPlatform : "instagram",
      description: "",
      styles: ["Short", "Conversational", "Storytelling"],
      tone: "Friendly",
      cta: "",
      includeHashtags: true,
      includeEmojis: true,
      language: "English",
    },
  });
  const { register, handleSubmit, control, formState } = form;
  const platform = useWatch({ control, name: "platform" });
  const limit = isPlatformId(platform) ? PLATFORMS[platform].textLimit : null;

  const onSubmit = handleSubmit((values) => generate(values));

  const fullText = (c: CaptionsOutput["captions"][number]) =>
    [c.caption, c.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")].filter(Boolean).join("\n\n");

  return (
    <AIToolLayout
      formDescription="Describe your post and pick the caption styles you want."
      form={
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Platform" htmlFor="platform" error={formState.errors.platform?.message} required>
            <Controller control={control} name="platform" render={({ field }) => <PlatformSelect id="platform" value={field.value} onChange={field.onChange} />} />
          </Field>
          <Field label="What is the post about?" htmlFor="description" error={formState.errors.description?.message} required>
            <Textarea
              id="description"
              rows={4}
              placeholder="e.g. Behind-the-scenes of packing our new skincare bundle for Lagos customers"
              aria-invalid={!!formState.errors.description}
              {...register("description")}
            />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Caption styles</legend>
            <Controller
              control={control}
              name="styles"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {AI_OPTIONS.captionStyles.map((s) => (
                    <label key={s} className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm">
                      <Checkbox
                        checked={field.value.includes(s)}
                        onCheckedChange={(c) => field.onChange(c ? [...field.value, s] : field.value.filter((v) => v !== s))}
                      />
                      {s}
                    </label>
                  ))}
                </div>
              )}
            />
            {formState.errors.styles && <p className="text-destructive text-xs">{formState.errors.styles.message}</p>}
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tone" htmlFor="tone">
              <Controller control={control} name="tone" render={({ field }) => <OptionSelect id="tone" value={field.value} onChange={field.onChange} options={AI_OPTIONS.tones} />} />
            </Field>
            <Field label="Language" htmlFor="language">
              <Controller control={control} name="language" render={({ field }) => <OptionSelect id="language" value={field.value} onChange={field.onChange} options={AI_OPTIONS.languages} />} />
            </Field>
          </div>
          <Field label="Call to action (optional)" htmlFor="cta" hint="Leave blank and the AI will suggest one.">
            <Input id="cta" placeholder="e.g. Shop via the link in bio" {...register("cta")} />
          </Field>
          <div className="space-y-3 rounded-lg border p-3">
            <Controller
              control={control}
              name="includeHashtags"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="includeHashtags">Include hashtags</Label>
                  <Switch id="includeHashtags" checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
            <Controller
              control={control}
              name="includeEmojis"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="includeEmojis">Use emojis</Label>
                  <Switch id="includeEmojis" checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !aiReady}>
            <Sparkles className="size-4" /> {loading ? "Generating…" : "Generate captions"}
          </Button>
          <p className="text-muted-foreground text-center text-xs">Uses 1 AI credit</p>
        </form>
      }
      results={
        loading && !result ? (
          <GenerationLoading label="Writing captions…" />
        ) : error && !result ? (
          <GenerationError message={error.message} onRetry={regenerate} />
        ) : !result ? (
          <GenerationEmpty title="Your captions will appear here" description="Fill in the details and generate platform-ready captions." />
        ) : (
          <>
            {error && <GenerationError message={error.message} />}
            {result.output.captions.map((c, i) => {
              const text = fullText(c);
              const over = limit !== null && c.caption.length > limit;
              return (
                <Card key={`${result.generationId}-${i}`}>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-medium">
                      <Badge variant="secondary">{c.style}</Badge>
                    </CardTitle>
                    <span className={over ? "text-destructive text-xs" : "text-muted-foreground text-xs tabular-nums"}>
                      {c.caption.length}
                      {limit ? ` / ${limit}` : ""} chars
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.caption}</p>
                    {c.hashtags.length > 0 && (
                      <p className="text-primary text-sm">{c.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}</p>
                    )}
                    <GenerationToolbar
                      generationId={i === 0 ? result.generationId : null}
                      text={text}
                      platform={platform}
                      onRegenerate={i === 0 ? regenerate : undefined}
                      regenerating={loading}
                      showRepurpose={i === 0}
                      onEdited={(t) =>
                        setResult({
                          ...result,
                          output: {
                            captions: result.output.captions.map((x, j) => (j === i ? { ...x, caption: t, hashtags: [] } : x)),
                          },
                        })
                      }
                      onDeleted={() => setResult(null)}
                    />
                  </CardContent>
                </Card>
              );
            })}
            <p className="text-muted-foreground text-xs">
              {result.creditsUsed} credit used · {result.creditsRemaining} remaining this period
            </p>
          </>
        )
      }
    />
  );
}
