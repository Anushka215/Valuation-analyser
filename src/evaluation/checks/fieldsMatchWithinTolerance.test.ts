// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import { fieldsMatchWithinTolerance } from "./fieldsMatchWithinTolerance.js";

describe("fieldsMatchWithinTolerance", () => {
  it("passes when the absolute difference is within tolerance", () => {
    const result = fieldsMatchWithinTolerance({
      value: 1_000_000,
      params: { compareField: "declaredValue", tolerance: 50_000 },
      data: { declaredValue: 1_030_000 },
    });
    expect(result.status).toBe("PASS");
  });

  it("fails when the absolute difference exceeds tolerance", () => {
    const result = fieldsMatchWithinTolerance({
      value: 1_000_000,
      params: { compareField: "declaredValue", tolerance: 10_000 },
      data: { declaredValue: 1_030_000 },
    });
    expect(result.status).toBe("FAIL");
  });

  it("supports percentage tolerance mode", () => {
    const result = fieldsMatchWithinTolerance({
      value: 1_000_000,
      params: { compareField: "declaredValue", tolerance: 5, mode: "percentage" },
      data: { declaredValue: 1_040_000 },
    });
    expect(result.status).toBe("PASS");
  });

  it("fails percentage tolerance mode when the relative difference is too large", () => {
    const result = fieldsMatchWithinTolerance({
      value: 1_000_000,
      params: { compareField: "declaredValue", tolerance: 2, mode: "percentage" },
      data: { declaredValue: 1_040_000 },
    });
    expect(result.status).toBe("FAIL");
  });

  it("returns NEEDS_REVIEW when the compare field is missing", () => {
    const result = fieldsMatchWithinTolerance({
      value: 1_000_000,
      params: { compareField: "declaredValue", tolerance: 10_000 },
      data: {},
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW when value is not numeric", () => {
    const result = fieldsMatchWithinTolerance({
      value: "one million",
      params: { compareField: "declaredValue", tolerance: 10_000 },
      data: { declaredValue: 1_000_000 },
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("reports NEEDS_REVIEW instead of FAIL when onMismatch is set", () => {
    const result = fieldsMatchWithinTolerance({
      value: 1_000,
      params: { compareField: "carpetAreaDocumented", tolerance: 3, mode: "percentage", onMismatch: "NEEDS_REVIEW" },
      data: { carpetAreaDocumented: 900 },
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("states both values and the delta in the message on breach", () => {
    const result = fieldsMatchWithinTolerance({
      value: 1_000,
      params: { compareField: "carpetAreaDocumented", tolerance: 3, mode: "percentage", onMismatch: "NEEDS_REVIEW" },
      data: { carpetAreaDocumented: 900 },
    });
    expect(result.message).toContain("1000");
    expect(result.message).toContain("carpetAreaDocumented");
    expect(result.message).toContain("900");
    expect(result.message).toContain("100");
    expect(result.message).toContain("3%");
  });

  it("states both values and the delta in the message when within tolerance", () => {
    const result = fieldsMatchWithinTolerance({
      value: 1_000_000,
      params: { compareField: "declaredValue", tolerance: 50_000 },
      data: { declaredValue: 1_030_000 },
    });
    expect(result.status).toBe("PASS");
    expect(result.message).toContain("declaredValue");
    expect(result.message).toContain("1030000");
  });
});
