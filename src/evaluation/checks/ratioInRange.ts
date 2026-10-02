import { getPath } from "../../shared/getPath.js";
import type { RatioInRangeParams } from "../schema.js";
import type { CheckFn } from "./types.js";

/**
 * Fails when (value / params.denominatorField) * 100 falls outside
 * [params.min, params.max] — e.g. "constructed area must be at least 20%
 * of land area".
 */
export const ratioInRange: CheckFn<RatioInRangeParams> = ({ value, params, data }) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return { status: "NEEDS_REVIEW", message: `expected a numeric value, got ${JSON.stringify(value)}` };
  }

  const denominator = getPath(data, params.denominatorField);
  if (typeof denominator !== "number" || Number.isNaN(denominator) || denominator === 0) {
    return {
      status: "NEEDS_REVIEW",
      message: `denominator field "${params.denominatorField}" is missing, not numeric, or zero`,
    };
  }

  // e.g. value 300, denominator 1000 -> 30 (meaning 30%)
  const ratioPct = (value / denominator) * 100;

  if (params.min !== undefined) {
    const violatesMin = params.minExclusive ? ratioPct <= params.min : ratioPct < params.min;
    if (violatesMin) {
      return {
        status: "FAIL",
        message: `ratio ${ratioPct.toFixed(2)}% is below minimum ${params.min}%`,
      };
    }
  }

  if (params.max !== undefined) {
    const violatesMax = params.maxExclusive ? ratioPct >= params.max : ratioPct > params.max;
    if (violatesMax) {
      return {
        status: "FAIL",
        message: `ratio ${ratioPct.toFixed(2)}% exceeds maximum ${params.max}%`,
      };
    }
  }

  return { status: "PASS", message: `ratio ${ratioPct.toFixed(2)}% is within range` };
};
