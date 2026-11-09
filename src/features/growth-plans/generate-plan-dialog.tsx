"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { AI_SERVICES } from "@/config/ai";
import { apiFetch, toastError } from "@/hooks/use-api";

const schema = z.object({
  durationDays: z.enum(["7", "30"]),
  focus: z.string().max(300).optional(),
  hoursPerWeek: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 80), "Enter 1–80 hours."),
});
type Values = z.infer<typeof schema>;

export function GeneratePlanDialog({
  aiReady,
  can30,
  trigger,
  defaultDuration = "7",
  defaultFocus = "",
}: {
  aiReady: boolean;
  can30: boolean;
  trigger?: React.ReactNode;
  defaultDuration?: "7" | "30";
  defaultFocus?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, control, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { durationDays: can30 ? defaultDuration : "7", focus: defaultFocus, hoursPerWeek: "" },
  });

  const submit = handleSubmit(async (v) => {
    setBusy(true);
    const res = await apiFetch<{ plan: { id: string } }>("/api/growth-plans", {
      method: "POST",
      json: {
        durationDays: Number(v.durationDays),
        focus: v.focus?.trim() || undefined,
        hoursPerWeek: v.hoursPerWeek ? Number(v.hoursPerWeek) : undefined,
      },
    });
    setBusy(false);
    if (!res.ok) return toastError(res.error);
    toast.success("Your growth plan is ready");
    setOpen(false);
    router.push(`/dashboard/growth-plans/${res.data.plan.id}`);
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button disabled={!aiReady}>
            <Sparkles className="size-4" /> New growth plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate a growth plan</DialogTitle>
          <DialogDescription>
            Built from your brand profile and any real performance data. Targets are goals to track, not guarantees.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Controller
            control={control}
            name="durationDays"
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-2" aria-label="Plan length">
                <Label className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 font-normal">
                  <RadioGroupItem value="7" /> 7-day plan
                </Label>
                <Label className={`flex items-center gap-2 rounded-lg border p-3 font-normal ${can30 ? "hover:bg-accent cursor-pointer" : "opacity-60"}`}>
                  <RadioGroupItem value="30" disabled={!can30} /> 30-day plan
                  {!can30 && <Lock className="ml-auto size-3.5" aria-label="Requires Creator Pro" />}
                </Label>
              </RadioGroup>
            )}
          />
          {!can30 && <p className="text-muted-foreground text-xs">30-day plans are available on Creator Pro and above.</p>}
          <Field label="Focus (optional)" htmlFor="focus" hint="e.g. Launch my new course, grow on TikTok">
            <Textarea id="focus" rows={2} {...register("focus")} />
          </Field>
          <Field label="Hours you can spend per week" htmlFor="hoursPerWeek" error={formState.errors.hoursPerWeek?.message}>
            <Input id="hoursPerWeek" inputMode="numeric" placeholder="e.g. 5" {...register("hoursPerWeek")} />
          </Field>
          <DialogFooter className="items-center gap-2 sm:justify-between">
            <span className="text-muted-foreground text-xs">Uses {AI_SERVICES.growth_plan.credits} AI credits</span>
            <Button type="submit" disabled={busy || !aiReady}>
              <Sparkles className="size-4" /> {busy ? "Building your plan… (up to a minute)" : "Generate plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
