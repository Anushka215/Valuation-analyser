import { processJob } from "./processJob.js";
import type { ReportJobData } from "./processJob.js";

/**
 * A tiny stand-in for BullMQ, for local dev with no Redis running. Jobs
 * go on a plain in-memory array and are processed one at a time, in the
 * background, inside this same process - so there's no separate worker
 * to start either.
 */
export function createMemoryQueue(): { add: (data: ReportJobData) => Promise<void> } {
  const pending: ReportJobData[] = [];
  let isProcessing = false;

  async function runNext(): Promise<void> {
    if (isProcessing) {
      return;
    }

    const next = pending.shift();
    if (!next) {
      return;
    }

    isProcessing = true;
    await processJob(next);
    isProcessing = false;
    await runNext();
  }

  return {
    async add(data: ReportJobData): Promise<void> {
      pending.push(data);
      void runNext();
    },
  };
}
