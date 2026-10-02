import type { RuleSet } from "./schema.js";

/**
 * Picks the rule set that applies to a report dated `reportDate`: the
 * latest `effective_from` that is not after the report date. Throws rather
 * than guessing when no rule set applies yet, or when two rule sets claim
 * the same effective_from (an authoring error upstream).
 */
export function selectRuleSet(ruleSets: readonly RuleSet[], reportDate: Date): RuleSet {
  // Keep only rule sets that had already taken effect by the report date,
  // then sort so the newest one is first.
  const applicable = ruleSets
    .filter((ruleSet) => new Date(ruleSet.effective_from).getTime() <= reportDate.getTime())
    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());

  const latest = applicable[0];
  if (latest === undefined) {
    throw new Error(`no rule set is effective for report date ${reportDate.toISOString()}`);
  }

  const runnerUp = applicable[1];
  if (runnerUp !== undefined && runnerUp.effective_from === latest.effective_from) {
    throw new Error(
      `ambiguous rule set selection: multiple rule sets share effective_from "${latest.effective_from}"`,
    );
  }

  return latest;
}
