// TEST-ONLY FAKE FIXTURES — no real Ollama call happens in these tests.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractFields } from "./extractFields.js";
import { callGemma } from "./gemmaClient.js";

vi.mock("./gemmaClient.js", () => ({
  callGemma: vi.fn(),
}));

const mockedCallGemma = vi.mocked(callGemma);

// A JSON string with every field filled in except needs_review, which the
// reliability wrapper computes itself - the model never sends that field.
function fakeCompleteJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    property_type: "residential",
    property_sub_type: null,
    residential_building_type: null,
    city: "Pune",
    state: null,
    site_condition: null,
    ownership_type: null,
    ownership_share_type: null,
    valuation_amount: 5_000_000,
    construction_pct: null,
    commercial_bua_sqft: null,
    vacant_land_area_sqft: null,
    land_area_sqft: null,
    constructed_area_sqft: null,
    built_coverage_pct: null,
    carpet_area_measured: null,
    carpet_area_documented: null,
    property_age_years: null,
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
    ...overrides,
  });
}

const FAST_RETRY_OPTIONS = { retryDelayMs: 0 };

describe("extractFields", () => {
  beforeEach(() => {
    mockedCallGemma.mockReset();
  });

  it("returns a validated report when Gemma returns valid JSON on the first try", async () => {
    mockedCallGemma.mockResolvedValueOnce(fakeCompleteJson());

    const report = await extractFields("some ocr text", FAST_RETRY_OPTIONS);

    expect(report.property_type).toBe("residential");
    expect(report.city).toBe("Pune");
    expect(mockedCallGemma).toHaveBeenCalledTimes(1);
  });

  it("flags null fields as needing review", async () => {
    mockedCallGemma.mockResolvedValueOnce(fakeCompleteJson());

    const report = await extractFields("some ocr text", FAST_RETRY_OPTIONS);

    expect(report.needs_review).toContain("construction_pct");
    expect(report.needs_review).not.toContain("property_type");
  });

  it("retries when Gemma returns malformed JSON, then succeeds", async () => {
    mockedCallGemma
      .mockResolvedValueOnce("this is not JSON at all")
      .mockResolvedValueOnce(fakeCompleteJson());

    const report = await extractFields("some ocr text", FAST_RETRY_OPTIONS);

    expect(report.property_type).toBe("residential");
    expect(mockedCallGemma).toHaveBeenCalledTimes(2);
  });

  it("retries when Gemma returns JSON that fails schema validation, then succeeds", async () => {
    const invalidShape = JSON.stringify({ property_type: 12345 }); // wrong type, missing fields
    mockedCallGemma.mockResolvedValueOnce(invalidShape).mockResolvedValueOnce(fakeCompleteJson());

    const report = await extractFields("some ocr text", FAST_RETRY_OPTIONS);

    expect(report.property_type).toBe("residential");
    expect(mockedCallGemma).toHaveBeenCalledTimes(2);
  });

  it("falls back to the regex parser after repeated failures", async () => {
    mockedCallGemma.mockResolvedValue("still not JSON");

    const ocrText = "Report dated 12/05/2024. Valuation Amount: Rs. 50,00,000 total.";
    const report = await extractFields(ocrText, { ...FAST_RETRY_OPTIONS, maxAttempts: 3 });

    expect(mockedCallGemma).toHaveBeenCalledTimes(3);
    expect(report.technical_report_date).toBe("12/05/2024");
    expect(report.valuation_amount).toBe(5_000_000);
    // The fallback path is never fully trusted - every field is flagged.
    expect(report.needs_review).toContain("technical_report_date");
    expect(report.needs_review).toContain("property_type");
  });

  it("falls back to all-null fields when even the regex parser finds nothing", async () => {
    mockedCallGemma.mockResolvedValue("still not JSON");

    const report = await extractFields("no dates or amounts here", { ...FAST_RETRY_OPTIONS, maxAttempts: 2 });

    expect(report.technical_report_date).toBeNull();
    expect(report.valuation_amount).toBeNull();
    expect(report.needs_review.length).toBeGreaterThan(0);
  });

  it("falls back when Gemma itself throws (e.g. a network error) on every attempt", async () => {
    mockedCallGemma.mockRejectedValue(new Error("connection refused"));

    const report = await extractFields("Rs. 1,000,000 mentioned here", { ...FAST_RETRY_OPTIONS, maxAttempts: 2 });

    expect(mockedCallGemma).toHaveBeenCalledTimes(2);
    expect(report.valuation_amount).toBe(1_000_000);
  });
});
