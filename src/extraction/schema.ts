import { z } from "zod";

/**
 * The structured report object our rules engine evaluates. Every field is
 * nullable because a real scanned report may simply not contain it — the
 * engine's checks already know how to handle a missing field (they report
 * NEEDS_REVIEW rather than crashing).
 *
 * `needs_review` lists the names of fields a human should double-check —
 * either because the LLM couldn't find them, or because they came from the
 * low-trust regex fallback (see extractFields.ts).
 */
export const ExtractedReportSchema = z.object({
  // What kind of property this is, and where.
  property_type: z.string().nullable(),
  property_sub_type: z.string().nullable(),
  residential_building_type: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  site_condition: z.string().nullable(),
  ownership_type: z.string().nullable(),
  ownership_share_type: z.string().nullable(),

  // Money and area measurements.
  valuation_amount: z.number().nullable(),
  construction_pct: z.number().nullable(),
  commercial_bua_sqft: z.number().nullable(),
  vacant_land_area_sqft: z.number().nullable(),
  land_area_sqft: z.number().nullable(),
  constructed_area_sqft: z.number().nullable(),
  built_coverage_pct: z.number().nullable(),
  carpet_area_measured: z.number().nullable(),
  carpet_area_documented: z.number().nullable(),

  // Ages and durations, all in years unless named otherwise.
  property_age_years: z.number().nullable(),
  ownership_years: z.number().nullable(),
  registered_shops: z.number().nullable(),
  occupancy_pct: z.number().nullable(),
  residual_lease_years: z.number().nullable(),
  approach_road_width_feet: z.number().nullable(),
  rented_leased_shop_count: z.number().nullable(),
  tenant_count: z.number().nullable(),

  // Dates as plain strings — not strictly ISO, since OCR/fallback text
  // won't always come out in a clean format. The engine's own checks
  // handle a date string that doesn't parse.
  technical_report_date: z.string().nullable(),
  approval_date: z.string().nullable(),

  // Yes/no red flags used by the Category B / Category A blocklist rules.
  is_outside_india: z.boolean().nullable(),
  land_acquisition_pending: z.boolean().nullable(),
  title_deed_pending: z.boolean().nullable(),
  has_religious_monument: z.boolean().nullable(),
  is_land_locked: z.boolean().nullable(),
  is_on_buffer_zone: z.boolean().nullable(),
  built_on_agricultural_land: z.boolean().nullable(),
  is_amalgamated_overlapping: z.boolean().nullable(),
  is_leased: z.boolean().nullable(),
  is_vacant: z.boolean().nullable(),
  demarcation_available: z.boolean().nullable(),

  // Names of fields a human should check before trusting them.
  needs_review: z.array(z.string()),
});

export type ExtractedReport = z.infer<typeof ExtractedReportSchema>;

// The full list of data field names (everything except needs_review
// itself). Used by the reliability wrapper to build a "give me every
// field, or null" object for both the LLM prompt and the fallback parser.
export const EXTRACTED_FIELD_NAMES = Object.keys(ExtractedReportSchema.shape).filter(
  (name) => name !== "needs_review",
);
