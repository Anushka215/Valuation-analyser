import type { InRangeParams } from "../schema.js";
import type { CheckFn } from "./types.js";

/** Fails when the numeric `value` falls outside [params.min, params.max]. */
export const inRange: CheckFn<InRangeParams> = ({ value, params }) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return { status: "NEEDS_REVIEW", message: `expected a numeric value, got ${JSON.stringify(value)}` };
  }

  if (params.min !== undefined) {
    const violatesMin = params.minExclusive ? value <= params.min : value < params.min;
    if (violatesMin) {
      return { status: "FAIL", message: `value ${value} is below minimum ${params.min}` };
    }
  }

  if (params.max !== undefined) {
    const violatesMax = params.maxExclusive ? value >= params.max : value > params.max;
    if (violatesMax) {
      return { status: "FAIL", message: `value ${value} exceeds maximum ${params.max}` };
    }
  }

  return { status: "PASS", message: `value ${value} is within range` };
};
