import { getPath } from "../shared/getPath.js";
import { checkRegistry } from "./checks/registry.js";
import type { CheckStatus } from "./checks/types.js";
import type { AppliesWhen, Rule, RuleSet, Severity } from "./schema.js";

export type RuleStatus = CheckStatus | "NOT_APPLICABLE";

// The final compliance verdict for a whole report, rolled up from all its rule results.
export type Verdict = "COMPLIANT" | "NEEDS_REVIEW" | "NON_COMPLIANT";

// One rule's result, with enough provenance to trace it back to the source
// field and the exact guideline clause it came from.
export interface RuleResult {
  rule_id: string;
  status: RuleStatus;
  severity: Severity;
  message: string;
  clause_ref: string;
  field: string;
  actual_value: unknown;
}

type Applicability =
  | { kind: "applicable" }
  | { kind: "not_applicable"; message: string }
  | { kind: "indeterminate"; message: string };

function resolveOneCondition(data: Record<string, unknown>, appliesWhen: AppliesWhen): Applicability {
  const actual = getPath(data, appliesWhen.field);
  if (typeof actual !== "string") {
    return {
      kind: "indeterminate",
      message: `cannot determine applicability: field "${appliesWhen.field}" is missing or not a string`,
    };
  }

  const matches = appliesWhen.in ? appliesWhen.in.includes(actual) : !appliesWhen.notIn?.includes(actual);
  if (!matches) {
    return { kind: "not_applicable", message: `rule does not apply: "${appliesWhen.field}" is "${actual}"` };
  }

  return { kind: "applicable" };
}

/**
 * `applies_when` may be a single condition or an array (AND — all must
 * match). A single `not_applicable` short-circuits the rest, since we can
 * already conclude the rule doesn't apply regardless of unresolved
 * conditions; otherwise the first `indeterminate` wins.
 */
function resolveApplicability(data: Record<string, unknown>, appliesWhen: AppliesWhen | AppliesWhen[]): Applicability {
  const conditions = Array.isArray(appliesWhen) ? appliesWhen : [appliesWhen];
  let indeterminate: Applicability | undefined;

  for (const condition of conditions) {
    const result = resolveOneCondition(data, condition);
    if (result.kind === "not_applicable") {
      return result;
    }
    if (result.kind === "indeterminate" && !indeterminate) {
      indeterminate = result;
    }
  }

  return indeterminate ?? { kind: "applicable" };
}

/**
 * `rule` is assumed to already be Zod-validated (RuleSchema), which is what
 * guarantees `rule.check` is a known key of checkRegistry — an invalid check
 * name is rejected at rule-set load time, not here.
 */
export function evaluateRule(data: Record<string, unknown>, rule: Rule): RuleResult {
  const actualValue = getPath(data, rule.field);

  // applies_when is checked first: if the rule doesn't apply to this report
  // (or we can't tell), we skip running the check entirely.
  if (rule.applies_when) {
    const applicability = resolveApplicability(data, rule.applies_when);
    if (applicability.kind !== "applicable") {
      return {
        rule_id: rule.id,
        status: applicability.kind === "not_applicable" ? "NOT_APPLICABLE" : "NEEDS_REVIEW",
        severity: rule.severity,
        message: applicability.message,
        clause_ref: rule.clause_ref,
        field: rule.field,
        actual_value: actualValue,
      };
    }
  }

  const checkFn = checkRegistry[rule.check];
  const outcome = checkFn({ value: actualValue, params: rule.params, data });

  return {
    rule_id: rule.id,
    status: outcome.status,
    severity: rule.severity,
    message: outcome.message,
    clause_ref: rule.clause_ref,
    field: rule.field,
    actual_value: actualValue,
  };
}

/**
 * Turns a list of rule results into one overall verdict for the report.
 * Order matters: a HIGH-severity FAIL is the worst outcome, checked first.
 * NOT_APPLICABLE and PASS results never affect the verdict.
 */
export function computeVerdict(results: RuleResult[]): Verdict {
  const hasHighSeverityFail = results.some((result) => result.status === "FAIL" && result.severity === "HIGH");
  if (hasHighSeverityFail) {
    return "NON_COMPLIANT";
  }

  const hasFailOrNeedsReview = results.some(
    (result) => result.status === "FAIL" || result.status === "NEEDS_REVIEW",
  );
  if (hasFailOrNeedsReview) {
    return "NEEDS_REVIEW";
  }

  return "COMPLIANT";
}

export interface EvaluationReport {
  verdict: Verdict;
  results: RuleResult[];
}

// Runs every rule in the rule set against one extracted report, then rolls
// the individual results up into a single overall verdict.
export function evaluate(data: Record<string, unknown>, ruleSet: RuleSet): EvaluationReport {
  const results = ruleSet.rules.map((rule) => evaluateRule(data, rule));
  const verdict = computeVerdict(results);
  return { verdict, results };
}
