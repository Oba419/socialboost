"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { NotificationSettings } from "@/types/database";
import { updateNotificationSettings } from "../actions";
import { NOTIFICATION_CATEGORIES } from "../schemas";

export function NotificationForm({ initial, emailConfigured }: { initial: NotificationSettings; emailConfigured: boolean }) {
  const [settings, setSettings] = useState<NotificationSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = (channel: "in_app" | "email", key: string, value: boolean) => {
    setSettings((s) => ({ ...s, [channel]: { ...s[channel], [key]: value } }));
    setDirty(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Choose what you hear about.{" "}
          {emailConfigured ? "Email notifications are available." : "Email notifications will start once an email provider is configured for this deployment."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="text-muted-foreground grid grid-cols-[1fr_auto_auto] gap-x-6 border-b pb-2 text-xs font-medium">
          <span>Event</span>
          <span>In-app</span>
          <span>Email</span>
        </div>
        <ul className="divide-y">
          {NOTIFICATION_CATEGORIES.map((c) => (
            <li key={c.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 py-3">
              <span className="text-sm">{c.label}</span>
              <Switch
                checked={settings.in_app?.[c.key as keyof NotificationSettings["in_app"]] ?? true}
                onCheckedChange={(v) => set("in_app", c.key, v)}
                aria-label={`${c.label} in-app`}
              />
              {c.emailable ? (
                <Switch
                  checked={settings.email?.[c.key as keyof NotificationSettings["email"]] ?? false}
                  onCheckedChange={(v) => set("email", c.key, v)}
                  aria-label={`${c.label} email`}
                />
              ) : (
                <span className="text-muted-foreground w-8 text-center text-xs" aria-label="Not available by email">
                  —
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          disabled={!dirty || saving}
          onClick={async () => {
            setSaving(true);
            const res = await updateNotificationSettings(settings);
            setSaving(false);
            if (res.ok) {
              setDirty(false);
              toast.success("Notification preferences saved");
            } else toast.error(res.error.message);
          }}
        >
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </CardFooter>
    </Card>
  );
}
