"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/forms/field";
import { updatePassword } from "../actions";
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas";
import { PasswordInput, PasswordStrength } from "./password-input";

export function ResetPasswordForm() {
  const { register, handleSubmit, formState, control } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const newPassword = useWatch({ control, name: "password" });

  const onSubmit = handleSubmit(async (values) => {
    const res = await updatePassword(values);
    if (res.ok) {
      toast.success("Password updated");
      window.location.assign(res.data.redirectTo);
    } else toast.error(res.error.message);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="New password" htmlFor="password" error={formState.errors.password?.message}>
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!formState.errors.password} {...register("password")} />
      </Field>
      <PasswordStrength value={newPassword} />
      <Field label="Confirm password" htmlFor="confirm" error={formState.errors.confirm?.message}>
        <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={!!formState.errors.confirm} {...register("confirm")} />
      </Field>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
