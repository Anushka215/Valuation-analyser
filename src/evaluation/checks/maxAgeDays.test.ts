// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { maxAgeDays } from "./maxAgeDays.js";

describe("maxAgeDays", () => {
  it("passes when the date is within the max age relative to asOfField", () => {
    const result = maxAgeDays({
      value: "2024-01-01",
      params: { maxDays: 90, asOfField: "reportDate" },
      data: { reportDate: "2024-02-01" },
    });
    expect(result.status).toBe("PASS");
  });

  it("fails when the date is older than the max age relative to asOfField", () => {
    const result = maxAgeDays({
      value: "2024-01-01",
      params: { maxDays: 10, asOfField: "reportDate" },
      data: { reportDate: "2024-02-01" },
    });
    expect(result.status).toBe("FAIL");
    expect(result.message).toContain("exceeds max");
  });

  it("treats age exactly at the boundary as passing", () => {
    const result = maxAgeDays({
      value: "2024-01-01",
      params: { maxDays: 31, asOfField: "reportDate" },
      data: { reportDate: "2024-02-01" },
    });
    expect(result.status).toBe("PASS");
  });

  describe("when asOfField is omitted", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-31T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("falls back to the current system date", () => {
      const result = maxAgeDays({
        value: "2000-01-01",
        params: { maxDays: 30 },
        data: {},
      });
      expect(result.status).toBe("FAIL");
    });
  });

  it("returns NEEDS_REVIEW when the reference field is missing", () => {
    const result = maxAgeDays({
      value: "2024-01-01",
      params: { maxDays: 90, asOfField: "reportDate" },
      data: {},
    });
    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.message).toContain("reportDate");
  });

  it("returns NEEDS_REVIEW when value is not a parseable date", () => {
    const result = maxAgeDays({
      value: "not-a-date",
      params: { maxDays: 90 },
      data: {},
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW when value is missing entirely", () => {
    const result = maxAgeDays({
      value: undefined,
      params: { maxDays: 90 },
      data: {},
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW when the value date is after the reference date", () => {
    const result = maxAgeDays({
      value: "2024-03-01",
      params: { maxDays: 90, asOfField: "reportDate" },
      data: { reportDate: "2024-02-01" },
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });
});
