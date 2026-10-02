// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import { computeVerdict, evaluate } from "./engine.js";
import type { RuleResult } from "./engine.js";
import { RuleSetSchema } from "./schema.js";

const FAKE_RULE_SET = RuleSetSchema.parse({
  version: "test-v1",
  effective_from: "2024-01-01",
  rules: [
    {
      id: "FAKE-001",
      description: "Fake: valuation report must not be older than 90 days",
      severity: "HIGH",
      effective_from: "2024-01-01",
      field: "reportDate",
      check: "max_age_days",
      params: { maxDays: 90, asOfField: "submissionDate" },
      clause_ref: "FAKE-CLAUSE-1.1",
    },
    {
      id: "FAKE-002",
      description: "Fake: loan-to-value ratio must sit within an allowed range",
      severity: "MEDIUM",
      effective_from: "2024-01-01",
      field: "ltvRatio",
      check: "in_range",
      params: { min: 0, max: 0.8 },
      clause_ref: "FAKE-CLAUSE-2.3",
    },
  ],
});

describe("evaluate", () => {
  it("produces one result per rule, each carrying provenance", () => {
    const { results } = evaluate(
      { reportDate: "2024-01-01", submissionDate: "2024-01-15", ltvRatio: 0.5 },
      FAKE_RULE_SET,
    );

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      rule_id: "FAKE-001",
      status: "PASS",
      severity: "HIGH",
      clause_ref: "FAKE-CLAUSE-1.1",
      field: "reportDate",
      actual_value: "2024-01-01",
    });
    expect(results[1]).toMatchObject({
      rule_id: "FAKE-002",
      status: "PASS",
      severity: "MEDIUM",
      clause_ref: "FAKE-CLAUSE-2.3",
      field: "ltvRatio",
      actual_value: 0.5,
    });
  });

  it("reports FAIL with provenance when a rule is violated", () => {
    const { results } = evaluate(
      { reportDate: "2023-01-01", submissionDate: "2024-01-15", ltvRatio: 0.95 },
      FAKE_RULE_SET,
    );

    expect(results[0]?.status).toBe("FAIL");
    expect(results[1]?.status).toBe("FAIL");
  });

  it("reports NEEDS_REVIEW with provenance when a source field is missing", () => {
    const { results } = evaluate({ submissionDate: "2024-01-15" }, FAKE_RULE_SET);

    expect(results[0]?.status).toBe("NEEDS_REVIEW");
    expect(results[0]?.field).toBe("reportDate");
    expect(results[0]?.actual_value).toBeUndefined();
  });
});

describe("evaluate with applies_when", () => {
  const FAKE_SCOPED_RULE_SET = RuleSetSchema.parse({
    version: "test-v1",
    effective_from: "2024-01-01",
    rules: [
      {
        id: "FAKE-COMMERCIAL-ONLY",
        description: "Fake: commercial BUA must meet a minimum",
        severity: "LOW",
        effective_from: "2024-01-01",
        field: "commercialBuaSqft",
        applies_when: { field: "propertyType", in: ["commercial"] },
        check: "in_range",
        params: { min: 100 },
        clause_ref: "FAKE-CLAUSE-3.1",
      },
      {
        id: "FAKE-NOT-RESIDENTIAL-COMMERCIAL",
        description: "Fake: rule scoped to everything except residential/commercial",
        severity: "LOW",
        effective_from: "2024-01-01",
        field: "someOtherField",
        applies_when: { field: "propertyType", notIn: ["residential", "commercial"] },
        check: "in_range",
        params: { min: 0 },
        clause_ref: "FAKE-CLAUSE-3.2",
      },
    ],
  });

  it("runs the check normally when applies_when matches", () => {
    const { results } = evaluate({ propertyType: "commercial", commercialBuaSqft: 150 }, FAKE_SCOPED_RULE_SET);
    expect(results[0]?.status).toBe("PASS");
  });

  it("returns NOT_APPLICABLE without running the check when applies_when (in) doesn't match", () => {
    const { results } = evaluate({ propertyType: "residential", commercialBuaSqft: 5 }, FAKE_SCOPED_RULE_SET);
    expect(results[0]?.status).toBe("NOT_APPLICABLE");
  });

  it("returns NOT_APPLICABLE when applies_when (notIn) excludes the report's category", () => {
    const { results } = evaluate({ propertyType: "residential", someOtherField: -5 }, FAKE_SCOPED_RULE_SET);
    expect(results[1]?.status).toBe("NOT_APPLICABLE");
  });

  it("runs the check when applies_when (notIn) does not exclude the report's category", () => {
    const { results } = evaluate({ propertyType: "vacant_land", someOtherField: -5 }, FAKE_SCOPED_RULE_SET);
    expect(results[1]?.status).toBe("FAIL");
  });

  it("returns NEEDS_REVIEW when the applicability field itself is missing", () => {
    const { results } = evaluate({ commercialBuaSqft: 150 }, FAKE_SCOPED_RULE_SET);
    expect(results[0]?.status).toBe("NEEDS_REVIEW");
    expect(results[0]?.message).toContain("propertyType");
  });
});

