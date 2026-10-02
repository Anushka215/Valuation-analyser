import { Queue } from "bullmq";
import { createMemoryQueue } from "./memoryQueue.js";
import type { ReportJobData } from "./processJob.js";

export type { ReportJobData };

export const REPORTS_QUEUE_NAME = "reports";

// BullMQ needs a Redis connection to store and hand out jobs. This object
// is just config - no connection is opened until something actually uses
// it (the "redis" branch below, or worker.ts). Defaults to localhost for
// native/local dev; docker-compose.yml overrides REDIS_HOST to "redis"
// (the service name) since containers can't reach each other via 127.0.0.1.
export const connection = {
  host: process.env["REDIS_HOST"] ?? "127.0.0.1",
  port: Number(process.env["REDIS_PORT"] ?? 6379),
};

// Two ways to run this app locally, picked with QUEUE_DRIVER:
// - "redis": jobs go on a real BullMQ/Redis queue, and a separate
//   `npm run worker` process picks them up.
// - "memory" (the default): no Redis needed - jobs are processed right
//   here in the API process instead, one at a time, in the background.
const queueDriver = process.env["QUEUE_DRIVER"] ?? "memory";

export let addReportJob: (data: ReportJobData) => Promise<void>;

if (queueDriver === "redis") {
  const reportsQueue = new Queue(REPORTS_QUEUE_NAME, { connection });

  // Log instead of crashing the process if Redis has a hiccup.
  reportsQueue.on("error", (error) => {
    console.error("reports queue error:", error.message);
  });

  addReportJob = async (data) => {
    await reportsQueue.add("process-report", data);
  };
} else {
  const memoryQueue = createMemoryQueue();
  addReportJob = (data) => memoryQueue.add(data);
}
