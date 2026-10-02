import "dotenv/config";
import { logger } from "../shared/logger.js";
import { startWorker } from "./worker.js";

// Entry point for the worker process (`npm run worker`). Runs separately
// from the API server - job/result storage lives in Postgres now, so the
// two processes don't need to share memory.
startWorker();
logger.info("worker started, waiting for report jobs");
