import { Worker } from "bullmq";
import { processJob } from "./processJob.js";
import { connection, REPORTS_QUEUE_NAME } from "./queue.js";
import type { ReportJobData } from "./processJob.js";

/**
 * Starts the worker that actually processes report jobs. Only used with
 * QUEUE_DRIVER=redis - with the default in-memory driver, jobs are
 * processed inside the API process itself, so this never gets called.
 * Creating the Worker (and its Redis connection) only happens when this
 * function is called - never just from importing this file - so tests can
 * import other things from this module without needing a real Redis running.
 */
export function startWorker(): Worker {
  const worker = new Worker<ReportJobData>(REPORTS_QUEUE_NAME, (job) => processJob(job.data), { connection });

  // A connection problem shouldn't crash the whole worker process.
  worker.on("error", (error) => {
    console.error("worker error:", error.message);
  });

  return worker;
}
