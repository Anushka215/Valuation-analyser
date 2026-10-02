import type { InBlocklistParams } from "../schema.js";
import type { CheckFn } from "./types.js";

/** Fails when the string `value` matches an entry in params.blocklist. */
export const inBlocklist: CheckFn<InBlocklistParams> = ({ value, params }) => {
  if (typeof value !== "string") {
    return { status: "NEEDS_REVIEW", message: `expected a string value, got ${JSON.stringify(value)}` };
  }

  const normalize = (input: string): string => (params.caseSensitive ? input : input.toLowerCase());
  const target = normalize(value);
  const isBlocked = params.blocklist.some((entry) => normalize(entry) === target);

  if (isBlocked) {
    return { status: "FAIL", message: `value "${value}" matches a blocklisted entry` };
  }

  return { status: "PASS", message: `value "${value}" is not blocklisted` };
};