describe("evaluate with a compound (AND) applies_when", () => {
  const FAKE_COMPOUND_RULE_SET = RuleSetSchema.parse({
    version: "test-v1",
    effective_from: "2024-01-01",
    rules: [
      {
        id: "FAKE-RESIDENTIAL-WET-LAND",
        description: "Fake: residential property on wet land must meet a minimum age",
        severity: "MEDIUM",
        effective_from: "2024-01-01",
        field: "propertyAgeYears",
        applies_when: [
          { field: "propertyType", in: ["residential"] },
          { field: "siteCondition", in: ["wet_land"] },
        ],
        check: "in_range",
        params: { min: 15 },
        clause_ref: "FAKE-CLAUSE-4.1",
      },
    ],
  });

  it("runs the check when every condition matches", () => {
    const { results } = evaluate(
      { propertyType: "residential", siteCondition: "wet_land", propertyAgeYears: 20 },
      FAKE_COMPOUND_RULE_SET,
    );
    expect(results[0]?.status).toBe("PASS");
  });

  it("returns NOT_APPLICABLE when only one of several conditions matches", () => {
    const { results } = evaluate(
      { propertyType: "commercial", siteCondition: "wet_land", propertyAgeYears: 20 },
      FAKE_COMPOUND_RULE_SET,
    );
    expect(results[0]?.status).toBe("NOT_APPLICABLE");
  });

  it("returns NOT_APPLICABLE (short-circuits) even if another condition is indeterminate", () => {
    const { results } = evaluate({ propertyType: "commercial", propertyAgeYears: 20 }, FAKE_COMPOUND_RULE_SET);
    expect(results[0]?.status).toBe("NOT_APPLICABLE");
  });

  it("returns NEEDS_REVIEW when no condition is unmatched but one is indeterminate", () => {
    const { results } = evaluate({ propertyType: "residential", propertyAgeYears: 20 }, FAKE_COMPOUND_RULE_SET);
    expect(results[0]?.status).toBe("NEEDS_REVIEW");
    expect(results[0]?.message).toContain("siteCondition");
  });
});

// Fake rule results built by hand (not run through evaluate) so we can test
// computeVerdict's rollup logic in isolation, one rule of thumb at a time.
function fakeResult(overrides: Partial<RuleResult>): RuleResult {
  return {
    rule_id: "FAKE",
    status: "PASS",
    severity: "LOW",
    message: "fake",
    clause_ref: "FAKE-CLAUSE",
    field: "someField",
    actual_value: 1,
    ...overrides,
  };
}

describe("computeVerdict", () => {
  it("returns COMPLIANT when every result passes", () => {
    const verdict = computeVerdict([fakeResult({ status: "PASS" }), fakeResult({ status: "PASS" })]);
    expect(verdict).toBe("COMPLIANT");
  });

  it("returns COMPLIANT when the only non-PASS results are NOT_APPLICABLE", () => {
    const verdict = computeVerdict([fakeResult({ status: "PASS" }), fakeResult({ status: "NOT_APPLICABLE" })]);
    expect(verdict).toBe("COMPLIANT");
  });

  it("returns NEEDS_REVIEW when a low-severity rule fails", () => {
    const verdict = computeVerdict([fakeResult({ status: "FAIL", severity: "LOW" })]);
    expect(verdict).toBe("NEEDS_REVIEW");
  });

  it("returns NEEDS_REVIEW when a rule needs review, regardless of severity", () => {
    const verdict = computeVerdict([fakeResult({ status: "NEEDS_REVIEW", severity: "HIGH" })]);
    expect(verdict).toBe("NEEDS_REVIEW");
  });

  it("returns NON_COMPLIANT when a HIGH-severity rule fails", () => {
    const verdict = computeVerdict([fakeResult({ status: "FAIL", severity: "HIGH" })]);
    expect(verdict).toBe("NON_COMPLIANT");
  });

  it("returns NON_COMPLIANT even if other results only need review", () => {
    const verdict = computeVerdict([
      fakeResult({ status: "NEEDS_REVIEW", severity: "MEDIUM" }),
      fakeResult({ status: "FAIL", severity: "HIGH" }),
    ]);
    expect(verdict).toBe("NON_COMPLIANT");
  });

  it("returns COMPLIANT for an empty result list", () => {
    expect(computeVerdict([])).toBe("COMPLIANT");
  });
});

describe("evaluate verdict rollup", () => {
  it("includes the verdict alongside the results", () => {
    const { verdict, results } = evaluate(
      { reportDate: "2024-01-01", submissionDate: "2024-01-15", ltvRatio: 0.5 },
      FAKE_RULE_SET,
    );
    expect(verdict).toBe("COMPLIANT");
    expect(results).toHaveLength(2);
  });

  it("rolls up to NON_COMPLIANT when the HIGH-severity rule fails", () => {
    const { verdict } = evaluate(
      { reportDate: "2023-01-01", submissionDate: "2024-01-15", ltvRatio: 0.5 },
      FAKE_RULE_SET,
    );
    expect(verdict).toBe("NON_COMPLIANT");
  });
});
