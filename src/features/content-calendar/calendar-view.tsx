"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { OptionSelect, PLATFORM_OPTIONS } from "@/components/forms/option-select";
import { PLATFORMS, isPlatformId } from "@/config/platforms";
import { apiFetch, toastError } from "@/hooks/use-api";
import { cn } from "@/lib/utils";
import { HOURS, fromKey, hourLabel, rangeLabel, shiftCursor, utcRange, visibleDays, type CalendarView as View } from "./calendar-utils";
import { EventDialog } from "./event-dialog";
import { ScheduleDialog } from "./schedule-dialog";
import type { CalendarEvent } from "./schemas";
import { PlatformDot, eventChipClass } from "./status";
import { TimeZoneSelect } from "./timezone-select";
import { getZonedParts, isValidTimeZone, zonedTimeToUtc } from "./timezone";
import { useApiQuery } from "@/features/content-library/use-api-query";
import type { CalendarAccount, SchedulablePost } from "./types";

const TZ_KEY = "sb:calendar-tz";
const VIEW_KEY = "sb:calendar-view";
const DRAGGABLE = new Set(["scheduled", "failed", "manual_required"]);
const CONTENT_TYPES = [
  { value: "all", label: "All types" },
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "carousel", label: "Carousel" },
  { value: "thread", label: "Thread" },
  { value: "story", label: "Story" },
];

interface Positioned extends CalendarEvent {
  dayKey: string;
  time: string;
  hour: number;
}

