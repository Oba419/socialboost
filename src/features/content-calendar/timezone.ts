/**
 * Timezone helpers built on Intl (no dependencies).
 *
 * The calendar stores `scheduled_at` in UTC plus the IANA zone the user picked.
 * These helpers convert between a wall-clock time in a zone and a UTC instant,
 * handling DST transitions:
 *  - Non-existent local times (spring-forward gap) resolve forward by the gap.
 *  - Ambiguous local times (fall-back overlap) resolve to the EARLIER instant.
 */

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  /** yyyy-MM-dd */
  dateKey: string;
  /** HH:mm */
  time: string;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Wall-clock parts of a UTC instant in `timeZone`. */
export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatter(timeZone).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour") % 24;
  const minute = get("minute");
  return {
    year,
    month,
    day,
    hour,
    minute,
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
    time: `${pad(hour)}:${pad(minute)}`,
  };
}

/** Offset of `timeZone` from UTC at instant `date`, in milliseconds (e.g. Lagos = +3_600_000). */
export function getTimeZoneOffset(date: Date, timeZone: string): number {
  const parts = formatter(timeZone).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  const truncated = Math.floor(date.getTime() / 1000) * 1000;
  return asUtc - truncated;
}

/**
 * Convert a wall-clock date ("yyyy-MM-dd") and time ("HH:mm") in `timeZone`
 * into the corresponding UTC instant.
 */
export function zonedTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => !Number.isFinite(n))) throw new Error("Invalid date or time");
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);

  // Two candidate offsets: the one just before and just after the wall time.
  const offsetBefore = getTimeZoneOffset(new Date(wallAsUtc - 86_400_000), timeZone);
  const offsetAfter = getTimeZoneOffset(new Date(wallAsUtc + 86_400_000), timeZone);

  const candidates = [...new Set([offsetBefore, offsetAfter])]
    .map((offset) => wallAsUtc - offset)
    .filter((utc) => {
      const p = getZonedParts(new Date(utc), timeZone);
      return p.dateKey === dateKey && p.time === `${pad(hh)}:${pad(mm)}`;
    })
    .sort((a, b) => a - b);

  if (candidates.length > 0) return new Date(candidates[0]); // earliest for ambiguous times

  // Non-existent time (DST gap): shift forward by the gap size.
  return new Date(wallAsUtc - offsetBefore);
}

export function formatInZone(date: Date | string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(typeof date === "string" ? new Date(date) : date);
}

/** Commonly used zones offered in the switcher (the user's own zone is always added). */
export const COMMON_TIME_ZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];
