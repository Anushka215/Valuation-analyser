import { evaluate } from "../src/evaluation/engine.js";
import { loadRuleSets } from "../src/evaluation/ruleSetStore.js";

const ruleSets = loadRuleSets("rules.json");
const ruleSet = ruleSets[0];
if (!ruleSet) {
  throw new Error("no rule set found");
}

console.log(`Loaded ${ruleSets.length} rule set(s), ${ruleSet.rules.length} rules total.`);
for (const rule of ruleSet.rules) {
  console.log(`  ${rule.id} [${rule.check}] -> ${rule.clause_ref}`);
}

// Functional smoke test: an all-null fake report should evaluate cleanly
// (no crashes) with every rule reporting NOT_APPLICABLE or NEEDS_REVIEW.
const emptyReport: Record<string, unknown> = {};
const { verdict, results } = evaluate(emptyReport, ruleSet);
const statusCounts = results.reduce<Record<string, number>>((counts, r) => {
  counts[r.status] = (counts[r.status] ?? 0) + 1;
  return counts;
}, {});
console.log(`\nSmoke test against an empty report: verdict=${verdict}`);
console.log(statusCounts);
