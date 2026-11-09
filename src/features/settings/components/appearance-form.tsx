"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { updateTheme } from "../actions";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function AppearanceForm({ savedTheme }: { savedTheme: "light" | "dark" | "system" }) {
  const { theme, setTheme } = useTheme();
  // True only on the client (avoids a hydration mismatch with next-themes).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const current = mounted ? (theme ?? savedTheme) : savedTheme;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how the app looks. Saved to your account.</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={current === o.value}
              onClick={async () => {
                setTheme(o.value);
                const res = await updateTheme(o.value);
                if (!res.ok) toast.error(res.error.message);
              }}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors",
                "focus-visible:ring-ring outline-none focus-visible:ring-2",
                current === o.value ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent",
              )}
            >
              <o.icon className="size-5" />
              {o.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
