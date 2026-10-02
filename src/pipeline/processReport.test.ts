// TEST-ONLY FAKE FIXTURES — mocks the OCR + Gemma + rule-set-loading
// boundaries so this test needs no real PDF, Ollama, or rules.json file.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../extraction/ocr.js", () => ({
  ocrPdf: vi.fn(),
}));
vi.mock("../extraction/gemmaClient.js", () => ({
  callGemma: vi.fn(),
}));
vi.mock("../evaluation/ruleSetStore.js", () => ({
  loadRuleSets: vi.fn(),
}));

import { callGemma } from "../extraction/gemmaClient.js";
import { ocrPdf } from "../extraction/ocr.js";
import { RuleSetSchema } from "../evaluation/schema.js";
import { loadRuleSets } from "../evaluation/ruleSetStore.js";
import { processReport } from "./processReport.js";

const mockedOcrPdf = vi.mocked(ocrPdf);
const mockedCallGemma = vi.mocked(callGemma);
const mockedLoadRuleSets = vi.mocked(loadRuleSets);

const FAKE_RULE_SET = RuleSetSchema.parse({
  version: "test-v1",
  effective_from: "2024-01-01",
  rules: [
    {
      id: "FAKE-TECH-REPORT-AGE",
      description: "Fake: technical report must not be older than 180 days as of the approval date",
      severity: "HIGH",
      effective_from: "2024-01-01",
      field: "technical_report_date",
      check: "max_age_days",
      params: { maxDays: 180, asOfField: "approval_date" },
      clause_ref: "FAKE-CLAUSE-H.I.1",
    },
  ],
});

// One JSON string standing in for "what Gemma would return" - every field
// our schema needs, with overrides for whatever a specific test cares about.
function fakeGemmaJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    property_type: "residential",
    property_sub_type: null,
    residential_building_type: null,
    city: null,
    state: null,
    site_condition: null,
    ownership_type: null,
    ownership_share_type: null,
    valuation_amount: null,
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
    technical_report_date: "2023-01-01",
    approval_date: "2024-06-01",
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

describe("processReport", () => {
  beforeEach(() => {
    mockedOcrPdf.mockReset();
    mockedCallGemma.mockReset();
    mockedLoadRuleSets.mockReset();
    mockedLoadRuleSets.mockReturnValue([FAKE_RULE_SET]);
    mockedOcrPdf.mockResolvedValue("fake ocr text, contents don't matter since Gemma is mocked too");
  });

  it("produces a NON_COMPLIANT verdict when a HIGH-severity rule fails", async () => {
    // technical_report_date is over a year before approval_date - well past the 180-day limit.
    mockedCallGemma.mockResolvedValue(fakeGemmaJson());

    const result = await processReport("fake/path.pdf", new Date("2024-07-01"));

    expect(result.verdict).toBe("NON_COMPLIANT");
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      rule_id: "FAKE-TECH-REPORT-AGE",
      status: "FAIL",
      severity: "HIGH",
      clause_ref: "FAKE-CLAUSE-H.I.1",
    });
    expect(result.extracted.property_type).toBe("residential");
  });

  it("produces a COMPLIANT verdict when the rule passes", async () => {
    mockedCallGemma.mockResolvedValue(
      fakeGemmaJson({ technical_report_date: "2024-05-01", approval_date: "2024-06-01" }),
    );

    const result = await processReport("fake/path.pdf", new Date("2024-07-01"));

    expect(result.verdict).toBe("COMPLIANT");
    expect(result.results[0]?.status).toBe("PASS");
  });

  it("picks the rule set that applies on the given report date", async () => {
    mockedCallGemma.mockResolvedValue(fakeGemmaJson());

    await processReport("fake/path.pdf", new Date("2024-07-01"));

    expect(mockedLoadRuleSets).toHaveBeenCalledTimes(1);
  });
});
