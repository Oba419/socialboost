"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { PlatformSelect } from "@/components/forms/option-select";
import { apiFetch, toastError } from "@/hooks/use-api";
import type { CompetitorRow } from "@/types/database";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  platform: z.string().min(1, "Choose a platform."),
  handle: z.string().max(100).optional(),
  profileUrl: z.union([z.literal(""), z.string().trim().url("Enter a valid URL (https://…).")]).optional(),
  notes: z.string().max(4000).optional(),
});
type Values = z.infer<typeof schema>;

export function CompetitorFormDialog({ competitor, trigger }: { competitor?: CompetitorRow; trigger?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, control, formState, reset } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: competitor?.name ?? "",
      platform: competitor?.platform ?? "instagram",
      handle: competitor?.handle ?? "",
      profileUrl: competitor?.profile_url ?? "",
      notes: competitor?.notes ?? "",
    },
  });

  const submit = handleSubmit(async (v) => {
    setBusy(true);
    const body = { name: v.name, platform: v.platform, handle: v.handle || null, profileUrl: v.profileUrl || null, notes: v.notes || null };
    const res = competitor
      ? await apiFetch(`/api/competitors/${competitor.id}`, { method: "PATCH", json: body })
      : await apiFetch<{ id: string }>("/api/competitors", { method: "POST", json: body });
    setBusy(false);
    if (!res.ok) return toastError(res.error);
    toast.success(competitor ? "Competitor updated" : "Competitor added");
    setOpen(false);
    if (!competitor) reset();
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" /> Add competitor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{competitor ? "Edit competitor" : "Add a competitor"}</DialogTitle>
          <DialogDescription>Enter details from public observation. We never scrape profiles or access private data.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="c-name" required error={formState.errors.name?.message}>
              <Input id="c-name" aria-invalid={!!formState.errors.name} {...register("name")} />
            </Field>
            <Field label="Platform" htmlFor="c-platform" required>
              <Controller control={control} name="platform" render={({ field }) => <PlatformSelect id="c-platform" value={field.value} onChange={field.onChange} />} />
            </Field>
            <Field label="Handle" htmlFor="c-handle">
              <Input id="c-handle" placeholder="@brand" {...register("handle")} />
            </Field>
            <Field label="Profile URL" htmlFor="c-url" error={formState.errors.profileUrl?.message}>
              <Input id="c-url" type="url" placeholder="https://" {...register("profileUrl")} />
            </Field>
          </div>
          <Field label="Notes & observations" htmlFor="c-notes" hint="What do they post about? Which formats? Anything that performs visibly well?">
            <Textarea id="c-notes" rows={4} {...register("notes")} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : competitor ? "Save changes" : "Add competitor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
