// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import { RuleSetSchema } from "./schema.js";
import { selectRuleSet } from "./versioning.js";

function fakeRuleSet(version: string, effectiveFrom: string) {
  return RuleSetSchema.parse({
    version,
    effective_from: effectiveFrom,
    rules: [],
  });
}

describe("selectRuleSet", () => {
  const v1 = fakeRuleSet("v1", "2023-01-01");
  const v2 = fakeRuleSet("v2", "2024-06-01");
  const v3 = fakeRuleSet("v3", "2025-01-01");
  const ruleSets = [v1, v2, v3];

  it("selects the rule set effective at the report date", () => {
    expect(selectRuleSet(ruleSets, new Date("2024-08-01"))).toBe(v2);
  });

  it("selects the exact rule set when the report date matches effective_from", () => {
    expect(selectRuleSet(ruleSets, new Date("2025-01-01"))).toBe(v3);
  });

  it("selects the latest applicable rule set when several are eligible", () => {
    expect(selectRuleSet(ruleSets, new Date("2030-01-01"))).toBe(v3);
  });

  it("is order-independent in the input array", () => {
    expect(selectRuleSet([v3, v1, v2], new Date("2024-08-01"))).toBe(v2);
  });

  it("throws when no rule set is effective yet for the report date", () => {
    expect(() => selectRuleSet(ruleSets, new Date("2020-01-01"))).toThrow(/no rule set/);
  });

  it("throws when two rule sets share the same effective_from", () => {
    const duplicate = fakeRuleSet("v2-duplicate", "2024-06-01");
    expect(() => selectRuleSet([v1, v2, duplicate], new Date("2024-08-01"))).toThrow(/ambiguous/);
  });
});
