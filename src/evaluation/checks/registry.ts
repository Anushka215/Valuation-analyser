import type { CheckName } from "../schema.js";
import { fieldsMatchWithinTolerance } from "./fieldsMatchWithinTolerance.js";
import { inBlocklist } from "./inBlocklist.js";
import { inBlocklistGrouped } from "./inBlocklistGrouped.js";
import { inRange } from "./inRange.js";
import { maxAgeDays } from "./maxAgeDays.js";
import { notEquals } from "./notEquals.js";
import { ratioInRange } from "./ratioInRange.js";
import { thresholdByCityTier } from "./thresholdByCityTier.js";
import type { CheckFn } from "./types.js";

/**
 * `CheckFn<any>` is the one deliberately-unsafe cast in the engine: each
 * check has its own precisely-typed params, but a homogeneous registry
 * indexed by CheckName can't express "params type varies per key" without
 * losing TypeScript's exhaustiveness check on this Record (add a check name
 * to the schema and this object fails to compile until it's implemented
 * here). The engine dispatch site re-narrows via the rule itself.
 */
export const checkRegistry: Record<CheckName, CheckFn<any>> = {
  max_age_days: maxAgeDays,
  in_range: inRange,
  in_blocklist: inBlocklist,
  in_blocklist_grouped: inBlocklistGrouped,
  threshold_by_city_tier: thresholdByCityTier,
  fields_match_within_tolerance: fieldsMatchWithinTolerance,
  not_equals: notEquals,
  ratio_in_range: ratioInRange,
};
