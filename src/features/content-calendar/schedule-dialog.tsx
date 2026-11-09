"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { OptionSelect, PLATFORM_OPTIONS } from "@/components/forms/option-select";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { apiFetch, toastError } from "@/hooks/use-api";
import type { Paginated } from "@/lib/api/response";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/features/content-library/use-api-query";
import type { CalendarEvent } from "./schemas";
import { TimeZoneSelect } from "./timezone-select";
import { getZonedParts, zonedTimeToUtc } from "./timezone";
import type { CalendarAccount, SchedulablePost } from "./types";

const MANUAL = "manual";

export function ScheduleDialog({
  open,
  onOpenChange,
  timeZone,
  defaultDateKey,
  defaultTime,
  presetPost,
  accounts,
  onScheduled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeZone: string;
  defaultDateKey: string;
  defaultTime: string;
  /** When set, schedule this existing post (from ?schedule=<id>). */
  presetPost: SchedulablePost | null;
  accounts: CalendarAccount[];
  onScheduled: (event: CalendarEvent) => void;
}) {
  // The parent mounts this dialog fresh (keyed) on each open, so props seed the state.
  const [mode, setMode] = useState<"new" | "existing">(presetPost ? "existing" : "new");
  const [postId, setPostId] = useState<string>(presetPost?.id ?? "");
  const [text, setText] = useState("");
  const [platform, setPlatform] = useState<string>(
    presetPost?.platform && isPlatformId(presetPost.platform) ? presetPost.platform : "instagram",
  );
  const [chosenAccount, setAccountId] = useState<string>(MANUAL);
  const [dateKey, setDateKey] = useState(defaultDateKey);
  const [time, setTime] = useState(defaultTime);
  const [tz, setTz] = useState(timeZone);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needDrafts = open && mode === "existing" && !presetPost;
  const draftQuery = useApiQuery<Paginated<SchedulablePost>>(needDrafts ? "/api/posts?status=draft&pageSize=100" : null);
  const readyQuery = useApiQuery<Paginated<SchedulablePost>>(needDrafts ? "/api/posts?status=ready&pageSize=100" : null);
  const drafts = useMemo(
    () => [...(readyQuery.data?.items ?? []), ...(draftQuery.data?.items ?? [])],
    [readyQuery.data, draftQuery.data],
  );
  const draftsLoading = draftQuery.loading || readyQuery.loading;

  const platformAccounts = useMemo(() => accounts.filter((a) => a.platform === platform), [accounts, platform]);
  const accountId = platformAccounts.some((a) => a.id === chosenAccount) ? chosenAccount : MANUAL;

  const selectedPost = presetPost ?? drafts.find((d) => d.id === postId) ?? null;
  const bodyLength = mode === "new" ? text.length : (selectedPost?.body.length ?? 0);
  const limit = isPlatformId(platform) ? PLATFORMS[platform].textLimit : null;
  const caps = isPlatformId(platform) ? PLATFORMS[platform].capabilities : null;

  let scheduledUtc: Date | null = null;
  try {
    scheduledUtc = dateKey && time ? zonedTimeToUtc(dateKey, time, tz) : null;
  } catch {
    scheduledUtc = null;
  }
  const wallBack = scheduledUtc ? getZonedParts(scheduledUtc, tz) : null;
  const shiftedByDst = wallBack && wallBack.time !== time;

  async function submit() {
    setError(null);
    if (!scheduledUtc) return setError("Choose a valid date and time.");
    if (scheduledUtc.getTime() < Date.now() + 60_000) return setError("Pick a time at least one minute in the future.");
    if (mode === "new" && !text.trim()) return setError("Write the post text.");
    if (mode === "existing" && !postId) return setError("Choose a draft to schedule.");
    if (limit && bodyLength > limit) return setError(`${PLATFORMS[platform as keyof typeof PLATFORMS].name} allows up to ${limit} characters.`);

    setSubmitting(true);
    let id = postId;
    if (mode === "new") {
      const created = await apiFetch<{ id: string }>("/api/posts", {
        method: "POST",
        json: { body: text, platform },
      });
      if (!created.ok) {
        setSubmitting(false);
        return toastError(created.error);
      }
      id = created.data.id;
    }
    const res = await apiFetch<CalendarEvent>("/api/schedule", {
      method: "POST",
      json: {
        postId: id,
        platform,
        socialAccountId: accountId === MANUAL ? null : accountId,
        scheduledAt: scheduledUtc.toISOString(),
        timezone: tz,
      },
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(mode === "new" ? `${res.error.message} Your text was saved as a draft in the library.` : res.error.message);
      if (mode === "new") onOpenChange(false);
      if (mode === "new") toastError(res.error);
      return;
    }
    toast.success(
      res.data.publish_mode === "auto"
        ? "Scheduled — it will publish automatically"
        : "Scheduled — we'll remind you to post it manually",
    );
    onScheduled(res.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Schedule a post</DialogTitle>
          <DialogDescription>Times are saved in the timezone you choose and shown in yours.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {presetPost ? (
            <div className="bg-muted/40 rounded-lg border p-3 text-sm">
              <p className="font-medium">{presetPost.title || "Draft post"}</p>
              <p className="text-muted-foreground mt-1 line-clamp-4 whitespace-pre-wrap">{presetPost.body || "No text"}</p>
            </div>
          ) : (
            <>
              <Tabs value={mode} onValueChange={(v) => setMode(v as "new" | "existing")}>
                <TabsList className="w-full">
                  <TabsTrigger value="new" className="flex-1">Write new post</TabsTrigger>
                  <TabsTrigger value="existing" className="flex-1">Pick a draft</TabsTrigger>
                </TabsList>
              </Tabs>
              {mode === "new" ? (
                <Field label="Post text" htmlFor="sd-text">
                  <Textarea id="sd-text" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your post…" />
                </Field>
              ) : (
                <Field label="Draft" htmlFor="sd-draft">
                  {draftsLoading ? (
                    <p className="text-muted-foreground text-sm">Loading drafts…</p>
                  ) : drafts.length ? (
                    <OptionSelect
                      id="sd-draft"
                      value={postId}
                      onChange={(v) => {
                        setPostId(v);
                        const d = drafts.find((x) => x.id === v);
                        if (d?.platform && isPlatformId(d.platform)) setPlatform(d.platform);
                      }}
                      placeholder="Choose a draft"
                      options={drafts.map((d) => ({ value: d.id, label: (d.title || d.body || "Untitled").slice(0, 60) }))}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No drafts yet. <Link href="/dashboard/library" className="underline">Create one in the library</Link>.
                    </p>
                  )}
                </Field>
              )}
            </>
          )}
          {limit !== null && (
            <p className={cn("-mt-2 text-right text-xs tabular-nums", bodyLength > limit ? "text-destructive" : "text-muted-foreground")}>
              {bodyLength} / {limit} characters
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Platform" htmlFor="sd-platform">
              <OptionSelect id="sd-platform" value={platform} onChange={setPlatform} options={PLATFORM_OPTIONS} />
            </Field>
            <Field label="Publish via" htmlFor="sd-account">
              <OptionSelect
                id="sd-account"
                value={accountId}
                onChange={setAccountId}
                options={[
                  { value: MANUAL, label: "Remind me to post manually" },
                  ...platformAccounts
                    .filter((a) => a.status === "connected")
                    .map((a) => ({ value: a.id, label: `@${a.username ?? a.display_name ?? "account"}` })),
                ]}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date" htmlFor="sd-date">
              <Input id="sd-date" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
            </Field>
            <Field label="Time" htmlFor="sd-time">
              <Input id="sd-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="Timezone" htmlFor="sd-tz">
              <TimeZoneSelect id="sd-tz" value={tz} onChange={setTz} extra={[timeZone]} />
            </Field>
          </div>
          {shiftedByDst && wallBack && (
            <p className="text-warning text-xs">
              {time} doesn&apos;t exist on that day in {tz} (daylight-saving change). It will be scheduled for {wallBack.time}.
            </p>
          )}

          <Alert>
            <Info />
            <AlertDescription className="text-xs">
              {accountId === MANUAL ? (
                <>You&apos;ll get a notification at the scheduled time with the post ready to copy. Mark it as posted once it&apos;s live.</>
              ) : caps && caps.scheduling !== "manual" ? (
                <>
                  Publishes automatically through the official {PLATFORMS[platform as keyof typeof PLATFORMS].name} API if this post type is supported
                  (text: {caps.publishText}, image: {caps.publishImage}, video: {caps.publishVideo}). Otherwise you&apos;ll get a manual reminder.
                  It&apos;s only marked published once the platform confirms it.
                </>
              ) : (
                <>Direct publishing isn&apos;t available for this platform yet, so you&apos;ll get a reminder to post manually.</>
              )}
            </AlertDescription>
          </Alert>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
