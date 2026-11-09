import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
  next: z.string().max(500).optional(),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(100),
  email: emailSchema,
  password: passwordSchema,
  plan: z.string().max(40).optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] });

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password.").max(72), password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Password strength 0-4 for the UI meter. */
export function passwordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
  return s;
}
