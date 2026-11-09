import { describe, expect, it } from "vitest";
import { getTimeZoneOffset, getZonedParts, isValidTimeZone, zonedTimeToUtc } from "./timezone";

describe("zonedTimeToUtc", () => {
  it("handles UTC", () => {
    expect(zonedTimeToUtc("2026-11-09", "14:30", "UTC").toISOString()).toBe("2026-11-09T14:30:00.000Z");
  });

  it("handles Africa/Lagos (UTC+1, no DST)", () => {
    expect(zonedTimeToUtc("2026-11-09", "09:00", "Africa/Lagos").toISOString()).toBe("2026-11-09T08:00:00.000Z");
    expect(zonedTimeToUtc("2026-07-01", "00:30", "Africa/Lagos").toISOString()).toBe("2026-06-30T23:30:00.000Z");
  });

  it("handles America/New_York in winter (EST) and summer (EDT)", () => {
    expect(zonedTimeToUtc("2026-01-15", "12:00", "America/New_York").toISOString()).toBe("2026-01-15T17:00:00.000Z");
    expect(zonedTimeToUtc("2026-07-15", "12:00", "America/New_York").toISOString()).toBe("2026-07-15T16:00:00.000Z");
  });

  it("handles the spring-forward gap (2026-03-08 02:30 does not exist in New York)", () => {
    const utc = zonedTimeToUtc("2026-03-08", "02:30", "America/New_York");
    // Resolves forward by the gap: 03:30 EDT = 07:30Z.
    expect(utc.toISOString()).toBe("2026-03-08T07:30:00.000Z");
  });

  it("handles times either side of the spring-forward boundary", () => {
    expect(zonedTimeToUtc("2026-03-08", "01:59", "America/New_York").toISOString()).toBe("2026-03-08T06:59:00.000Z");
    expect(zonedTimeToUtc("2026-03-08", "03:00", "America/New_York").toISOString()).toBe("2026-03-08T07:00:00.000Z");
  });

  it("resolves the ambiguous fall-back hour to the earlier instant", () => {
    // 2026-11-01 01:30 happens twice in New York; pick EDT (05:30Z).
    expect(zonedTimeToUtc("2026-11-01", "01:30", "America/New_York").toISOString()).toBe("2026-11-01T05:30:00.000Z");
  });

  it("round-trips through getZonedParts", () => {
    for (const tz of ["Africa/Lagos", "America/New_York", "UTC", "Asia/Kolkata"]) {
      const utc = zonedTimeToUtc("2026-11-09", "18:45", tz);
      const parts = getZonedParts(utc, tz);
      expect(parts.dateKey).toBe("2026-11-09");
      expect(parts.time).toBe("18:45");
    }
  });
});

describe("helpers", () => {
  it("computes offsets", () => {
    expect(getTimeZoneOffset(new Date("2026-11-09T00:00:00Z"), "Africa/Lagos")).toBe(3_600_000);
    expect(getTimeZoneOffset(new Date("2026-01-15T12:00:00Z"), "America/New_York")).toBe(-5 * 3_600_000);
    expect(getTimeZoneOffset(new Date("2026-07-15T12:00:00Z"), "America/New_York")).toBe(-4 * 3_600_000);
  });

  it("validates zones", () => {
    expect(isValidTimeZone("Africa/Lagos")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});
