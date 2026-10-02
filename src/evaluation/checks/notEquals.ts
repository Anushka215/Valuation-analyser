import type { NotEqualsParams } from "../schema.js";
import type { CheckFn } from "./types.js";

/** Fails when `value` strictly equals params.value (e.g. a boolean red flag being true). */
export const notEquals: CheckFn<NotEqualsParams> = ({ value, params }) => {
  if (value === undefined || value === null) {
    return { status: "NEEDS_REVIEW", message: `expected a value to compare, got ${JSON.stringify(value)}` };
  }

  if (value === params.value) {
    return { status: "FAIL", message: `value ${JSON.stringify(value)} must not equal ${JSON.stringify(params.value)}` };
  }

  return { status: "PASS", message: `value ${JSON.stringify(value)} does not equal ${JSON.stringify(params.value)}` };
};