export function CalendarView({
  userTimeZone,
  accounts,
  presetPost,
  canEdit,
}: {
  userTimeZone: string;
  accounts: CalendarAccount[];
  presetPost: SchedulablePost | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tz, setTz] = useState(userTimeZone);
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => getZonedParts(new Date(), userTimeZone).dateKey);
  const [platform, setPlatform] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  // ?schedule=<postId> → start with the schedule dialog open for that post.
  const [scheduleOpen, setScheduleOpen] = useState(Boolean(presetPost));
  const [dialogKey, setDialogKey] = useState(0);
  const [slot, setSlot] = useState<{ dateKey: string; time: string }>(() => ({
    dateKey: getZonedParts(new Date(), userTimeZone).dateKey,
    time: nextRoundTime(userTimeZone),
  }));
  const [preset, setPreset] = useState<SchedulablePost | null>(presetPost);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Restore per-viewer preferences from browser storage (external system) after hydration.
  useEffect(() => {
    try {
      const savedTz = localStorage.getItem(TZ_KEY);
      const savedView = localStorage.getItem(VIEW_KEY) as View | null;
      /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from localStorage; reading it during render would break hydration */
      if (savedTz && isValidTimeZone(savedTz)) setTz(savedTz);
      if (savedView === "month" || savedView === "week" || savedView === "day") setView(savedView);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      /* storage unavailable */
    }
  }, []);

  const days = useMemo(() => visibleDays(view, cursor), [view, cursor]);
  const todayKey = getZonedParts(new Date(now), tz).dateKey;
  const range = useMemo(() => utcRange(days, tz), [days, tz]);
  const {
    data: eventsData,
    loading,
    error,
    reload: load,
  } = useApiQuery<CalendarEvent[]>(`/api/schedule?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);
  const events = useMemo(() => eventsData ?? [], [eventsData]);

  const positioned: Positioned[] = useMemo(
    () =>
      events
        .filter((e) => platform === "all" || e.platform === platform)
        .filter((e) => contentType === "all" || e.social_posts?.content_type === contentType)
        .map((e) => {
          const p = getZonedParts(new Date(e.scheduled_at), tz);
          return { ...e, dayKey: p.dateKey, time: p.time, hour: p.hour };
        }),
    [events, platform, contentType, tz],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Positioned[]>();
    for (const e of positioned) {
      const list = map.get(e.dayKey) ?? [];
      list.push(e);
      map.set(e.dayKey, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [positioned]);

  function changeTz(next: string) {
    setTz(next);
    try {
      localStorage.setItem(TZ_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function openCreate(dateKey: string, time?: string) {
    if (!canEdit) return;
    setPreset(null);
    setSlot({ dateKey, time: time ?? (dateKey === todayKey ? nextRoundTime(tz) : "09:00") });
    setDialogKey((k) => k + 1);
    setScheduleOpen(true);
  }

  async function moveEvent(eventId: string, dateKey: string, hour?: number) {
    const ev = positioned.find((e) => e.id === eventId);
    if (!ev || !DRAGGABLE.has(ev.status)) return;
    const time = hour === undefined ? ev.time : `${String(hour).padStart(2, "0")}:${ev.time.slice(3)}`;
    if (dateKey === ev.dayKey && time === ev.time) return;
    const when = zonedTimeToUtc(dateKey, time, tz);
    if (isTooSoon(when)) return toast.error("You can't move a post into the past.");
    const res = await apiFetch(`/api/schedule/${eventId}`, {
      method: "PATCH",
      json: { action: "reschedule", scheduledAt: when.toISOString(), timezone: tz },
    });
    if (!res.ok) toastError(res.error);
    else toast.success(`Moved to ${format(fromKey(dateKey), "EEE d MMM")} at ${time}`);
    load();
  }

  const dropProps = (key: string, dateKey: string, hour?: number) =>
    canEdit
      ? {
          onDragOver: (e: React.DragEvent) => {
            if (e.dataTransfer.types.includes("application/x-schedule-id")) {
              e.preventDefault();
              setDragOverKey(key);
            }
          },
          onDragLeave: () => setDragOverKey((k) => (k === key ? null : k)),
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            setDragOverKey(null);
            const id = e.dataTransfer.getData("application/x-schedule-id");
            if (id) void moveEvent(id, dateKey, hour);
          },
        }
      : {};

  const Chip = ({ e, compact }: { e: Positioned; compact?: boolean }) => {
    const plat = isPlatformId(e.platform) ? PLATFORMS[e.platform] : null;
    const draggable = canEdit && DRAGGABLE.has(e.status);
    return (
      <button
        type="button"
        draggable={draggable}
        onDragStart={(ev) => {
          ev.dataTransfer.setData("application/x-schedule-id", e.id);
          ev.dataTransfer.effectAllowed = "move";
        }}
        onClick={(ev) => {
          ev.stopPropagation();
          setSelected(e);
        }}
        className={cn(
          "hover:ring-ring/40 flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left text-xs outline-none hover:ring-1 focus-visible:ring-2",
          eventChipClass(e.status),
          draggable && "cursor-grab active:cursor-grabbing",
        )}
        title={`${e.time} · ${plat?.name ?? e.platform} · ${e.social_posts?.title || e.social_posts?.body || ""}`}
        aria-label={`${e.time} ${plat?.name ?? e.platform} post, ${e.status.replace("_", " ")}. Open details.`}
      >
        {plat && <PlatformDot color={plat.color} />}
        <span className="shrink-0 tabular-nums">{e.time}</span>
        {!compact && <span className="truncate">{e.social_posts?.title || e.social_posts?.body || "Post"}</span>}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => shiftCursor(view, c, -1))} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => setCursor(todayKey)}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => shiftCursor(view, c, 1))} aria-label="Next">
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="ml-1 text-lg font-semibold" aria-live="polite">
            {rangeLabel(view, cursor)}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => changeView(v as View)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>
          {canEdit && (
            <Button onClick={() => openCreate(view === "day" ? cursor : todayKey)}>
              <Plus className="size-4" /> Schedule post
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <OptionSelect value={platform} onChange={setPlatform} options={[{ value: "all", label: "All platforms" }, ...PLATFORM_OPTIONS]} className="sm:w-44" />
        <OptionSelect value={contentType} onChange={setContentType} options={CONTENT_TYPES} className="sm:w-36" />
        <TimeZoneSelect value={tz} onChange={changeTz} extra={[userTimeZone]} className="sm:w-60" />
      </div>

      {error ? (
        <EmptyState title="Couldn't load the calendar" description={error} action={<Button onClick={load}>Retry</Button>} />
      ) : loading && !events.length ? (
        <Skeleton className="h-[480px] rounded-xl" />
      ) : view === "month" ? (
        <>
          {/* Desktop month grid */}
          <div className="bg-card hidden overflow-hidden rounded-xl border md:block" aria-busy={loading}>
            <div className="text-muted-foreground grid grid-cols-7 border-b text-xs font-medium">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="px-2 py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((key) => {
                const list = byDay.get(key) ?? [];
                const inMonth = key.slice(0, 7) === cursor.slice(0, 7);
                const past = key < todayKey;
                return (
                  <div
                    key={key}
                    {...dropProps(key, key)}
                    onClick={() => !past && openCreate(key)}
                    className={cn(
                      "group min-h-28 border-r border-b p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0",
                      !inMonth && "bg-muted/30 text-muted-foreground",
                      !past && canEdit && "hover:bg-accent/40 cursor-pointer",
                      dragOverKey === key && "bg-primary/10 ring-primary ring-2 ring-inset",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                          key === todayKey && "bg-primary text-primary-foreground font-semibold",
                        )}
                      >
                        {Number(key.slice(8))}
                      </span>
                      {canEdit && !past && (
                        <Plus className="text-muted-foreground size-3.5 opacity-0 group-hover:opacity-100" aria-hidden />
                      )}
                    </div>
                    <div className="space-y-1">
                      {list.slice(0, 3).map((e) => (
                        <Chip key={e.id} e={e} />
                      ))}
                      {list.length > 3 && (
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground px-1 text-xs"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setCursor(key);
                            changeView("day");
                          }}
                        >
                          +{list.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Mobile agenda */}
          <MobileAgenda
            days={days.filter((k) => k.slice(0, 7) === cursor.slice(0, 7))}
            byDay={byDay}
            todayKey={todayKey}
            renderChip={(e) => <Chip e={e} />}
            onAdd={canEdit ? openCreate : undefined}
          />
        </>
      ) : view === "week" ? (
        <div className="grid gap-2 md:grid-cols-7" aria-busy={loading}>
          {days.map((key) => {
            const list = byDay.get(key) ?? [];
            const past = key < todayKey;
            return (
              <div
                key={key}
                {...dropProps(key, key)}
                className={cn(
                  "bg-card flex min-h-24 flex-col rounded-xl border p-2 md:min-h-[420px]",
                  key === todayKey && "border-primary/50",
                  dragOverKey === key && "bg-primary/10 ring-primary ring-2",
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <button type="button" className="text-left text-sm font-medium hover:underline" onClick={() => { setCursor(key); changeView("day"); }}>
                    {format(fromKey(key), "EEE d")}
                  </button>
                  {canEdit && !past && (
                    <Button size="icon" variant="ghost" className="size-6" onClick={() => openCreate(key)} aria-label={`Schedule on ${key}`}>
                      <Plus className="size-3.5" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1">
                  {list.length ? list.map((e) => <Chip key={e.id} e={e} />) : <p className="text-muted-foreground text-xs">Nothing scheduled</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card overflow-hidden rounded-xl border" aria-busy={loading}>
          {HOURS.map((h) => {
            const list = (byDay.get(cursor) ?? []).filter((e) => e.hour === h);
            const key = `${cursor}-${h}`;
            const slotTime = hourLabel(h);
            const past = zonedTimeToUtc(cursor, `${String(h).padStart(2, "0")}:59`, tz).getTime() < now;
            return (
              <div
                key={h}
                {...dropProps(key, cursor, h)}
                className={cn("flex min-h-12 border-b last:border-b-0", dragOverKey === key && "bg-primary/10")}
              >
                <div className="text-muted-foreground w-16 shrink-0 border-r px-2 py-1.5 text-xs tabular-nums">{slotTime}</div>
                <div
                  className={cn("flex flex-1 flex-wrap items-start gap-1.5 p-1.5", !past && canEdit && "hover:bg-accent/40 cursor-pointer")}
                  onClick={() => !past && openCreate(cursor, slotTime)}
                >
                  {list.map((e) => (
                    <div key={e.id} className="w-full sm:w-72">
                      <Chip e={e} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && positioned.length === 0 && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <CalendarDays className="size-4" /> Nothing scheduled in this period{canEdit ? " — click a day to schedule a post." : "."}
        </p>
      )}
      {canEdit && (
        <p className="text-muted-foreground hidden text-xs md:block">
          Tip: drag a post to another day{view === "day" ? " or hour" : ""} to reschedule it, or open it to pick an exact time.
        </p>
      )}

      {scheduleOpen && (
      <ScheduleDialog
        key={dialogKey}
        open={scheduleOpen}
        onOpenChange={(o) => {
          setScheduleOpen(o);
          if (!o && preset) {
            setPreset(null);
            router.replace(pathname, { scroll: false });
          }
        }}
        timeZone={tz}
        defaultDateKey={slot.dateKey}
        defaultTime={slot.time}
        presetPost={preset}
        accounts={accounts}
        onScheduled={(ev) => {
          const p = getZonedParts(new Date(ev.scheduled_at), tz);
          setCursor(p.dateKey);
          load();
        }}
      />
      )}
      <EventDialog event={selected} timeZone={tz} canEdit={canEdit} onOpenChange={(o) => !o && setSelected(null)} onChanged={load} />
    </div>
  );
}

function MobileAgenda({
  days,
  byDay,
  todayKey,
  renderChip,
  onAdd,
}: {
  days: string[];
  byDay: Map<string, Positioned[]>;
  todayKey: string;
  renderChip: (e: Positioned) => React.ReactNode;
  onAdd?: (dateKey: string) => void;
}) {
  const withEvents = days.filter((k) => (byDay.get(k) ?? []).length > 0);
  return (
    <div className="space-y-2 md:hidden">
      {withEvents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled this month"
          action={onAdd ? <Button onClick={() => onAdd(todayKey)}><Plus className="size-4" /> Schedule post</Button> : undefined}
        />
      ) : (
        withEvents.map((key) => (
          <div key={key} className="bg-card rounded-xl border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className={cn("text-sm font-medium", key === todayKey && "text-primary")}>
                {format(fromKey(key), "EEEE d MMMM")}
                {key === todayKey && " · Today"}
              </p>
              {onAdd && key >= todayKey && (
                <Button size="icon" variant="ghost" className="size-7" onClick={() => onAdd(key)} aria-label={`Schedule on ${key}`}>
                  <Plus className="size-4" />
                </Button>
              )}
            </div>
            <div className="space-y-1.5">{(byDay.get(key) ?? []).map((e) => <div key={e.id}>{renderChip(e)}</div>)}</div>
          </div>
        ))
      )}
    </div>
  );
}

/** Called from event handlers only (reads the clock). */
function isTooSoon(when: Date): boolean {
  return when.getTime() < Date.now() + 60_000;
}

/** Next quarter-hour at least 15 minutes from now, in `tz`. */
function nextRoundTime(tz: string): string {
  const d = new Date(Date.now() + 15 * 60_000);
  const p = getZonedParts(d, tz);
  const minutes = Math.ceil(p.minute / 15) * 15;
  const hour = minutes === 60 ? (p.hour + 1) % 24 : p.hour;
  return `${String(hour).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
