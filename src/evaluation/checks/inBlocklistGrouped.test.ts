// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import { inBlocklistGrouped } from "./inBlocklistGrouped.js";

describe("inBlocklistGrouped", () => {
  const blocklist = [
    { value: "stone_crusher", clause_ref: "G.4" },
    { value: "old_age_home_orphanage", clause_ref: "G.5" },
  ];

  it("fails when value matches one entry, naming that entry's clause", () => {
    const result = inBlocklistGrouped({ value: "stone_crusher", params: { blocklist }, data: {} });
    expect(result.status).toBe("FAIL");
    expect(result.message).toContain("G.4");
  });

  it("passes when value does not match any entry", () => {
    const result = inBlocklistGrouped({ value: "residential_apartment", params: { blocklist }, data: {} });
    expect(result.status).toBe("PASS");
  });

  it("is case-insensitive by default", () => {
    const result = inBlocklistGrouped({ value: "Stone_Crusher", params: { blocklist }, data: {} });
    expect(result.status).toBe("FAIL");
  });

  it("respects caseSensitive: true", () => {
    const result = inBlocklistGrouped({
      value: "Stone_Crusher",
      params: { blocklist, caseSensitive: true },
      data: {},
    });
    expect(result.status).toBe("PASS");
  });

  it("returns NEEDS_REVIEW for a non-string value", () => {
    const result = inBlocklistGrouped({ value: 123, params: { blocklist }, data: {} });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW for a missing value", () => {
    const result = inBlocklistGrouped({ value: undefined, params: { blocklist }, data: {} });
    expect(result.status).toBe("NEEDS_REVIEW");
  });
});
