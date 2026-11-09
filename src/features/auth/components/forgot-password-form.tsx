"use client";

import { useState } from "react";
import { MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { requestPasswordReset } from "../actions";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const res = await requestPasswordReset(values);
    if (res.ok) setSentTo(values.email);
    else toast.error(res.error.message);
  });

  if (sentTo) {
    return (
      <div className="space-y-3 text-center" role="status">
        <MailCheck className="text-primary mx-auto size-10" />
        <p className="text-sm">
          If an account exists for <strong>{sentTo}</strong>, we&apos;ve sent a link to reset your password. It expires in about an hour.
        </p>
        <Button variant="outline" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" error={formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!formState.errors.email} {...register("email")} />
      </Field>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
