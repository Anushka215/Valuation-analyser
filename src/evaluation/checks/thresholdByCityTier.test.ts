// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import { thresholdByCityTier } from "./thresholdByCityTier.js";

const FAKE_PARAMS = {
  tierField: "property.cityTier",
  thresholds: { tier1: 10_000_000, tier2: 6_000_000, tier3: 3_000_000 },
  comparison: "max" as const,
};

describe("thresholdByCityTier", () => {
  it("passes when value is within the threshold for the resolved tier", () => {
    const result = thresholdByCityTier({
      value: 5_000_000,
      params: FAKE_PARAMS,
      data: { property: { cityTier: "tier1" } },
    });
    expect(result.status).toBe("PASS");
  });

  it("fails when value exceeds the max threshold for the resolved tier", () => {
    const result = thresholdByCityTier({
      value: 7_000_000,
      params: FAKE_PARAMS,
      data: { property: { cityTier: "tier2" } },
    });
    expect(result.status).toBe("FAIL");
  });

  it("supports a min comparison mode", () => {
    const result = thresholdByCityTier({
      value: 1_000_000,
      params: { ...FAKE_PARAMS, comparison: "min" },
      data: { property: { cityTier: "tier3" } },
    });
    expect(result.status).toBe("FAIL");
  });

  it("returns NEEDS_REVIEW when the tier field is missing", () => {
    const result = thresholdByCityTier({ value: 5_000_000, params: FAKE_PARAMS, data: { property: {} } });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW when the resolved tier has no configured threshold", () => {
    const result = thresholdByCityTier({
      value: 5_000_000,
      params: FAKE_PARAMS,
      data: { property: { cityTier: "tier99" } },
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW for a non-numeric value", () => {
    const result = thresholdByCityTier({
      value: "five million",
      params: FAKE_PARAMS,
      data: { property: { cityTier: "tier1" } },
    });
    expect(result.status).toBe("NEEDS_REVIEW");
  });
});
