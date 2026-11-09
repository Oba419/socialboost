"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerification } from "../actions";

export function ResendVerification({ initialEmail }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const res = await resendVerification(email);
        setBusy(false);
        if (res.ok) {
          toast.success("Verification email sent");
          setCooldown(60);
        } else toast.error(res.error.message);
      }}
    >
      {!initialEmail && (
        <div className="space-y-1.5 text-left">
          <Label htmlFor="resend-email">Email</Label>
          <Input id="resend-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      )}
      <Button type="submit" variant="outline" className="w-full" disabled={busy || cooldown > 0 || !email}>
        {busy ? "Sending…" : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
      </Button>
    </form>
  );
}
