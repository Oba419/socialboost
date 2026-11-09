"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { apiFetch } from "@/hooks/use-api";
import { changePassword } from "@/features/auth/actions";
import { changePasswordSchema, type ChangePasswordValues } from "@/features/auth/schemas";
import { PasswordInput, PasswordStrength } from "@/features/auth/components/password-input";

export function SecurityPanel({ hasPassword }: { hasPassword: boolean }) {
  return (
    <div className="space-y-6">
      {hasPassword ? <ChangePasswordCard /> : (
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>You sign in with Google. Use “Forgot password” on the sign-in page to add a password.</CardDescription>
          </CardHeader>
        </Card>
      )}
      <ExportCard />
      <DeleteAccountCard />
    </div>
  );
}

function ChangePasswordCard() {
  const { register, handleSubmit, formState, reset, control } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirm: "" },
  });
  const newPassword = useWatch({ control, name: "password" });
  const onSubmit = handleSubmit(async (values) => {
    const res = await changePassword(values);
    if (res.ok) {
      toast.success("Password changed");
      reset();
    } else toast.error(res.error.message);
  });
  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 py-6">
          <Field label="Current password" htmlFor="currentPassword" error={formState.errors.currentPassword?.message}>
            <PasswordInput id="currentPassword" autoComplete="current-password" {...register("currentPassword")} />
          </Field>
          <Field label="New password" htmlFor="newPassword" error={formState.errors.password?.message}>
            <PasswordInput id="newPassword" autoComplete="new-password" {...register("password")} />
          </Field>
          <PasswordStrength value={newPassword} />
          <Field label="Confirm new password" htmlFor="confirmPassword" error={formState.errors.confirm?.message}>
            <PasswordInput id="confirmPassword" autoComplete="new-password" {...register("confirm")} />
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Updating…" : "Update password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ExportCard() {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message ?? "Export failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `socialboost-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data export has downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Export your data</CardTitle>
        <CardDescription>Download a JSON file with your profile, workspaces, content, plans, schedules and billing history. Access tokens are never included.</CardDescription>
      </CardHeader>
      <CardFooter className="justify-end pt-4">
        <Button variant="outline" onClick={download} disabled={busy}>
          <Download className="size-4" /> {busy ? "Preparing…" : "Download export"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function DeleteAccountCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Delete account</CardTitle>
        <CardDescription>
          Permanently deletes your account, every workspace you own (including its content, connected accounts and media) and your billing records. Teammates lose
          access to workspaces you own. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-end pt-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="size-4" /> Delete my account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>Type DELETE to confirm. Consider exporting your data first.</DialogDescription>
            </DialogHeader>
            <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type DELETE to confirm" autoComplete="off" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirm !== "DELETE" || busy}
                onClick={async () => {
                  setBusy(true);
                  const res = await apiFetch<{ deleted: boolean }>("/api/account/delete", { method: "POST", json: { confirm } });
                  if (res.ok) {
                    toast.success("Your account has been deleted");
                    router.replace("/");
                    router.refresh();
                  } else {
                    setBusy(false);
                    toast.error(res.error.message);
                  }
                }}
              >
                {busy ? "Deleting…" : "Permanently delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
