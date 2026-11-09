"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { apiFetch, toastError } from "@/hooks/use-api";

interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

function validJson(v: string) {
  try {
    JSON.parse(v);
    return true;
  } catch {
    return false;
  }
}

function SettingRow({ setting, onSaved }: { setting: Setting; onSaved: () => void }) {
  const [value, setValue] = useState(setting.value);
  const [busy, setBusy] = useState(false);
  const ok = validJson(value);
  return (
    <div className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <code className="text-sm font-medium">{setting.key}</code>
        <span className="text-muted-foreground text-xs">updated {new Date(setting.updatedAt).toLocaleString()}</span>
      </div>
      <Textarea
        aria-label={`Value for ${setting.key}`}
        aria-invalid={!ok}
        className="font-mono text-xs"
        rows={Math.min(8, value.split("\n").length + 1)}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {!ok && <p className="text-destructive text-xs">Invalid JSON.</p>}
      <div className="flex justify-end gap-2">
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" aria-label={`Delete ${setting.key}`}>
              <Trash2 className="size-4" /> Delete
            </Button>
          }
          title={`Delete “${setting.key}”?`}
          destructive
          confirmLabel="Delete"
          onConfirm={async () => {
            const res = await apiFetch(`/api/admin/settings?key=${encodeURIComponent(setting.key)}`, { method: "DELETE" });
            if (!res.ok) return toastError(res.error);
            toast.success("Setting deleted");
            onSaved();
          }}
        />
        <Button
          size="sm"
          disabled={!ok || busy || value === setting.value}
          onClick={async () => {
            setBusy(true);
            const res = await apiFetch("/api/admin/settings", { method: "PUT", json: { key: setting.key, value } });
            setBusy(false);
            if (!res.ok) return toastError(res.error);
            toast.success("Saved");
            onSaved();
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export function SettingsEditor({ settings }: { settings: Setting[] }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [value, setValue] = useState('{\n  "enabled": false,\n  "message": ""\n}');
  const [busy, setBusy] = useState(false);
  const keyOk = /^[a-z][a-z0-9_.-]{1,62}$/.test(key);
  const jsonOk = validJson(value);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.length === 0 ? (
            <EmptyState title="No settings yet" description="Add a flag such as maintenance_banner." />
          ) : (
            settings.map((s) => <SettingRow key={`${s.key}-${s.updatedAt}`} setting={s} onSaved={() => router.refresh()} />)
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add setting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="setting-key">Key</Label>
            <Input id="setting-key" placeholder="maintenance_banner" value={key} onChange={(e) => setKey(e.target.value.trim())} />
            {key && !keyOk && <p className="text-destructive text-xs">Lowercase letters, numbers, “_ . -”; start with a letter.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="setting-value">Value (JSON)</Label>
            <Textarea id="setting-value" className="font-mono text-xs" rows={6} value={value} onChange={(e) => setValue(e.target.value)} />
            {!jsonOk && <p className="text-destructive text-xs">Invalid JSON.</p>}
          </div>
          <Button
            className="w-full"
            disabled={!keyOk || !jsonOk || busy}
            onClick={async () => {
              setBusy(true);
              const res = await apiFetch("/api/admin/settings", { method: "PUT", json: { key, value } });
              setBusy(false);
              if (!res.ok) return toastError(res.error);
              toast.success("Setting saved");
              setKey("");
              router.refresh();
            }}
          >
            Save setting
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
