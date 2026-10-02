import { extractCriticalFieldsWithRegex } from "./fallbackParser.js";
import { callGemma } from "./gemmaClient.js";
import { EXTRACTED_FIELD_NAMES, ExtractedReportSchema } from "./schema.js";
import type { ExtractedReport } from "./schema.js";

// Each attempt is expensive on CPU (~76s for gemma3:4b), so 3 retries
// would make a worst-case failure take minutes.
const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 500;

// One example value per field, purely to show Gemma the expected JSON
// shape and value types. Not real data - just fills in whatever fields
// the schema happens to have today, defaulting to null for any that
// don't have an example value below.
const EXAMPLE_FIELD_VALUES: Record<string, string | number | boolean | null> = {
  property_type: "Commercial",
  property_sub_type: "Office",
  city: "Mumbai",
  state: "Maharashtra",
  site_condition: "Good",
  ownership_type: "Freehold",
  valuation_amount: 5000000,
  construction_pct: 80,
  commercial_bua_sqft: 1200,
  land_area_sqft: 2000,
  constructed_area_sqft: 1500,
  built_coverage_pct: 60,
  carpet_area_measured: 1000,
  carpet_area_documented: 950,
  property_age_years: 10,
  ownership_years: 5,
  registered_shops: 2,
  occupancy_pct: 100,
  residual_lease_years: 30,
  approach_road_width_feet: 20,
  rented_leased_shop_count: 1,
  tenant_count: 3,
  technical_report_date: "2022-10-07",
  is_outside_india: false,
  land_acquisition_pending: false,
  title_deed_pending: false,
  has_religious_monument: false,
  is_land_locked: false,
  is_on_buffer_zone: false,
  built_on_agricultural_land: false,
  is_amalgamated_overlapping: false,
  is_leased: true,
  is_vacant: false,
  demarcation_available: true,
};

function buildExampleJson(): string {
  const example: Record<string, unknown> = {};
  for (const name of EXTRACTED_FIELD_NAMES) {
    example[name] = EXAMPLE_FIELD_VALUES[name] ?? null;
  }
  return JSON.stringify(example);
}

function buildPrompt(ocrText: string): string {
  const fieldList = EXTRACTED_FIELD_NAMES.join(", ");
  return [
    "You are extracting structured data from a property valuation report.",
    "Return ONLY a JSON object, no prose - no greeting, no explanation, nothing before or after the JSON.",
    `The JSON object must have exactly these fields: ${fieldList}.`,
    "If a field is not present in the text, use null for it.",
    "Numeric fields (amounts, areas, percentages, years, counts) must be plain JSON numbers, not strings - write 501234000, never \"501234000\" or \"501234000.00\".",
    "Here is an example of the exact JSON shape expected (the values below are examples only, not real data):",
    buildExampleJson(),
    "",
    "REPORT TEXT:",
    ocrText,
  ].join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Any field the model left null is low-confidence by definition - it
// couldn't find it - so we flag it for a human to check.
function addNeedsReviewForNullFields(fields: Record<string, unknown>): Record<string, unknown> {
  const needsReview = EXTRACTED_FIELD_NAMES.filter((name) => fields[name] === null || fields[name] === undefined);
  return { ...fields, needs_review: needsReview };
}

// One attempt: call Gemma, parse its text as JSON, validate with Zod.
// Throws if any step fails - the caller decides whether to retry.
async function tryExtractOnce(prompt: string): Promise<ExtractedReport> {
  const rawText = await callGemma(prompt);
  // TEMP DEBUG - remove once the null-field extraction issue is diagnosed
  console.log("=== RAW GEMMA RESPONSE ===\n" + rawText + "\n=== END RAW GEMMA RESPONSE ===");
  const parsedJson = JSON.parse(rawText) as Record<string, unknown>;
  const withReviewFlags = addNeedsReviewForNullFields(parsedJson);
  return ExtractedReportSchema.parse(withReviewFlags);
}

// Last resort when the LLM never returns valid, schema-passing JSON: a
// simple regex search for a few critical fields. Every field here is
// flagged for review, since a regex is much less reliable than the LLM.
function buildFallbackReport(ocrText: string): ExtractedReport {
  const foundFields = extractCriticalFieldsWithRegex(ocrText);

  const allFields: Record<string, unknown> = {};
  for (const name of EXTRACTED_FIELD_NAMES) {
    allFields[name] = foundFields[name] ?? null;
  }
  allFields.needs_review = EXTRACTED_FIELD_NAMES;

  return ExtractedReportSchema.parse(allFields);
}

/**
 * Turns OCR text into a validated ExtractedReport using Gemma.
 *
 * Gemma is untrusted: we never act on its raw output. Every response must
 * pass through JSON.parse and then the Zod schema before we trust a single
 * field. If it fails either check, we retry a few times with a short
 * backoff, and if it still fails, we fall back to a simple deterministic
 * parser so the pipeline never just breaks.
 */
export async function extractFields(
  ocrText: string,
  options?: { maxAttempts?: number; retryDelayMs?: number },
): Promise<ExtractedReport> {
  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const retryDelayMs = options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const prompt = buildPrompt(ocrText);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await tryExtractOnce(prompt);
    } catch {
      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt) {
        break;
      }
      await sleep(retryDelayMs * attempt); // grows a little each retry
    }
  }

  return buildFallbackReport(ocrText);
}
