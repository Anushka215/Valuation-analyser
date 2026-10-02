import { getPath } from "../../shared/getPath.js";
import type { ThresholdByCityTierParams } from "../schema.js";
import type { CheckFn } from "./types.js";

/**
 * Fails when the numeric `value` violates a threshold that depends on the
 * property's city tier (read from params.tierField on the extracted data).
 */
export const thresholdByCityTier: CheckFn<ThresholdByCityTierParams> = ({ value, params, data }) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return { status: "NEEDS_REVIEW", message: `expected a numeric value, got ${JSON.stringify(value)}` };
  }

  const tier = getPath(data, params.tierField);
  if (typeof tier !== "string") {
    return {
      status: "NEEDS_REVIEW",
      message: `city tier field "${params.tierField}" is missing or not a string`,
    };
  }

  const threshold = params.thresholds[tier];
  if (threshold === undefined) {
    return { status: "NEEDS_REVIEW", message: `no threshold configured for city tier "${tier}"` };
  }

  const exceeds = params.comparison === "max" ? value > threshold : value < threshold;
  if (exceeds) {
    return {
      status: "FAIL",
      message: `value ${value} violates ${params.comparison} threshold ${threshold} for tier "${tier}"`,
    };
  }

  return {
    status: "PASS",
    message: `value ${value} is within ${params.comparison} threshold ${threshold} for tier "${tier}"`,
  };
};
