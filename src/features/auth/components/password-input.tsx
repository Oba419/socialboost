"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { passwordStrength } from "../schemas";

export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(function PasswordInput(
  { className, ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={show ? "text" : "password"} className={cn("pr-10", className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const s = passwordStrength(value);
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i < s ? (s <= 1 ? "bg-destructive" : s === 2 ? "bg-warning" : "bg-success") : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">Password strength: {LABELS[s]}</p>
    </div>
  );
}
