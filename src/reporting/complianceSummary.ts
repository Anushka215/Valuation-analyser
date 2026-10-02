import type { RuleResult } from "../evaluation/engine.js";
import type { RuleSet } from "../evaluation/schema.js";

export type CollateralDecision = "NOT ACCEPTABLE" | "ACCEPTABLE WITH REVIEW" | "ACCEPTABLE";

// One rule result, reworded for a human reader instead of the engine's
// internal check phrasing - but still carrying the same provenance
// (clause_ref, field, actual_value) so nothing is less traceable.
export interface ComplianceSummaryItem {
  clause_ref: string;
  sentence: string;
  field: string;
  actual_value: unknown;
}

export interface ComplianceSummaryCounts {
  blocking: number;
  needsReview: number;
  passed: number;
  notApplicable: number;
}

export interface ComplianceSummary {
  decision: CollateralDecision;
  reason: string;
  blockingIssues: ComplianceSummaryItem[];
  needsReview: ComplianceSummaryItem[];
  passed: ComplianceSummaryItem[];
  notApplicable: ComplianceSummaryItem[];
  counts: ComplianceSummaryCounts;
}

// Every rule's description is written as "<category label>: <clause
// statement>" (e.g. "Hard block: property is a stone crusher."). Stripping
// the label leaves just the plain clause statement to build a sentence
// from - the category is redundant once the result is already grouped
// under a "Blocking issues" / "Needs review" heading.
const CATEGORY_PREFIXES = ["Hard block: ", "Needs one-level-higher NFA: "];

function stripCategoryPrefix(description: string): string {
  for (const prefix of CATEGORY_PREFIXES) {
    if (description.startsWith(prefix)) {
      return description.slice(prefix.length);
    }
  }
  return description;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

// Builds one plain-English sentence for a rule result from the rule's own
// description, instead of the engine's internal check phrasing (e.g.
// "value false must not equal true"). The description just names the
// clause's concern - it doesn't say whether that concern was found - so
// the wording here carries the outcome.
function buildSentence(status: RuleResult["status"], description: string): string {
  const clause = stripCategoryPrefix(description);

  switch (status) {
    case "FAIL":
      return capitalize(clause);
    case "NEEDS_REVIEW":
      return `Needs verification: ${clause}`;
    case "NOT_APPLICABLE":
      return `Not applicable: ${clause}`;
    case "PASS":
      return `Not flagged: ${clause}`;
  }
}

function toItem(result: RuleResult, description: string): ComplianceSummaryItem {
  return {
    clause_ref: result.clause_ref,
    sentence: buildSentence(result.status, description),
    field: result.field,
    actual_value: result.actual_value,
  };
}

function buildReason(decision: CollateralDecision, counts: ComplianceSummaryCounts, blocking: ComplianceSummaryItem[]): string {
  if (decision === "NOT ACCEPTABLE") {
    const clauses = blocking.map((item) => item.clause_ref).join(", ");
    return `${counts.blocking} hard compliance rule(s) failed (${clauses}).`;
  }
  if (decision === "ACCEPTABLE WITH REVIEW") {
    return `${counts.needsReview} item(s) need review before approval.`;
  }
  return "All applicable compliance rules passed.";
}

/**
 * Turns the engine's raw rule results into a bank-compliance-style
 * summary: one overall accept/reject decision, plus every result grouped
 * by what a reviewer actually needs to act on. This never changes a rule
 * result - it's purely how the same results get presented.
 */
export function buildComplianceSummary(results: RuleResult[], ruleSet: RuleSet): ComplianceSummary {
  const descriptionByRuleId = new Map(ruleSet.rules.map((rule) => [rule.id, rule.description]));
  const describe = (result: RuleResult): string => descriptionByRuleId.get(result.rule_id) ?? result.message;

  const blockingIssues = results
    .filter((result) => result.status === "FAIL" && result.severity === "HIGH")
    .map((result) => toItem(result, describe(result)));

  // "Needs review before approval" = every NEEDS_REVIEW, plus FAILs that
  // aren't HIGH severity (those aren't hard blocks, just need a look).
  const needsReview = results
    .filter((result) => result.status === "NEEDS_REVIEW" || (result.status === "FAIL" && result.severity !== "HIGH"))
    .map((result) => toItem(result, describe(result)));

  const passed = results.filter((result) => result.status === "PASS").map((result) => toItem(result, describe(result)));

  const notApplicable = results
    .filter((result) => result.status === "NOT_APPLICABLE")
    .map((result) => toItem(result, describe(result)));

  const counts: ComplianceSummaryCounts = {
    blocking: blockingIssues.length,
    needsReview: needsReview.length,
    passed: passed.length,
    notApplicable: notApplicable.length,
  };

  const decision: CollateralDecision =
    counts.blocking > 0 ? "NOT ACCEPTABLE" : counts.needsReview > 0 ? "ACCEPTABLE WITH REVIEW" : "ACCEPTABLE";

  return {
    decision,
    reason: buildReason(decision, counts, blockingIssues),
    blockingIssues,
    needsReview,
    passed,
    notApplicable,
    counts,
  };
}
