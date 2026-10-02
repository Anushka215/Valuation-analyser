// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import { RuleSchema, RuleSetSchema } from "./schema.js";

const FAKE_VALID_RULE = {
  id: "FAKE-001",
  description: "Fake: valuation report must not be older than 90 days",
  severity: "HIGH",
  effective_from: "2024-01-01",
  field: "reportDate",
  check: "max_age_days",
  params: { maxDays: 90 },
  clause_ref: "FAKE-CLAUSE-1.1",
};

describe("RuleSchema", () => {
  it("accepts a well-formed rule", () => {
    expect(RuleSchema.safeParse(FAKE_VALID_RULE).success).toBe(true);
  });

  it("rejects an unknown check name", () => {
    const result = RuleSchema.safeParse({ ...FAKE_VALID_RULE, check: "not_a_real_check" });
    expect(result.success).toBe(false);
  });

  it("rejects params that don't match the declared check", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      check: "in_range",
      params: { maxDays: 90 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unparseable effective_from date", () => {
    const result = RuleSchema.safeParse({ ...FAKE_VALID_RULE, effective_from: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown severity", () => {
    const result = RuleSchema.safeParse({ ...FAKE_VALID_RULE, severity: "apocalyptic" });
    expect(result.success).toBe(false);
  });

  it("accepts applies_when with an 'in' list", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      applies_when: { field: "propertyType", in: ["commercial"] },
    });
    expect(result.success).toBe(true);
  });

  it("accepts applies_when with a 'notIn' list", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      applies_when: { field: "propertyType", notIn: ["residential", "commercial"] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects applies_when with both 'in' and 'notIn'", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      applies_when: { field: "propertyType", in: ["commercial"], notIn: ["residential"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects applies_when with neither 'in' nor 'notIn'", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      applies_when: { field: "propertyType" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts a not_equals rule with a boolean forbidden value", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      field: "isOnBufferZone",
      check: "not_equals",
      params: { value: true },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a not_equals rule with a non-scalar forbidden value", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      field: "isOnBufferZone",
      check: "not_equals",
      params: { value: { nested: true } },
    });
    expect(result.success).toBe(false);
  });

  it("accepts applies_when as an array of conditions (AND)", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      applies_when: [
        { field: "propertyType", in: ["residential"] },
        { field: "siteCondition", in: ["wet_land"] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an applies_when array with fewer than 2 conditions", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      applies_when: [{ field: "propertyType", in: ["residential"] }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a ratio_in_range rule with a min", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      field: "constructedAreaSqft",
      check: "ratio_in_range",
      params: { denominatorField: "landAreaSqft", min: 20 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a ratio_in_range rule with neither min nor max", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      field: "constructedAreaSqft",
      check: "ratio_in_range",
      params: { denominatorField: "landAreaSqft" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts a fields_match_within_tolerance rule with onMismatch: NEEDS_REVIEW", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      field: "carpetAreaMeasured",
      check: "fields_match_within_tolerance",
      params: {
        compareField: "carpetAreaDocumented",
        tolerance: 3,
        mode: "percentage",
        onMismatch: "NEEDS_REVIEW",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a fields_match_within_tolerance rule with an invalid onMismatch value", () => {
    const result = RuleSchema.safeParse({
      ...FAKE_VALID_RULE,
      field: "carpetAreaMeasured",
      check: "fields_match_within_tolerance",
      params: { compareField: "carpetAreaDocumented", tolerance: 3, onMismatch: "WARN" },
    });
    expect(result.success).toBe(false);
  });
});

describe("RuleSetSchema", () => {
  it("accepts a rule set with unique rule ids", () => {
    const result = RuleSetSchema.safeParse({
      version: "test-v1",
      effective_from: "2024-01-01",
      rules: [FAKE_VALID_RULE, { ...FAKE_VALID_RULE, id: "FAKE-002" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a rule set with duplicate rule ids", () => {
    const result = RuleSetSchema.safeParse({
      version: "test-v1",
      effective_from: "2024-01-01",
      rules: [FAKE_VALID_RULE, FAKE_VALID_RULE],
    });
    expect(result.success).toBe(false);
  });
});
