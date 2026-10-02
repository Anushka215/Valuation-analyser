import { getPath } from "../../shared/getPath.js";
import type { FieldsMatchWithinToleranceParams } from "../schema.js";
import type { CheckFn } from "./types.js";

/**
 * Flags when the numeric `value` and params.compareField (another field on
 * the extracted data) differ by more than the allowed tolerance — absolute,
 * or a percentage of the compare field's magnitude. The status reported on
 * a breach is configurable via params.onMismatch (default FAIL) since some
 * uses of this check are data-integrity flags rather than hard violations.
 */
export const fieldsMatchWithinTolerance: CheckFn<FieldsMatchWithinToleranceParams> = ({ value, params, data }) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return { status: "NEEDS_REVIEW", message: `expected a numeric value, got ${JSON.stringify(value)}` };
  }

  const compareValue = getPath(data, params.compareField);
  if (typeof compareValue !== "number" || Number.isNaN(compareValue)) {
    return {
      status: "NEEDS_REVIEW",
      message: `comparison field "${params.compareField}" is missing or not numeric`,
    };
  }

  const mode = params.mode ?? "absolute";
  const diff = Math.abs(value - compareValue);

  // "allowed" is the largest difference we'll accept before flagging.
  // In percentage mode it scales with the compare value (e.g. 3% of 1000 = 30).
  const allowed = mode === "percentage" ? Math.abs(compareValue) * (params.tolerance / 100) : params.tolerance;
  const toleranceLabel = mode === "percentage" ? `${params.tolerance}%` : `${params.tolerance}`;

  // Also work out the difference as a percentage, purely for a clearer
  // message — this is shown even in absolute mode.
  const diffPct = compareValue !== 0 ? (diff / Math.abs(compareValue)) * 100 : undefined;
  const deltaLabel = diffPct !== undefined ? `${diff} (${diffPct.toFixed(2)}%)` : `${diff}`;
  const values = `value ${value} vs ${params.compareField} ${compareValue}`;

  if (diff > allowed) {
    return {
      status: params.onMismatch ?? "FAIL",
      message: `${values}: difference ${deltaLabel} exceeds tolerance ${toleranceLabel}`,
    };
  }

  return { status: "PASS", message: `${values}: difference ${deltaLabel} is within tolerance ${toleranceLabel}` };
};
