"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { OptionSelect, PlatformSelect } from "@/components/forms/option-select";
import { apiFetch, toastError } from "@/hooks/use-api";
import { MANUAL_METRIC_KEYS, metricLabel } from "./metrics";

export function ManualEntryDialog({
  accounts,
  defaultPlatform,
}: {
  accounts: { id: string; label: string; platform: string }[];
  defaultPlatform?: string;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(defaultPlatform ?? "instagram");
  const [accountId, setAccountId] = useState("none");
  const [date, setDate] = useState(today);
  const [source, setSource] = useState<"manual" | "import">("manual");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const platformAccounts = accounts.filter((a) => a.platform === platform);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const metrics: Record<string, number> = {};
    for (const [k, v] of Object.entries(values)) {
      if (v.trim() === "") continue;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return setErrors(`${metricLabel(k)} must be a non-negative number.`);
      metrics[k] = n;
    }
    if (!Object.keys(metrics).length) return setErrors("Enter at least one metric.");
    if (!date || date > today) return setErrors("Choose a date that isn't in the future.");
    setErrors(null);
    setSaving(true);
    const res = await apiFetch<{ saved: number }>("/api/analytics/manual", {
      method: "POST",
      json: { platform, socialAccountId: accountId === "none" ? null : accountId, date, source, metrics },
    });
    setSaving(false);
    if (!res.ok) return toastError(res.error);
    toast.success(`Saved ${res.data.saved} figure${res.data.saved === 1 ? "" : "s"}`, { description: "Labelled as manually entered." });
    setValues({});
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-4" /> Add figures
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add figures manually</DialogTitle>
            <DialogDescription>
              Record numbers from a platform&apos;s native analytics. They&apos;ll always be labelled as manual or imported, never as live data.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Platform" htmlFor="m-platform" required>
              <PlatformSelect
                id="m-platform"
                value={platform}
                onChange={(v) => {
                  setPlatform(v);
                  setAccountId("none");
                }}
              />
            </Field>
            <Field label="Date" htmlFor="m-date" required>
              <Input id="m-date" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Account (optional)" htmlFor="m-account">
              <OptionSelect
                id="m-account"
                value={accountId}
                onChange={setAccountId}
                options={[{ value: "none", label: "Not linked to an account" }, ...platformAccounts.map((a) => ({ value: a.id, label: a.label }))]}
              />
            </Field>
            <Field label="Source" htmlFor="m-source">
              <OptionSelect
                id="m-source"
                value={source}
                onChange={(v) => setSource(v as "manual" | "import")}
                options={[
                  { value: "manual", label: "Manual entry" },
                  { value: "import", label: "Imported history" },
                ]}
              />
            </Field>
          </div>
          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="mb-2 text-sm font-medium">Metrics (leave blank to skip)</legend>
            {MANUAL_METRIC_KEYS.map((k) => (
              <Field key={k} label={metricLabel(k)} htmlFor={`m-${k}`}>
                <Input
                  id={`m-${k}`}
                  inputMode="decimal"
                  type="number"
                  min={0}
                  value={values[k] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                />
              </Field>
            ))}
          </fieldset>
          <p className="text-muted-foreground text-xs">
            Followers are a running total (enter the count on that date). Other metrics are that day&apos;s activity.
          </p>
          {errors && (
            <p role="alert" className="text-destructive text-sm">
              {errors}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save figures"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
