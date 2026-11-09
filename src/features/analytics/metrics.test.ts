import { describe, expect, it } from "vitest";
import { dateRange, engagementRate, resolveRange, seriesByPlatform, summarizeByPlatform, type MetricRow } from "./metrics";
import { csvCell } from "./csv";

const row = (p: Partial<MetricRow>): MetricRow => ({
  platform: "instagram",
  social_account_id: "a1",
  metric_date: "2026-11-01",
  metric_key: "followers",
  value: 0,
  source: "api",
  ...p,
});

describe("summarizeByPlatform", () => {
  it("treats followers as a level (latest + change), never summed over time", () => {
    const [s] = summarizeByPlatform([
      row({ metric_date: "2026-11-01", value: 100 }),
      row({ metric_date: "2026-11-03", value: 130 }),
    ]);
    expect(s.metrics.followers.value).toBe(130);
    expect(s.metrics.followers.change).toBe(30);
  });

  it("sums flows within a platform and keeps platforms separate", () => {
    const out = summarizeByPlatform([
      row({ metric_key: "impressions", value: 50 }),
      row({ metric_key: "impressions", value: 70, metric_date: "2026-11-02" }),
      row({ platform: "facebook", metric_key: "impressions", value: 999 }),
    ]);
    expect(out.find((s) => s.platform === "instagram")!.metrics.impressions.value).toBe(120);
    expect(out.find((s) => s.platform === "facebook")!.metrics.impressions.value).toBe(999);
  });

  it("prefers api over manual for the same account's follower level", () => {
    const [s] = summarizeByPlatform([
      row({ value: 500, source: "manual" }),
      row({ value: 200, source: "api" }),
    ]);
    expect(s.metrics.followers.value).toBe(200);
  });
});

describe("engagementRate", () => {
  it("is null without impressions or without interaction metrics", () => {
    expect(engagementRate({ likes: { value: 10 } })).toBeNull();
    expect(engagementRate({ impressions: { value: 100 } })).toBeNull();
  });
  it("uses (likes+comments+shares+saves)/impressions", () => {
    expect(engagementRate({ impressions: { value: 200 }, likes: { value: 8 }, comments: { value: 2 } })).toBe(5);
  });
});

describe("ranges and series", () => {
  it("resolves presets and validates custom ranges", () => {
    const now = new Date("2026-11-09T12:00:00Z");
    expect(resolveRange({ range: "7" }, now)).toMatchObject({ from: "2026-11-03", to: "2026-11-09" });
    expect(resolveRange({ range: "custom", from: "2026-11-05", to: "2026-11-01" }, now).range).toBe("30");
    expect(dateRange("2026-10-30", "2026-11-02")).toHaveLength(4);
  });
  it("leaves gaps as null", () => {
    const { points } = seriesByPlatform([row({ value: 5 })], "followers", ["2026-11-01", "2026-11-02"]);
    expect(points[1].instagram).toBeNull();
  });
});

describe("csvCell", () => {
  it("neutralises formula injection and quotes", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
  });
});
