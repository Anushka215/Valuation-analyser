import { extractFields } from "../extraction/extractFields.js";
import { ocrPdf } from "../extraction/ocr.js";
import type { ExtractedReport } from "../extraction/schema.js";
import { evaluate } from "../evaluation/engine.js";
import type { RuleResult, Verdict } from "../evaluation/engine.js";
import { loadRuleSets } from "../evaluation/ruleSetStore.js";
import { selectRuleSet } from "../evaluation/versioning.js";
import { logger, loggerForJob } from "../shared/logger.js";

export interface ProcessReportResult {
  extracted: ExtractedReport;
  verdict: Verdict;
  results: RuleResult[];
}

/**
 * The whole pipeline for one report: OCR + LLM extraction, pick the rule
 * set that applies on the report's date, then run the rules engine.
 * This is just glue - each step is already built and tested on its own.
 *
 * `jobId` is optional so existing callers (like tests) don't need to
 * change, but the worker always passes it - a shared job_id on every log
 * line is what lets you grep one report's whole story (upload through
 * OCR, extraction, and evaluation) out of a pile of concurrent jobs.
 */
export async function processReport(
  filePath: string,
  reportDate: Date,
  jobId?: string,
): Promise<ProcessReportResult> {
  const log = jobId ? loggerForJob(jobId) : logger;

  log.info("OCR start");
  const ocrText = await ocrPdf(filePath);
  log.info("OCR done");
  // TEMP DEBUG - remove once the null-field extraction issue is diagnosed
  console.log("=== RAW OCR TEXT ===\n" + ocrText + "\n=== END RAW OCR TEXT ===");

  log.info("EXTRACT start");
  const extracted = await extractFields(ocrText);
  log.info("EXTRACT done");

  log.info("EVALUATE start");
  const ruleSets = loadRuleSets();
  const ruleSet = selectRuleSet(ruleSets, reportDate);
  const { verdict, results } = evaluate(extracted, ruleSet);
  log.info({ verdict }, "EVALUATE done");

  return { extracted, verdict, results };
}
