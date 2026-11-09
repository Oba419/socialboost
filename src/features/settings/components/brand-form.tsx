"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { OptionSelect } from "@/components/forms/option-select";
import { PLATFORM_LIST } from "@/config/platforms";
import { CONTENT_FORMATS, GOALS, POSTING_FREQUENCIES, USER_TYPES } from "@/features/onboarding/options";
import { updateBrandProfile } from "../actions";
import { brandSchema, type BrandValues } from "../schemas";

function CheckGroup({ options, value, onChange, label }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <label key={o.value} className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm">
            <Checkbox
              checked={value.includes(o.value)}
              onCheckedChange={(c) => onChange(c ? [...value, o.value] : value.filter((v) => v !== o.value))}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function BrandForm({ initial, canManage }: { initial: BrandValues; canManage: boolean }) {
  const router = useRouter();
  const { register, handleSubmit, control, formState, reset } = useForm<BrandValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: initial,
  });
  const onSubmit = handleSubmit(async (values) => {
    const res = await updateBrandProfile(values);
    if (res.ok) {
      toast.success("Brand profile saved");
      reset(values);
      router.refresh();
    } else toast.error(res.error.message);
  });

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader>
          <CardTitle>Brand profile</CardTitle>
          <CardDescription>
            Used to personalise every AI generation in this workspace. {!canManage && "Only workspace owners and admins can edit it."}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          <fieldset disabled={!canManage} className="space-y-4">
            <Field label="Workspace name" htmlFor="name" error={formState.errors.name?.message}>
              <Input id="name" {...register("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Account type" htmlFor="userType">
                <Controller
                  control={control}
                  name="userType"
                  render={({ field }) => (
                    <OptionSelect id="userType" value={field.value ?? undefined} onChange={field.onChange} options={USER_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
                  )}
                />
              </Field>
              <Field label="Niche" htmlFor="niche" error={formState.errors.niche?.message}>
                <Input id="niche" {...register("niche")} />
              </Field>
              <Field label="Target audience" htmlFor="targetAudience" error={formState.errors.targetAudience?.message}>
                <Input id="targetAudience" {...register("targetAudience")} />
              </Field>
              <Field label="Location / market" htmlFor="location">
                <Input id="location" {...register("location")} />
              </Field>
              <Field label="Brand voice" htmlFor="brandVoice">
                <Input id="brandVoice" {...register("brandVoice")} />
              </Field>
              <Field label="Posting capacity" htmlFor="postingFrequency">
                <Controller
                  control={control}
                  name="postingFrequency"
                  render={({ field }) => <OptionSelect id="postingFrequency" value={field.value} onChange={field.onChange} options={POSTING_FREQUENCIES} />}
                />
              </Field>
            </div>
            <Controller
              control={control}
              name="platforms"
              render={({ field }) => (
                <CheckGroup label="Platforms" options={PLATFORM_LIST.map((p) => ({ value: p.id, label: p.name }))} value={field.value ?? []} onChange={field.onChange} />
              )}
            />
            <Controller
              control={control}
              name="goals"
              render={({ field }) => <CheckGroup label="Goals" options={GOALS.map((g) => ({ value: g, label: g }))} value={field.value ?? []} onChange={field.onChange} />}
            />
            <Controller
              control={control}
              name="preferredFormats"
              render={({ field }) => (
                <CheckGroup label="Preferred formats" options={CONTENT_FORMATS.map((g) => ({ value: g, label: g }))} value={field.value ?? []} onChange={field.onChange} />
              )}
            />
            <Field label="Content resources" htmlFor="contentResources">
              <Textarea id="contentResources" rows={3} {...register("contentResources")} />
            </Field>
          </fieldset>
        </CardContent>
        {canManage && (
          <CardFooter className="justify-end">
            <Button type="submit" disabled={formState.isSubmitting || !formState.isDirty}>
              {formState.isSubmitting ? "Saving…" : "Save brand profile"}
            </Button>
          </CardFooter>
        )}
      </form>
    </Card>
  );
}
