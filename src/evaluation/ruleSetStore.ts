import { readFileSync } from "node:fs";
import { RuleSetSchema } from "./schema.js";
import type { RuleSet } from "./schema.js";

const DEFAULT_RULES_FILE_PATH = "rules.json";

/**
 * Reads and validates the rule sets we evaluate reports against. rules.json
 * holds a JSON array so more than one rule-set version can exist at once -
 * version selection then picks the right one for a given report date.
 *
 * Fails loudly (throws) if the file is missing or doesn't match our
 * schema, rather than silently evaluating reports against bad rules.
 */
export function loadRuleSets(filePath: string = DEFAULT_RULES_FILE_PATH): RuleSet[] {
  const raw = readFileSync(filePath, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  const ruleSetsRaw = Array.isArray(parsed) ? parsed : [parsed];

  return ruleSetsRaw.map((ruleSet, index) => {
    const result = RuleSetSchema.safeParse(ruleSet);
    if (!result.success) {
      throw new Error(`rules.json entry ${index} is invalid: ${result.error.message}`);
    }
    return result.data;
  });
}
