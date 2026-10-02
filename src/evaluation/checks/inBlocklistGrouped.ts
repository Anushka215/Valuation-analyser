import type { InBlocklistGroupedParams } from "../schema.js";
import type { CheckFn } from "./types.js";

/**
 * Same as inBlocklist, but checks against a list of { value, clause_ref }
 * entries instead of plain strings - lets one rule cover a whole group of
 * blocked values while the message still names the specific clause that
 * matched, so we don't lose per-value traceability.
 */
export const inBlocklistGrouped: CheckFn<InBlocklistGroupedParams> = ({ value, params }) => {
  if (typeof value !== "string") {
    return { status: "NEEDS_REVIEW", message: `expected a string value, got ${JSON.stringify(value)}` };
  }

  const normalize = (input: string): string => (params.caseSensitive ? input : input.toLowerCase());
  const target = normalize(value);
  const match = params.blocklist.find((entry) => normalize(entry.value) === target);

  if (match) {
    return {
      status: "FAIL",
      message: `value "${value}" matches blocklisted entry "${match.value}" (clause ${match.clause_ref})`,
    };
  }

  const allClauses = params.blocklist.map((entry) => entry.clause_ref).join(", ");
  return { status: "PASS", message: `value "${value}" is not blocklisted (checked clauses: ${allClauses})` };
};
