// TEST-ONLY FAKE OCR-STYLE TEXT — not a real report.
import { describe, expect, it } from "vitest";
import { extractCriticalFieldsWithRegex } from "./fallbackParser.js";

describe("extractCriticalFieldsWithRegex", () => {
  it("finds a date written with slashes", () => {
    const text = "Technical Report Date: 12/05/2024\nSome other text.";
    const fields = extractCriticalFieldsWithRegex(text);
    expect(fields.technical_report_date).toBe("12/05/2024");
  });

  it("finds a date written with dashes", () => {
    const text = "Report dated 05-12-2024 was submitted.";
    const fields = extractCriticalFieldsWithRegex(text);
    expect(fields.technical_report_date).toBe("05-12-2024");
  });

  it("finds a rupee amount with the Rs. prefix", () => {
    const text = "Valuation Amount: Rs. 50,00,000 as assessed.";
    const fields = extractCriticalFieldsWithRegex(text);
    expect(fields.valuation_amount).toBe(5000000);
  });

  it("finds a rupee amount with the INR prefix", () => {
    const text = "Total value INR 1234567 approximately.";
    const fields = extractCriticalFieldsWithRegex(text);
    expect(fields.valuation_amount).toBe(1234567);
  });

  it("returns an empty object when nothing matches", () => {
    const fields = extractCriticalFieldsWithRegex("This text has no dates or amounts in it.");
    expect(fields).toEqual({});
  });
});
