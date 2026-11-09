"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { signIn } from "../actions";
import { GoogleButton, OrDivider } from "./google-button";
import { PasswordInput } from "./password-input";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type Values = z.infer<typeof schema>;

export function LoginForm({ next, googleEnabled }: { next?: string; googleEnabled: boolean }) {
  const [needsVerification, setNeedsVerification] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setNeedsVerification(null);
    const res = await signIn({ ...values, next });
    if (res.ok) {
      window.location.assign(res.data.redirectTo);
      return;
    }
    if (res.error.details?.needsVerification) setNeedsVerification(values.email);
    toast.error(res.error.message);
  });

  return (
    <div className="space-y-4">
      {googleEnabled && (
        <>
          <GoogleButton next={next} />
          <OrDivider />
        </>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={formState.errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" aria-invalid={!!formState.errors.password} {...register("password")} />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-primary text-sm underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      {needsVerification && (
        <p className="text-muted-foreground text-center text-sm">
          Didn&apos;t get the email?{" "}
          <Link href={`/verify-email?email=${encodeURIComponent(needsVerification)}`} className="text-primary underline">
            Resend verification
          </Link>
        </p>
      )}
    </div>
  );
}
