// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import { inRange } from "./inRange.js";

describe("inRange", () => {
  it("passes when value is within an inclusive min/max range", () => {
    const result = inRange({ value: 50, params: { min: 0, max: 100 }, data: {} });
    expect(result.status).toBe("PASS");
  });

  it("fails when value is below min", () => {
    const result = inRange({ value: -1, params: { min: 0, max: 100 }, data: {} });
    expect(result.status).toBe("FAIL");
  });

  it("fails when value is above max", () => {
    const result = inRange({ value: 101, params: { min: 0, max: 100 }, data: {} });
    expect(result.status).toBe("FAIL");
  });

  it("treats a boundary value as passing by default (inclusive)", () => {
    const result = inRange({ value: 100, params: { min: 0, max: 100 }, data: {} });
    expect(result.status).toBe("PASS");
  });

  it("fails a boundary value when maxExclusive is set", () => {
    const result = inRange({ value: 100, params: { max: 100, maxExclusive: true }, data: {} });
    expect(result.status).toBe("FAIL");
  });

  it("fails a boundary value when minExclusive is set", () => {
    const result = inRange({ value: 0, params: { min: 0, minExclusive: true }, data: {} });
    expect(result.status).toBe("FAIL");
  });

  it("supports a min-only range", () => {
    const result = inRange({ value: 5, params: { min: 10 }, data: {} });
    expect(result.status).toBe("FAIL");
  });

  it("supports a max-only range", () => {
    const result = inRange({ value: 5, params: { max: 10 }, data: {} });
    expect(result.status).toBe("PASS");
  });

  it("returns NEEDS_REVIEW for a non-numeric value", () => {
    const result = inRange({ value: "fifty", params: { min: 0, max: 100 }, data: {} });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW for a missing value", () => {
    const result = inRange({ value: undefined, params: { min: 0, max: 100 }, data: {} });
    expect(result.status).toBe("NEEDS_REVIEW");
  });
});
