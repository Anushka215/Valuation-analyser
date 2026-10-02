// TEST-ONLY FAKE FIXTURES — not real bank guideline rules or thresholds.
import { describe, expect, it } from "vitest";
import type { RuleResult } from "../evaluation/engine.js";
import type { Rule, RuleSet } from "../evaluation/schema.js";
import { buildComplianceSummary } from "./complianceSummary.js";

function fakeRule(overrides: Partial<Rule> & Pick<Rule, "id" | "description">): Rule {
  return {
    severity: "MEDIUM",
    effective_from: "2024-01-01",
    field: "some_field",
    clause_ref: "X.1",
    check: "not_equals",
    params: { value: true },
    ...overrides,
  } as Rule;
}

function fakeRuleSet(rules: Rule[]): RuleSet {
  return { version: "test", effective_from: "2024-01-01", rules };
}

function fakeResult(overrides: Partial<RuleResult> & Pick<RuleResult, "rule_id" | "status">): RuleResult {
  return {
    severity: "MEDIUM",
    message: "internal check message",
    clause_ref: "X.1",
    field: "some_field",
    actual_value: null,
    ...overrides,
  };
}

describe("buildComplianceSummary", () => {
  it("decides NOT ACCEPTABLE when any HIGH-severity rule fails", () => {
    const ruleSet = fakeRuleSet([
      fakeRule({ id: "R1", description: "Hard block: property is a stone crusher.", severity: "HIGH" }),
    ]);
    const results = [fakeResult({ rule_id: "R1", status: "FAIL", severity: "HIGH", clause_ref: "G.4" })];

    const summary = buildComplianceSummary(results, ruleSet);

    expect(summary.decision).toBe("NOT ACCEPTABLE");
    expect(summary.counts).toEqual({ blocking: 1, needsReview: 0, passed: 0, notApplicable: 0 });
    expect(summary.blockingIssues).toHaveLength(1);
    expect(summary.blockingIssues[0]?.sentence).toBe("Property is a stone crusher.");
  });

  it("decides ACCEPTABLE WITH REVIEW when there's a NEEDS_REVIEW but no HIGH fail", () => {
    const ruleSet = fakeRuleSet([fakeRule({ id: "R1", description: "Some clause statement." })]);
    const results = [fakeResult({ rule_id: "R1", status: "NEEDS_REVIEW" })];

    const summary = buildComplianceSummary(results, ruleSet);

    expect(summary.decision).toBe("ACCEPTABLE WITH REVIEW");
    expect(summary.needsReview).toHaveLength(1);
    expect(summary.needsReview[0]?.sentence).toBe("Needs verification: Some clause statement.");
  });

  it("decides ACCEPTABLE WITH REVIEW for a MEDIUM-severity FAIL (not a hard block)", () => {
    const ruleSet = fakeRuleSet([
      fakeRule({ id: "R1", description: "Needs one-level-higher NFA: property is a cinema hall.", severity: "MEDIUM" }),
    ]);
    const results = [fakeResult({ rule_id: "R1", status: "FAIL", severity: "MEDIUM" })];

    const summary = buildComplianceSummary(results, ruleSet);

    expect(summary.decision).toBe("ACCEPTABLE WITH REVIEW");
    expect(summary.blockingIssues).toHaveLength(0);
    expect(summary.needsReview).toHaveLength(1);
    expect(summary.needsReview[0]?.sentence).toBe("Property is a cinema hall.");
  });

  it("decides ACCEPTABLE when everything passes or doesn't apply", () => {
    const ruleSet = fakeRuleSet([
      fakeRule({ id: "R1", description: "Hard block: government land acquisition is pending." }),
      fakeRule({ id: "R2", description: "Vacant land area must be between 800 and 10,000 sqft." }),
    ]);
    const results = [
      fakeResult({ rule_id: "R1", status: "PASS" }),
      fakeResult({ rule_id: "R2", status: "NOT_APPLICABLE" }),
    ];

    const summary = buildComplianceSummary(results, ruleSet);

    expect(summary.decision).toBe("ACCEPTABLE");
    expect(summary.reason).toBe("All applicable compliance rules passed.");
    expect(summary.counts).toEqual({ blocking: 0, needsReview: 0, passed: 1, notApplicable: 1 });
    expect(summary.passed[0]?.sentence).toBe("Not flagged: government land acquisition is pending.");
    expect(summary.notApplicable[0]?.sentence).toBe("Not applicable: Vacant land area must be between 800 and 10,000 sqft.");
  });

  it("falls back to the engine message if a rule id has no matching description", () => {
    const ruleSet = fakeRuleSet([]);
    const results = [fakeResult({ rule_id: "MISSING", status: "PASS", message: "raw engine message" })];

    const summary = buildComplianceSummary(results, ruleSet);

    expect(summary.passed[0]?.sentence).toBe("Not flagged: raw engine message");
  });

  it("includes the failing clause_ref(s) in the NOT ACCEPTABLE reason", () => {
    const ruleSet = fakeRuleSet([fakeRule({ id: "R1", description: "Hard block: outside India." })]);
    const results = [fakeResult({ rule_id: "R1", status: "FAIL", severity: "HIGH", clause_ref: "G.2" })];

    const summary = buildComplianceSummary(results, ruleSet);

    expect(summary.reason).toBe("1 hard compliance rule(s) failed (G.2).");
  });
});
