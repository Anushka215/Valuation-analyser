import { describe, expect, it } from "vitest";
import { getPath } from "./getPath.js";

describe("getPath", () => {
  it("reads a top-level field", () => {
    expect(getPath({ valuationAmount: 100 }, "valuationAmount")).toBe(100);
  });

  it("reads a nested field via dot notation", () => {
    const source = { property: { address: { city: "Pune" } } };
    expect(getPath(source, "property.address.city")).toBe("Pune");
  });

  it("returns undefined when an intermediate segment is missing", () => {
    const source = { property: {} };
    expect(getPath(source, "property.address.city")).toBeUndefined();
  });

  it("returns undefined when the root object lacks the field entirely", () => {
    expect(getPath({}, "missing.field")).toBeUndefined();
  });

  it("returns undefined instead of throwing when a segment is a primitive", () => {
    const source = { valuationAmount: 100 };
    expect(getPath(source, "valuationAmount.subField")).toBeUndefined();
  });

  it("returns the value unchanged for a single-segment path pointing at null", () => {
    expect(getPath({ field: null }, "field")).toBeNull();
  });
});
