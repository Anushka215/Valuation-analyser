// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import { notEquals } from "./notEquals.js";

describe("notEquals", () => {
  it("fails when the boolean value equals the forbidden value", () => {
    const result = notEquals({ value: true, params: { value: true }, data: {} });
    expect(result.status).toBe("FAIL");
  });

  it("passes when the boolean value differs from the forbidden value", () => {
    const result = notEquals({ value: false, params: { value: true }, data: {} });
    expect(result.status).toBe("PASS");
  });

  it("fails when a string value equals the forbidden value", () => {
    const result = notEquals({ value: "pending", params: { value: "pending" }, data: {} });
    expect(result.status).toBe("FAIL");
  });

  it("passes when a string value differs from the forbidden value", () => {
    const result = notEquals({ value: "cleared", params: { value: "pending" }, data: {} });
    expect(result.status).toBe("PASS");
  });

  it("fails when a numeric value equals the forbidden value", () => {
    const result = notEquals({ value: 0, params: { value: 0 }, data: {} });
    expect(result.status).toBe("FAIL");
  });

  it("returns NEEDS_REVIEW when the value is missing", () => {
    const result = notEquals({ value: undefined, params: { value: true }, data: {} });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW when the value is null", () => {
    const result = notEquals({ value: null, params: { value: true }, data: {} });
    expect(result.status).toBe("NEEDS_REVIEW");
  });

  it("does not coerce types when comparing (0 does not equal false)", () => {
    const result = notEquals({ value: 0, params: { value: false }, data: {} });
    expect(result.status).toBe("PASS");
  });
});
