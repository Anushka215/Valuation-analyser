import { getPath } from "../../shared/getPath.js";
import type { MaxAgeDaysParams } from "../schema.js";
import type { CheckFn } from "./types.js";

function parseDate(raw: unknown): Date | undefined {
  if (typeof raw !== "string" && !(raw instanceof Date)) {
    return undefined;
  }
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Fails when `value` (a date) is more than `params.maxDays` old, relative to
 * `params.asOfField` (another field on the extracted object) or, if that is
 * omitted, the current system time.
 */
export const maxAgeDays: CheckFn<MaxAgeDaysParams> = ({ value, params, data }) => {
  const candidate = parseDate(value);
  if (!candidate) {
    return { status: "NEEDS_REVIEW", message: `expected a parseable date, got ${JSON.stringify(value)}` };
  }

  let reference: Date;
  if (params.asOfField) {
    const referenceRaw = getPath(data, params.asOfField);
    const parsedReference = parseDate(referenceRaw);
    if (!parsedReference) {
      return {
        status: "NEEDS_REVIEW",
        message: `reference field "${params.asOfField}" is missing or not a parseable date`,
      };
    }
    reference = parsedReference;
  } else {
    reference = new Date();
  }

  const ageDays = (reference.getTime() - candidate.getTime()) / (1000 * 60 * 60 * 24);

  if (ageDays < 0) {
    return { status: "NEEDS_REVIEW", message: "value date is after the reference date" };
  }

  if (ageDays > params.maxDays) {
    return {
      status: "FAIL",
      message: `age ${Math.floor(ageDays)} days exceeds max of ${params.maxDays} days`,
    };
  }

  return { status: "PASS", message: `age ${Math.floor(ageDays)} days is within max of ${params.maxDays} days` };
};
