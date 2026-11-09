"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FEATURE_KEYS, FEATURE_LABELS, type PlanLimits } from "@/config/plans";
import { apiFetch, toastError } from "@/hooks/use-api";

export interface EditablePlan {
  id: string;
  name: string;
  description: string;
  priceMonthlyNaira: number;
  priceAnnualNaira: number;
  features: string[];
  limits: PlanLimits;
  isActive: boolean;
  highlighted: boolean;
  startingFrom: boolean;
  bullets: string[];
}

const LIMIT_FIELDS: { key: keyof PlanLimits; label: string; nullable: boolean }[] = [
  { key: "aiCreditsPerPeriod", label: "AI credits / period", nullable: false },
  { key: "savedItems", label: "Saved items", nullable: true },
  { key: "socialAccounts", label: "Social accounts", nullable: false },
  { key: "scheduledPostsPerMonth", label: "Scheduled posts / month", nullable: true },
  { key: "workspaces", label: "Workspaces", nullable: false },
  { key: "teamMembers", label: "Team members", nullable: false },
  { key: "mediaStorageMb", label: "Media storage (MB)", nullable: false },
];

export function PlanEditor({ plan }: { plan: EditablePlan }) {
  const router = useRouter();
  const [state, setState] = useState(plan);
  const [limits, setLimits] = useState<Record<string, string>>(
    Object.fromEntries(LIMIT_FIELDS.map((f) => [f.key, plan.limits[f.key] === null ? "" : String(plan.limits[f.key])])),
  );
  const [bullets, setBullets] = useState(plan.bullets.join("\n"));
  const [saving, setSaving] = useState(false);
  const isFree = plan.id === "free";

  async function save() {
    const parsedLimits: Record<string, number | null> = {};
    for (const f of LIMIT_FIELDS) {
      const raw = limits[f.key].trim();
      if (raw === "" && f.nullable) parsedLimits[f.key] = null;
      else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0) return toast.error(`${f.label} must be a whole number${f.nullable ? " or blank for unlimited" : ""}.`);
        parsedLimits[f.key] = n;
      }
    }
    setSaving(true);
    const res = await apiFetch(`/api/admin/plans/${plan.id}`, {
      method: "PATCH",
      json: {
        name: state.name,
        description: state.description,
        priceMonthlyNaira: state.priceMonthlyNaira,
        priceAnnualNaira: state.priceAnnualNaira,
        features: state.features,
        limits: parsedLimits,
        isActive: state.isActive,
        highlighted: state.highlighted,
        startingFrom: state.startingFrom,
        bullets: bullets.split("\n").map((b) => b.trim()).filter(Boolean),
      },
    });
    setSaving(false);
    if (!res.ok) return toastError(res.error);
    toast.success(`${state.name} saved`);
    router.refresh();
  }

  const id = (s: string) => `${plan.id}-${s}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>
            {plan.name} <code className="text-muted-foreground text-xs font-normal">{plan.id}</code>
          </span>
          <span className="flex items-center gap-2 text-sm font-normal">
            <Label htmlFor={id("active")}>Active</Label>
            <Switch id={id("active")} checked={state.isActive} disabled={isFree} onCheckedChange={(v) => setState({ ...state, isActive: v })} />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor={id("name")}>Name</Label>
            <Input id={id("name")} value={state.name} onChange={(e) => setState({ ...state, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={id("pm")}>Monthly price (₦)</Label>
            <Input
              id={id("pm")}
              type="number"
              min={0}
              disabled={isFree}
              value={state.priceMonthlyNaira}
              onChange={(e) => setState({ ...state, priceMonthlyNaira: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={id("pa")}>Annual price (₦)</Label>
            <Input
              id={id("pa")}
              type="number"
              min={0}
              disabled={isFree}
              value={state.priceAnnualNaira}
              onChange={(e) => setState({ ...state, priceAnnualNaira: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox checked={state.highlighted} onCheckedChange={(v) => setState({ ...state, highlighted: v === true })} /> Highlight as popular
            </label>
            <label className="flex items-center gap-2">
              <Checkbox checked={state.startingFrom} onCheckedChange={(v) => setState({ ...state, startingFrom: v === true })} /> “From” pricing
            </label>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={id("desc")}>Description</Label>
          <Input id={id("desc")} value={state.description} onChange={(e) => setState({ ...state, description: e.target.value })} />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Limits</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LIMIT_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={id(f.key)} className="text-xs">
                  {f.label}
                </Label>
                <Input
                  id={id(f.key)}
                  inputMode="numeric"
                  placeholder={f.nullable ? "Unlimited" : undefined}
                  value={limits[f.key]}
                  onChange={(e) => setLimits({ ...limits, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Features</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_KEYS.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={state.features.includes(f)}
                  onCheckedChange={(v) =>
                    setState({ ...state, features: v ? [...state.features, f] : state.features.filter((x) => x !== f) })
                  }
                />
                {FEATURE_LABELS[f]}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor={id("bullets")}>Marketing bullets (one per line)</Label>
          <Textarea id={id("bullets")} rows={4} value={bullets} onChange={(e) => setBullets(e.target.value)} />
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save plan"}
        </Button>
      </CardFooter>
    </Card>
  );
}
