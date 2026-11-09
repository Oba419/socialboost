"use client";

import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FlaskConical, HelpCircle, Info, PenSquare, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { OptionSelect, PLATFORM_OPTIONS } from "@/components/forms/option-select";
import { AIToolLayout } from "@/components/content/ai-tool-layout";
import { GenerationEmpty, GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { GenerationToolbar } from "@/components/content/generation-toolbar";
import { useAIGeneration } from "@/hooks/use-api";
import { CreditNote, UsageFooter } from "../shared";

const ANY = "any";
const formSchema = z.object({
  niche: z.string().trim().min(2, "Enter your niche.").max(120),
  industry: z.string().max(120).optional(),
  targetAudience: z.string().max(200).optional(),
  platform: z.string(),
  location: z.string().max(100).optional(),
  topic: z.string().max(200).optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface TrendsOutput {
  dataNotice: string;
  themes: { theme: string; whyRelevant: string; contentAngles: string[]; formats: string[] }[];
  audienceQuestions: string[];
  evergreenOpportunities: string[];
  howToValidate: string[];
}

const o = (v?: string) => (v && v.trim() ? v.trim() : undefined);

export function TrendDiscovery({ aiReady, defaults }: { aiReady: boolean; defaults: { niche?: string; audience?: string; location?: string } }) {
  const { generate, regenerate, loading, error, result, setResult } = useAIGeneration<Record<string, string | undefined>, TrendsOutput>("trends");
  const { register, handleSubmit, control, formState } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { niche: defaults.niche ?? "", industry: "", targetAudience: defaults.audience ?? "", platform: ANY, location: defaults.location ?? "", topic: "" },
  });
  const out = result?.output;

  return (
    <AIToolLayout
      formDescription="Explore discussion themes and content angles for your niche."
      form={
        <form
          onSubmit={handleSubmit((v) =>
            generate({
              niche: v.niche,
              industry: o(v.industry),
              targetAudience: o(v.targetAudience),
              platform: v.platform === ANY ? undefined : v.platform,
              location: o(v.location),
              topic: o(v.topic),
            }),
          )}
          className="space-y-4"
          noValidate
        >
          <Field label="Niche" htmlFor="niche" required error={formState.errors.niche?.message}>
            <Input id="niche" aria-invalid={!!formState.errors.niche} {...register("niche")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry" htmlFor="industry">
              <Input id="industry" {...register("industry")} />
            </Field>
            <Field label="Platform" htmlFor="platform">
              <Controller
                control={control}
                name="platform"
                render={({ field }) => <OptionSelect id="platform" value={field.value} onChange={field.onChange} options={[{ value: ANY, label: "Any" }, ...PLATFORM_OPTIONS]} />}
              />
            </Field>
          </div>
          <Field label="Target audience" htmlFor="targetAudience">
            <Input id="targetAudience" {...register("targetAudience")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location" htmlFor="location">
              <Input id="location" {...register("location")} />
            </Field>
            <Field label="Topic" htmlFor="topic">
              <Input id="topic" {...register("topic")} />
            </Field>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !aiReady}>
            <Sparkles className="size-4" /> {loading ? "Exploring…" : "Discover themes"}
          </Button>
          <CreditNote service="trends" />
        </form>
      }
      results={
        <>
          <Alert className="border-warning/40 bg-warning/5">
            <Info className="text-warning" />
            <AlertTitle>AI-generated ideas, not verified real-time trends</AlertTitle>
            <AlertDescription>
              {out?.dataNotice ??
                "This tool has no live trend data. Treat every theme as an idea to validate with platform search, native analytics and your comments before investing heavily."}
            </AlertDescription>
          </Alert>
          {loading && !result ? (
            <GenerationLoading label="Exploring themes…" />
          ) : error && !result ? (
            <GenerationError message={error.message} onRetry={regenerate} />
          ) : !out || !result ? (
            <GenerationEmpty title="Themes and angles will appear here" description="Enter your niche to explore content opportunities." />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {out.themes.map((t, i) => (
                  <Card key={`${result.generationId}-${i}`}>
                    <CardHeader className="gap-1">
                      <CardTitle className="text-base">{t.theme}</CardTitle>
                      <p className="text-muted-foreground text-sm">{t.whyRelevant}</p>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <ul className="list-disc space-y-1 pl-4">
                        {t.contentAngles.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-1">
                        {t.formats.map((f) => (
                          <Badge key={f} variant="outline">{f}</Badge>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/studio?${new URLSearchParams({ topic: `${t.theme}: ${t.contentAngles[0] ?? ""}`.slice(0, 290) })}`}>
                          <PenSquare className="size-4" /> Create a post
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <ListCard icon={<HelpCircle className="size-4" />} title="Questions your audience asks" items={out.audienceQuestions} />
                <ListCard icon={<Sparkles className="size-4" />} title="Evergreen opportunities" items={out.evergreenOpportunities} />
                <ListCard icon={<FlaskConical className="size-4" />} title="How to validate" items={out.howToValidate} />
              </div>
              <GenerationToolbar
                key={result.generationId ?? "none"}
                generationId={result.generationId}
                text={out.themes.map((t) => `${t.theme}\n${t.contentAngles.map((a) => `- ${a}`).join("\n")}`).join("\n\n")}
                onRegenerate={regenerate}
                regenerating={loading}
                showCalendar={false}
                showRepurpose={false}
                onDeleted={() => setResult(null)}
              />
              <UsageFooter used={result.creditsUsed} remaining={result.creditsRemaining} />
            </>
          )}
        </>
      }
    />
  );
}

function ListCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-sm">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
