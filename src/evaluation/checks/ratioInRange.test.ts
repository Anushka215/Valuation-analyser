// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import { ratioInRange } from "./ratioInRange.js";

describe("ratioInRange", () => {
  it("passes when the ratio meets a minimum percentage", () => {
    const result = ratioInRange({
      value: 300,
      params: { denominatorField: "landAreaSqft", min: 20 },
      data: { landAreaSqft: 1000 },
    });
    expect(result.status).toBe("PASS");
  });

  it("fails when the ratio is below a minimum percentage", () => {
    const result = ratioInRange({
      value: 100,
      params: { denominatorField: "landAreaSqft", min: 20 },
      data: { landAreaSqft: 1000 },
    });
    expect(result.status).toBe("FAIL");
  });

  it("fails when the ratio exceeds a maximum percentage", () => {
    const result = ratioInRange({
      value: 600,
      params: { denominatorField: "totalCollateralValue", max: 50 },
      data: { totalCollateralValue: 1000 },
    });
    expect(result.status).toBe("FAIL");
  });

  it("passes when the ratio is within a maximum percentage", () => {
    const result = ratioInRange({
      value: 400,
      params: { denominatorField: "totalCollateralValue", max: 50 },
      data: { totalCollateralValue: 1000 },
    });
    expect(result.status).toBe("PASS");
  });

  it("treats a boundary ratio as passing by default (inclusive)", () => {
    const result = ratioInRange({
      value: 200,
      params: { denominatorField: "landAreaSqft", min: 20 },
      data: { landAreaSqft: 1000 },
    });
    expect(result.status).toBe("PASS");
  });

  it("fails a boundary ratio when minExclusive is set", () => {
    const result = ratioInRange({
      value: 200,
      params: { denominatorField: "landAreaSqft", min: 20, minExclusive: true },
      data: { landAreaSqft: 1000 },
    });
    expect(result.status).toBe("FAIL");
  });

  it("returns NEEDS_REVIEW for a non-numeric value", () => {
    const result = ratioInRange({
      value: "lots",
      params: { denominatorField: "landAreaSqft", min: 20 },
      data: { landAreaSqft: 1000 },
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW when the denominator field is missing", () => {
    const result = ratioInRange({
      value: 300,
      params: { denominatorField: "landAreaSqft", min: 20 },
      data: {},
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW when the denominator is zero", () => {
    const result = ratioInRange({
      value: 300,
      params: { denominatorField: "landAreaSqft", min: 20 },
      data: { landAreaSqft: 0 },
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });
});
