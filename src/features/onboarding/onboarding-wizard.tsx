"use client";

import { useMemo, useState } from "react";
import { Controller, useForm, useWatch, type FieldPath } from "react-hook-form";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { OptionSelect } from "@/components/forms/option-select";
import { GenerationError, GenerationLoading } from "@/components/content/generation-states";
import { SetupRequired } from "@/components/shared/setup-required";
import { PLATFORMS, PLATFORM_LIST, type PlatformId } from "@/config/platforms";
import { cn } from "@/lib/utils";
import { completeOnboarding, generateGrowthAssessment, saveOnboardingStep } from "./actions";
import { CONTENT_FORMATS, GOALS, NICHE_SUGGESTIONS, ONBOARDING_STEPS, POSTING_FREQUENCIES, TOTAL_STEPS, USER_TYPES } from "./options";
import { STEP_FIELDS, stepSchemas, type OnboardingFormValues, type OnboardingStep } from "./schemas";

interface Assessment {
  summary: string;
  strengths: string[];
  priorities: { title: string; why: string }[];
  quickWins: string[];
  recommendedPostingCadence: { platform: string; cadence: string; formats: string[] }[];
  first7DaysFocus: string[];
  isHypothesis: boolean;
}

export interface WizardProps {
  initialStep: number;
  initialValues: OnboardingFormValues;
  aiReady: boolean;
  plan?: string;
}

function ToggleChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
        "focus-visible:ring-ring outline-none focus-visible:ring-2",
        selected ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent",
      )}
    >
      {selected && <Check className="mr-1 inline size-3.5" />}
      {children}
    </button>
  );
}

