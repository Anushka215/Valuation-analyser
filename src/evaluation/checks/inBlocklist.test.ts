// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import { inBlocklist } from "./inBlocklist.js";

describe("inBlocklist", () => {
  it("fails when value matches a blocklist entry exactly", () => {
    const result = inBlocklist({
      value: "Fake Valuer Co",
      params: { blocklist: ["Fake Valuer Co", "Suspicious Appraisals Ltd"] },
      data: {},
    });
    expect(result.status).toBe("FAIL");
  });

  it("passes when value does not match any blocklist entry", () => {
    const result = inBlocklist({
      value: "Reputable Valuer LLP",
      params: { blocklist: ["Fake Valuer Co"] },
      data: {},
    });
    expect(result.status).toBe("PASS");
  });

  it("is case-insensitive by default", () => {
    const result = inBlocklist({
      value: "fake valuer co",
      params: { blocklist: ["Fake Valuer Co"] },
      data: {},
    });
    expect(result.status).toBe("FAIL");
  });

  it("respects caseSensitive: true", () => {
    const result = inBlocklist({
      value: "fake valuer co",
      params: { blocklist: ["Fake Valuer Co"], caseSensitive: true },
      data: {},
    });
    expect(result.status).toBe("PASS");
  });

  it("returns NEEDS_REVIEW for a non-string value", () => {
    const result = inBlocklist({ value: 123, params: { blocklist: ["Fake Valuer Co"] }, data: {} });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW for a missing value", () => {
    const result = inBlocklist({ value: undefined, params: { blocklist: ["Fake Valuer Co"] }, data: {} });
    expect(result.status).toBe("NEEDS_REVIEW");
  });
});
