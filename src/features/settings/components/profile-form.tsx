"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { OptionSelect } from "@/components/forms/option-select";
import { updateProfile } from "../actions";
import { profileSchema, type ProfileValues } from "../schemas";

export function ProfileForm({ email, initial }: { email: string; initial: ProfileValues }) {
  const router = useRouter();
  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [initial.timezone];
    }
  }, [initial.timezone]);
  const { register, handleSubmit, control, formState, reset } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });

  const onSubmit = handleSubmit(async (values) => {
    const res = await updateProfile(values);
    if (res.ok) {
      toast.success("Profile saved");
      reset(values);
      router.refresh();
    } else toast.error(res.error.message);
  });

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear to teammates, and the timezone used for scheduling.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-6">
          <Field label="Email" htmlFor="email" hint="Your sign-in email can't be changed here.">
            <Input id="email" value={email} disabled readOnly />
          </Field>
          <Field label="Full name" htmlFor="fullName" error={formState.errors.fullName?.message}>
            <Input id="fullName" aria-invalid={!!formState.errors.fullName} {...register("fullName")} />
          </Field>
          <Field label="Avatar URL (optional)" htmlFor="avatarUrl" error={formState.errors.avatarUrl?.message}>
            <Input id="avatarUrl" placeholder="https://…" {...register("avatarUrl")} />
          </Field>
          <Field label="Timezone" htmlFor="timezone" error={formState.errors.timezone?.message}>
            <Controller control={control} name="timezone" render={({ field }) => <OptionSelect id="timezone" value={field.value} onChange={field.onChange} options={timezones} />} />
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={formState.isSubmitting || !formState.isDirty}>
            {formState.isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
