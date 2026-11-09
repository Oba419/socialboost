import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zonedTimeToUtc } from "./timezone";

/**
 * Calendar-day arithmetic works on "day keys" (yyyy-MM-dd) that represent dates
 * in the viewer's chosen timezone. Date objects here are only used for
 * calendar math (via the browser's local calendar) and are converted back to
 * keys immediately, so the browser's own zone never leaks into scheduling.
 */
export type CalendarView = "month" | "week" | "day";

export const WEEK_STARTS_ON = 1 as const; // Monday

export const toKey = (d: Date) => format(d, "yyyy-MM-dd");
export const fromKey = (key: string) => parseISO(key);

export function visibleDays(view: CalendarView, cursorKey: string): string[] {
  const cursor = fromKey(cursorKey);
  if (view === "day") return [cursorKey];
  if (view === "week") {
    const start = startOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON });
    return eachDayOfInterval({ start, end: addDays(start, 6) }).map(toKey);
  }
  const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start, end }).map(toKey);
}

/** UTC [from, to) covering the visible days in `timeZone`. */
export function utcRange(days: string[], timeZone: string): { from: string; to: string } {
  const first = days[0];
  const afterLast = toKey(addDays(fromKey(days[days.length - 1]), 1));
  return {
    from: zonedTimeToUtc(first, "00:00", timeZone).toISOString(),
    to: zonedTimeToUtc(afterLast, "00:00", timeZone).toISOString(),
  };
}

export function shiftCursor(view: CalendarView, cursorKey: string, direction: 1 | -1): string {
  const d = fromKey(cursorKey);
  if (view === "month") return toKey(addMonths(d, direction));
  if (view === "week") return toKey(addWeeks(d, direction));
  return toKey(addDays(d, direction));
}

export function rangeLabel(view: CalendarView, cursorKey: string): string {
  const d = fromKey(cursorKey);
  if (view === "month") return format(d, "MMMM yyyy");
  if (view === "day") return format(d, "EEEE, d MMMM yyyy");
  const start = startOfWeek(d, { weekStartsOn: WEEK_STARTS_ON });
  const end = addDays(start, 6);
  return start.getMonth() === end.getMonth()
    ? `${format(start, "d")} – ${format(end, "d MMMM yyyy")}`
    : `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
}

export const HOURS = Array.from({ length: 24 }, (_, h) => h);
export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;
