"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, ExternalLink, RotateCcw, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { Field } from "@/components/forms/field";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { apiFetch, toastError } from "@/hooks/use-api";
import type { CalendarEvent } from "./schemas";
import { PlatformDot, ScheduleStatusBadge } from "./status";
import { TimeZoneSelect } from "./timezone-select";
import { formatInZone, getZonedParts, zonedTimeToUtc } from "./timezone";

interface Props {
  event: CalendarEvent | null;
  timeZone: string;
  canEdit: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function EventDialog(props: Props) {
  if (!props.event) return null;
  // Keyed so local form state resets for each event.
  return <EventDialogInner key={props.event.id} {...props} event={props.event} />;
}

function EventDialogInner({ event, timeZone, canEdit, onOpenChange, onChanged }: Props & { event: CalendarEvent }) {
  const initial = getZonedParts(new Date(event.scheduled_at), event.timezone);
  const [panel, setPanel] = useState<"none" | "reschedule" | "posted">("none");
  const [dateKey, setDateKey] = useState(initial.dateKey);
  const [time, setTime] = useState(initial.time);
  const [tz, setTz] = useState(event.timezone);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const plat = isPlatformId(event.platform) ? PLATFORMS[event.platform] : null;
  const post = event.social_posts;
  const fullText = [post?.body ?? "", (post?.hashtags ?? []).map((h) => `#${h.replace(/^#/, "")}`).join(" ")].filter(Boolean).join("\n\n");
  const editable = ["scheduled", "failed", "manual_required"].includes(event.status);
  const manualPublished = event.status === "published" && event.publish_mode === "manual";
  const outcomeUnknown = event.status === "failed" && (event.last_error ?? "").startsWith("Outcome unknown");

  async function act(body: Record<string, unknown>, success: string) {
    setBusy(true);
    const res = await apiFetch<CalendarEvent>(`/api/schedule/${event.id}`, { method: "PATCH", json: body });
    setBusy(false);
    if (!res.ok) return toastError(res.error);
    toast.success(success);
    onChanged();
    onOpenChange(false);
  }

  async function reschedule() {
    let when: Date;
    try {
      when = zonedTimeToUtc(dateKey, time, tz);
    } catch {
      return toast.error("Choose a valid date and time.");
    }
    await act({ action: "reschedule", scheduledAt: when.toISOString(), timezone: tz }, "Rescheduled");
  }

  async function remove() {
    const res = await apiFetch(`/api/schedule/${event.id}`, { method: "DELETE" });
    if (!res.ok) return toastError(res.error);
    toast.success("Removed from calendar");
    onChanged();
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {plat && <PlatformDot color={plat.color} className="size-2.5" />}
            {post?.title || `${plat?.name ?? event.platform} post`}
          </DialogTitle>
          <DialogDescription>
            {formatInZone(event.scheduled_at, timeZone, { dateStyle: "full", timeStyle: "short" })}
            {event.timezone !== timeZone && (
              <> · scheduled as {formatInZone(event.scheduled_at, event.timezone, { timeStyle: "short" })} {event.timezone.replace(/_/g, " ")}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ScheduleStatusBadge status={event.status} manualPublished={manualPublished} />
            <span className="text-muted-foreground">
              {event.publish_mode === "auto"
                ? `Auto-publish via @${event.social_accounts?.username ?? event.social_accounts?.display_name ?? "connected account"}`
                : "Manual publishing"}
            </span>
          </div>

          {event.status === "failed" && event.last_error && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>{outcomeUnknown ? "Publishing outcome unknown" : "Publishing failed"}</AlertTitle>
              <AlertDescription>{event.last_error}</AlertDescription>
            </Alert>
          )}
          {event.status === "scheduled" && event.last_error && (
            <p className="text-muted-foreground text-xs">Retrying automatically. Last error: {event.last_error}</p>
          )}
          {event.status === "manual_required" && (
            <Alert className="border-warning/40">
              <CalendarClock className="text-warning" />
              <AlertTitle>Time to post</AlertTitle>
              <AlertDescription>Copy the text below, post it on {plat?.name ?? event.platform}, then mark it as posted.</AlertDescription>
            </Alert>
          )}
          {event.status === "published" && (
            <p className="text-sm">
              {manualPublished ? "Marked as posted by you" : "Confirmed by the platform"}
              {event.published_at && ` on ${formatInZone(event.published_at, timeZone, { dateStyle: "medium", timeStyle: "short" })}`}.
              {event.provider_post_url && (
                <>
                  {" "}
                  <a href={event.provider_post_url} target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-1 underline-offset-4 hover:underline">
                    View post <ExternalLink className="size-3.5" />
                  </a>
                </>
              )}
            </p>
          )}

          <div className="bg-muted/40 max-h-64 overflow-y-auto rounded-lg border p-3 text-sm whitespace-pre-wrap">{fullText || "No text"}</div>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={fullText} label="Copy text" />
            <Button size="sm" variant="ghost" asChild>
              <Link href="/dashboard/library?tab=posts">Open library</Link>
            </Button>
          </div>

          {canEdit && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {editable && (
                  <Button size="sm" variant={panel === "reschedule" ? "secondary" : "outline"} onClick={() => setPanel(panel === "reschedule" ? "none" : "reschedule")}>
                    <CalendarClock className="size-4" /> Reschedule
                  </Button>
                )}
                {event.publish_mode === "manual" && editable && (
                  <Button size="sm" variant={panel === "posted" ? "secondary" : "outline"} onClick={() => setPanel(panel === "posted" ? "none" : "posted")}>
                    <CheckCircle2 className="size-4" /> Mark as posted
                  </Button>
                )}
                {event.status === "failed" && (
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="outline" disabled={busy}>
                        <RotateCcw className="size-4" /> Retry now
                      </Button>
                    }
                    title="Retry publishing?"
                    description={
                      outcomeUnknown
                        ? "The last attempt may have succeeded. Check the platform first — retrying could create a duplicate post."
                        : "We'll try to publish again in about two minutes."
                    }
                    confirmLabel="Retry"
                    onConfirm={() => act({ action: "retry" }, "Queued for retry")}
                  />
                )}
                {editable && (
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="outline" disabled={busy}>
                        <XCircle className="size-4" /> Cancel
                      </Button>
                    }
                    title="Cancel this scheduled post?"
                    description="It won't be published. The draft stays in your library."
                    confirmLabel="Cancel post"
                    destructive
                    onConfirm={() => act({ action: "cancel" }, "Cancelled")}
                  />
                )}
                {event.status !== "processing" && (
                  <ConfirmDialog
                    trigger={
                      <Button size="sm" variant="ghost" className="text-destructive ml-auto" disabled={busy}>
                        <Trash2 className="size-4" /> Remove
                      </Button>
                    }
                    title="Remove from calendar?"
                    description="This deletes the schedule entry. Posts already live on the platform are not affected."
                    confirmLabel="Remove"
                    destructive
                    onConfirm={remove}
                  />
                )}
              </div>

              {panel === "reschedule" && (
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Date" htmlFor="ev-date">
                      <Input id="ev-date" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
                    </Field>
                    <Field label="Time" htmlFor="ev-time">
                      <Input id="ev-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                    </Field>
                    <Field label="Timezone" htmlFor="ev-tz">
                      <TimeZoneSelect id="ev-tz" value={tz} onChange={setTz} extra={[timeZone]} />
                    </Field>
                  </div>
                  <Button size="sm" onClick={reschedule} disabled={busy}>
                    {busy ? "Saving…" : "Save new time"}
                  </Button>
                </div>
              )}
              {panel === "posted" && (
                <div className="space-y-3 rounded-lg border p-3">
                  <Field label="Link to the live post (optional)" htmlFor="ev-url" hint="This records that you posted it yourself; it isn't verified with the platform.">
                    <Input id="ev-url" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
                  </Field>
                  <Button size="sm" onClick={() => act({ action: "mark_posted", url }, "Marked as posted")} disabled={busy}>
                    Confirm I posted it
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
