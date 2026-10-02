import { processReport } from "../pipeline/processReport.js";
import { saveResult, updateJobStatus } from "../reporting/jobStore.js";
import { loggerForJob } from "../shared/logger.js";

export interface ReportJobData {
  jobId: string;
  filePath: string;
  reportDate: string; // ISO date string - job data must be JSON-serializable
}

/**
 * Does the actual OCR -> extract -> evaluate work for one report, and
 * records the outcome. Shared by both queue drivers (the BullMQ/Redis
 * worker, and the in-process memory queue) so the real work only lives
 * in one place.
 */
export async function processJob(data: ReportJobData): Promise<void> {
  const { jobId, filePath, reportDate } = data;
  const log = loggerForJob(jobId);

  log.info("job PROCESSING");
  await updateJobStatus(jobId, { status: "PROCESSING" });

  try {
    const result = await processReport(filePath, new Date(reportDate), jobId);
    await saveResult(jobId, result);
    await updateJobStatus(jobId, { status: "DONE" });
    log.info({ verdict: result.verdict }, "job DONE");
  } catch (error) {
    // Never let a single bad job crash the caller - record the failure
    // and move on to the next job.
    const message = error instanceof Error ? error.message : String(error);
    await updateJobStatus(jobId, { status: "FAILED", error: message });
    log.error({ err: error }, "job FAILED");
  }
}
