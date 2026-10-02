/**
 * Best-effort, regex-based extraction for a handful of critical fields —
 * used only when the LLM has failed repeatedly (see extractFields.ts).
 * This is deliberately simple and not very smart: it's a last resort, and
 * every field it returns gets flagged for human review anyway.
 */
export function extractCriticalFieldsWithRegex(ocrText: string): Partial<Record<string, unknown>> {
  const fields: Partial<Record<string, unknown>> = {};

  const date = findFirstDate(ocrText);
  if (date) {
    fields.technical_report_date = date;
  }

  const amount = findFirstAmount(ocrText);
  if (amount !== undefined) {
    fields.valuation_amount = amount;
  }

  return fields;
}

// Looks for a date written like 12/05/2024 or 12-05-2024.
function findFirstDate(text: string): string | undefined {
  const match = text.match(/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/);
  return match?.[0];
}

// Looks for a rupee amount written like "Rs. 50,00,000" or "INR 5000000".
function findFirstAmount(text: string): number | undefined {
  const match = text.match(/(?:Rs\.?|INR)\s*([\d,]+(?:\.\d+)?)/i);
  if (!match || !match[1]) {
    return undefined;
  }
  const digitsOnly = match[1].replace(/,/g, "");
  const amount = Number(digitsOnly);
  return Number.isNaN(amount) ? undefined : amount;
}
