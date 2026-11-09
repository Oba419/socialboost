"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Dialog that requires an audit reason before running a sensitive admin action. */
export function ReasonDialog({
  trigger,
  title,
  description,
  confirmLabel,
  destructive,
  children,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  children?: React.ReactNode;
  onConfirm: (reason: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = reason.trim().length >= 5;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setReason("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <div className="space-y-1.5">
          <Label htmlFor="admin-reason">Reason (recorded in the audit log)</Label>
          <Textarea id="admin-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
          {!valid && reason.length > 0 && <p className="text-destructive text-xs">Enter at least 5 characters.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={!valid || busy}
            onClick={async () => {
              setBusy(true);
              const ok = await onConfirm(reason.trim());
              setBusy(false);
              if (ok) setOpen(false);
            }}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