export function OnboardingWizard({ initialStep, initialValues, aiReady, plan }: WizardProps) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), TOTAL_STEPS));
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const form = useForm<OnboardingFormValues>({ defaultValues: initialValues });
  const { register, control, setValue, getValues, setError, clearErrors, formState } = form;
  const errors = formState.errors;

  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [initialValues.timezone];
    }
  }, [initialValues.timezone]);

  const platforms = (useWatch({ control, name: "platforms" }) ?? []) as PlatformId[];
  const goals = useWatch({ control, name: "goals" }) ?? [];
  const niche = useWatch({ control, name: "niche" });
  const userType = useWatch({ control, name: "userType" });
  const formats = useWatch({ control, name: "preferredFormats" }) ?? [];

  async function next() {
    if (step >= TOTAL_STEPS) return;
    const s = step as OnboardingStep;
    const fields = STEP_FIELDS[s];
    const values = Object.fromEntries(fields.map((f) => [f, getValues(f)]));
    clearErrors();
    const parsed = stepSchemas[s].safeParse(values);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".") as FieldPath<OnboardingFormValues>;
        setError(path, { message: issue.message });
      }
      return;
    }
    setSaving(true);
    const res = await saveOnboardingStep(s, values);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error.message);
      return;
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function assess() {
    setAssessing(true);
    setAssessError(null);
    const res = await generateGrowthAssessment();
    setAssessing(false);
    if (res.ok) setAssessment(res.data.output as Assessment);
    else setAssessError(res.error.message);
  }

  async function finish() {
    setFinishing(true);
    const res = await completeOnboarding(plan);
    if (res.ok) {
      toast.success("You're all set!");
      window.location.assign(res.data.redirectTo);
    } else {
      setFinishing(false);
      toast.error(res.error.message);
    }
  }

  const toggle = (name: "platforms" | "goals" | "preferredFormats", value: string) => {
    const current = (getValues(name) ?? []) as string[];
    setValue(name, current.includes(value) ? current.filter((v) => v !== value) : [...current, value], { shouldDirty: true });
    clearErrors(name);
  };

  const meta = ONBOARDING_STEPS[step - 1];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>
            Step {step} of {TOTAL_STEPS}
          </span>
          <span>{Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100)}% complete</span>
        </div>
        <Progress value={((step - 1) / (TOTAL_STEPS - 1)) * 100} aria-label="Onboarding progress" />
        <ol className="hidden justify-between pt-1 sm:flex" aria-label="Steps">
          {ONBOARDING_STEPS.map((s, i) => (
            <li
              key={s.title}
              aria-current={i + 1 === step ? "step" : undefined}
              className={cn("text-xs", i + 1 === step ? "text-primary font-medium" : i + 1 < step ? "text-foreground" : "text-muted-foreground")}
            >
              {s.title}
            </li>
          ))}
        </ol>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{meta.title}</h1>
          </CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void next();
            }}
            className="space-y-5"
            noValidate
          >
            {step === 1 && (
              <>
                <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message} required>
                  <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
                </Field>
                <Field
                  label="Timezone"
                  htmlFor="timezone"
                  error={errors.timezone?.message}
                  hint={
                    <button
                      type="button"
                      className="text-primary underline-offset-4 hover:underline"
                      onClick={() => setValue("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone)}
                    >
                      Use my device timezone
                    </button>
                  }
                >
                  <Controller
                    control={control}
                    name="timezone"
                    render={({ field }) => <OptionSelect id="timezone" value={field.value} onChange={field.onChange} options={timezones} />}
                  />
                </Field>
                <p className="text-muted-foreground text-xs">We use your timezone to schedule posts and show times correctly.</p>
              </>
            )}

            {step === 2 && (
              <div role="radiogroup" aria-label="Account type" className="grid gap-3 sm:grid-cols-2">
                {USER_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={userType === t.value}
                    onClick={() => {
                      setValue("userType", t.value);
                      clearErrors("userType");
                    }}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      "focus-visible:ring-ring outline-none focus-visible:ring-2",
                      userType === t.value ? "border-primary bg-primary/5 ring-primary/30 ring-1" : "hover:bg-accent",
                    )}
                  >
                    <p className="font-medium">{t.label}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{t.description}</p>
                  </button>
                ))}
                {errors.userType && <p role="alert" className="text-destructive text-xs sm:col-span-2">{errors.userType.message}</p>}
              </div>
            )}

            {step === 3 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {NICHE_SUGGESTIONS.map((n) => (
                    <ToggleChip
                      key={n}
                      selected={niche === n}
                      onClick={() => {
                        setValue("niche", n);
                        clearErrors("niche");
                      }}
                    >
                      {n}
                    </ToggleChip>
                  ))}
                </div>
                <Field label="Or describe your niche" htmlFor="niche" error={errors.niche?.message} hint="Be specific, e.g. “Affordable natural hair care for Nigerian students”.">
                  <Input id="niche" aria-invalid={!!errors.niche} {...register("niche")} />
                </Field>
              </>
            )}

            {step === 4 && (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  {PLATFORM_LIST.map((p) => {
                    const checked = platforms.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors",
                          checked ? "border-primary bg-primary/5" : "hover:bg-accent",
                        )}
                      >
                        <Checkbox checked={checked} onCheckedChange={() => toggle("platforms", p.id)} />
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: p.color }} aria-hidden />
                        <span className="text-sm font-medium">{p.name}</span>
                      </label>
                    );
                  })}
                </div>
                {errors.platforms && <p role="alert" className="text-destructive text-xs">{errors.platforms.message}</p>}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {GOALS.map((g) => (
                    <ToggleChip key={g} selected={goals.includes(g)} onClick={() => toggle("goals", g)}>
                      {g}
                    </ToggleChip>
                  ))}
                </div>
                {errors.goals && <p role="alert" className="text-destructive text-xs">{errors.goals.message}</p>}
              </div>
            )}

            {step === 6 && (
              <>
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium">Current followers (optional)</legend>
                  <p className="text-muted-foreground text-xs">
                    Rough numbers are fine. These are stored as self-reported figures. You can connect accounts later in Social Accounts to pull
                    verified data where the platform allows.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {platforms.map((p) => (
                      <Field key={p} label={PLATFORMS[p].name} htmlFor={`followers-${p}`} error={errors.followers?.[p]?.message}>
                        <Input
                          id={`followers-${p}`}
                          inputMode="numeric"
                          placeholder="e.g. 1200"
                          {...register(`followers.${p}` as const)}
                        />
                      </Field>
                    ))}
                  </div>
                </fieldset>
                <Field label="How often can you post?" htmlFor="postingFrequency" error={errors.postingFrequency?.message} required>
                  <Controller
                    control={control}
                    name="postingFrequency"
                    render={({ field }) => (
                      <OptionSelect id="postingFrequency" value={field.value} onChange={field.onChange} options={POSTING_FREQUENCIES} ariaInvalid={!!errors.postingFrequency} />
                    )}
                  />
                </Field>
                <Field label="Target audience" htmlFor="targetAudience" error={errors.targetAudience?.message} required>
                  <Input id="targetAudience" placeholder="e.g. Young professionals in Lagos aged 22–35" aria-invalid={!!errors.targetAudience} {...register("targetAudience")} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Location / market" htmlFor="location" error={errors.location?.message}>
                    <Input id="location" placeholder="e.g. Nigeria" {...register("location")} />
                  </Field>
                  <Field label="Brand voice" htmlFor="brandVoice" error={errors.brandVoice?.message}>
                    <Input id="brandVoice" placeholder="e.g. Warm, witty, expert" {...register("brandVoice")} />
                  </Field>
                </div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Preferred content formats</legend>
                  <div className="flex flex-wrap gap-2">
                    {CONTENT_FORMATS.map((f) => (
                      <ToggleChip key={f} selected={formats.includes(f)} onClick={() => toggle("preferredFormats", f)}>
                        {f}
                      </ToggleChip>
                    ))}
                  </div>
                </fieldset>
                <Field label="Content resources" htmlFor="contentResources" hint="Equipment, team, budget or time you have available." error={errors.contentResources?.message}>
                  <Textarea id="contentResources" rows={3} placeholder="e.g. Smartphone, ring light, 5 hours a week, no editor" {...register("contentResources")} />
                </Field>
              </>
            )}

            {step === 7 && (
              <div className="space-y-4">
                {!aiReady ? (
                  <SetupRequired integration="AI growth assessment" envVars={["OPENAI_API_KEY or GEMINI_API_KEY"]}>
                    <p className="mt-1">You can finish onboarding now and generate your assessment later from the AI Growth Coach.</p>
                  </SetupRequired>
                ) : assessing ? (
                  <GenerationLoading label="Analysing your profile…" />
                ) : assessment ? (
                  <AssessmentView assessment={assessment} />
                ) : (
                  <div className="space-y-3 rounded-xl border border-dashed p-6 text-center">
                    <Sparkles className="text-primary mx-auto size-8" />
                    <p className="font-medium">Get your personalised growth assessment</p>
                    <p className="text-muted-foreground text-sm">Based on everything you told us. Uses 1 AI credit from your free allowance.</p>
                    {assessError && <GenerationError message={assessError} />}
                    <Button type="button" onClick={assess}>
                      <Sparkles className="size-4" /> Generate assessment
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 border-t pt-5">
              <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1 || saving || finishing}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              {step < TOTAL_STEPS ? (
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  {saving ? "Saving…" : "Continue"} {!saving && <ArrowRight className="size-4" />}
                </Button>
              ) : (
                <Button type="button" onClick={finish} disabled={finishing || assessing}>
                  {finishing ? "Finishing…" : "Go to my dashboard"} <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      <p className="text-muted-foreground text-center text-xs">Your progress is saved after each step, so you can come back any time.</p>
    </div>
  );
}

function AssessmentView({ assessment: a }: { assessment: Assessment }) {
  return (
    <div className="space-y-5">
      {a.isHypothesis && (
        <Badge variant="outline" className="border-warning/50 text-warning">
          Initial hypothesis — based on your answers, not verified performance data
        </Badge>
      )}
      <p className="leading-relaxed">{a.summary}</p>
      <Section title="Your strengths" items={a.strengths} />
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Top priorities</h2>
        <ol className="space-y-2">
          {a.priorities.map((p, i) => (
            <li key={i} className="bg-muted/40 rounded-lg p-3 text-sm">
              <p className="font-medium">
                {i + 1}. {p.title}
              </p>
              <p className="text-muted-foreground mt-0.5">{p.why}</p>
            </li>
          ))}
        </ol>
      </div>
      <Section title="Quick wins this week" items={a.quickWins} />
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Suggested posting cadence</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {a.recommendedPostingCadence.map((c, i) => (
            <li key={i} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{c.platform}</p>
              <p className="text-muted-foreground">{c.cadence}</p>
              {c.formats.length > 0 && <p className="text-muted-foreground mt-1 text-xs">{c.formats.join(" · ")}</p>}
            </li>
          ))}
        </ul>
      </div>
      <Section title="Focus for your first 7 days" items={a.first7DaysFocus} />
      <p className="text-muted-foreground text-xs">Saved to your Content Library. Results aren&apos;t guaranteed — track what works and adjust.</p>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2">
            <Check className="text-success mt-0.5 size-4 shrink-0" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
