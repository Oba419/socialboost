import { describe, expect, it } from "vitest";
import { parseJsonContent } from "@/lib/ai/runner";

describe("parseJsonContent", () => {
  it("parses plain JSON", () => {
    expect(parseJsonContent('{"a":1}')).toEqual({ a: 1 });
  });
  it("strips markdown code fences some providers add", () => {
    expect(parseJsonContent('```json\n{"a":[1,2]}\n```')).toEqual({ a: [1, 2] });
    expect(parseJsonContent('```\n{"b":true}\n```')).toEqual({ b: true });
  });
  it("returns undefined for empty or invalid content (never throws)", () => {
    expect(parseJsonContent(null)).toBeUndefined();
    expect(parseJsonContent("")).toBeUndefined();
    expect(parseJsonContent("Sorry, I can't help with that")).toBeUndefined();
  });
});
