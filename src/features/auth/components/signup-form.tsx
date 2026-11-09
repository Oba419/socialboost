"use client";

import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { signUp } from "../actions";
import { passwordSchema } from "../schemas";
import { GoogleButton, OrDivider } from "./google-button";
import { PasswordInput, PasswordStrength } from "./password-input";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email address."),
  password: passwordSchema,
  terms: z.boolean().refine((v) => v, "Please accept the terms to continue."),
});
type Values = z.infer<typeof schema>;

export function SignupForm({ plan, googleEnabled }: { plan?: string; googleEnabled: boolean }) {
  const { register, handleSubmit, formState, control, setValue } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", terms: false },
  });
  const password = useWatch({ control, name: "password" });
  const terms = useWatch({ control, name: "terms" });

  const onSubmit = handleSubmit(async (values) => {
    const res = await signUp({ fullName: values.fullName, email: values.email, password: values.password, plan });
    if (res.ok) {
      window.location.assign(res.data.redirectTo);
      return;
    }
    toast.error(res.error.message);
  });

  return (
    <div className="space-y-4">
      {googleEnabled && (
        <>
          <GoogleButton next={plan ? `/onboarding?plan=${plan}` : "/onboarding"} label="Sign up with Google" />
          <OrDivider />
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Full name" htmlFor="fullName" error={formState.errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" aria-invalid={!!formState.errors.fullName} {...register("fullName")} />
        </Field>
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register("email")} />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={formState.errors.password?.message}
          hint="At least 8 characters with upper- and lowercase letters and a number."
        >
          <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!formState.errors.password} {...register("password")} />
        </Field>
        <PasswordStrength value={password} />
        <div className="space-y-1">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={terms}
              onCheckedChange={(c) => setValue("terms", c === true, { shouldValidate: true })}
              aria-invalid={!!formState.errors.terms}
              className="mt-0.5"
            />
            <span className="text-muted-foreground">
              I agree to the{" "}
              <Link href="/terms" className="text-primary underline">Terms</Link> and{" "}
              <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.
            </span>
          </label>
          {formState.errors.terms && <p role="alert" className="text-destructive text-xs">{formState.errors.terms.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </div>
  );
}
