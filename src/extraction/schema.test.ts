// TEST-ONLY FAKE FIXTURES — not real extracted report data.
import { describe, expect, it } from "vitest";
import { ExtractedReportSchema } from "./schema.js";

function fakeValidReport() {
  return {
    property_type: "residential",
    property_sub_type: null,
    residential_building_type: null,
    city: "Pune",
    state: null,
    site_condition: null,
    ownership_type: null,
    ownership_share_type: null,
    valuation_amount: 5_000_000,
    construction_pct: 100,
    commercial_bua_sqft: null,
    vacant_land_area_sqft: null,
    land_area_sqft: null,
    constructed_area_sqft: null,
    built_coverage_pct: null,
    carpet_area_measured: 1000,
    carpet_area_documented: 980,
    property_age_years: 10,
    ownership_years: null,
    registered_shops: null,
    occupancy_pct: null,
    residual_lease_years: null,
    approach_road_width_feet: null,
    rented_leased_shop_count: null,
    tenant_count: null,
    technical_report_date: "2024-01-01",
    approval_date: null,
    is_outside_india: false,
    land_acquisition_pending: false,
    title_deed_pending: false,
    has_religious_monument: false,
    is_land_locked: false,
    is_on_buffer_zone: false,
    built_on_agricultural_land: false,
    is_amalgamated_overlapping: false,
    is_leased: false,
    is_vacant: false,
    demarcation_available: null,
    needs_review: [],
  };
}

describe("ExtractedReportSchema", () => {
  it("accepts a fully-filled-in valid report", () => {
    const result = ExtractedReportSchema.safeParse(fakeValidReport());
    expect(result.success).toBe(true);
  });

  it("accepts a report where every field is null except needs_review", () => {
    const allNull = { ...fakeValidReport() };
    for (const key of Object.keys(allNull)) {
      if (key !== "needs_review") {
        (allNull as Record<string, unknown>)[key] = null;
      }
    }
    const result = ExtractedReportSchema.safeParse(allNull);
    expect(result.success).toBe(true);
  });

  it("rejects a report missing a required field entirely", () => {
    const broken = fakeValidReport() as Record<string, unknown>;
    delete broken.property_type;
    const result = ExtractedReportSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it("rejects a report with the wrong type for a numeric field", () => {
    const broken = { ...fakeValidReport(), valuation_amount: "five million" };
    const result = ExtractedReportSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it("rejects a report with the wrong type for a boolean field", () => {
    const broken = { ...fakeValidReport(), is_leased: "yes" };
    const result = ExtractedReportSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it("rejects a report missing needs_review", () => {
    const broken = fakeValidReport() as Record<string, unknown>;
    delete broken.needs_review;
    const result = ExtractedReportSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it("rejects a report where needs_review contains non-strings", () => {
    const broken = { ...fakeValidReport(), needs_review: [123] };
    const result = ExtractedReportSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });
});
