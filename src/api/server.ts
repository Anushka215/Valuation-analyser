import "dotenv/config";
import crypto from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import cors from "cors";
import express from "express";
import multer from "multer";
import { createJob, findJobByFileHash, getJob, getResult } from "../reporting/jobStore.js";
import { buildComplianceSummary } from "../reporting/complianceSummary.js";
import { addReportJob } from "../queue/queue.js";
import { logger, loggerForJob } from "../shared/logger.js";
import { loadRuleSets } from "../evaluation/ruleSetStore.js";
import { selectRuleSet } from "../evaluation/versioning.js";

const UPLOADS_DIR = "uploads";
mkdirSync(UPLOADS_DIR, { recursive: true });
const upload = multer({ dest: UPLOADS_DIR });

export const app = express();

// The frontend runs on a different port (e.g. localhost:3001), which
// browsers treat as a different origin - without this, they block every
// request with no useful error beyond "failed to fetch". This app has no
// auth and is meant for local/demo use, so any origin is allowed.
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Hashes a file's contents so the same PDF uploaded twice can be recognized.
function hashFile(filePath: string): string {
  const contents = readFileSync(filePath);
  return crypto.createHash("sha256").update(contents).digest("hex");
}

// Accepts a PDF upload, queues it for processing, and returns immediately.
// The actual OCR + LLM + rules work happens later, in the worker.
app.post("/reports", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "a PDF file is required (form field name: file)" });
    return;
  }

  const reportDate = req.body.reportDate;
  if (!reportDate) {
    res.status(400).json({ error: "reportDate is required" });
    return;
  }

  const fileHash = hashFile(req.file.path);

  // Same file uploaded before? Reuse that job instead of redoing OCR + LLM.
  const existingJob = await findJobByFileHash(fileHash);
  if (existingJob) {
    const job = await getJob(existingJob.jobId);
    loggerForJob(existingJob.jobId).info("duplicate upload, returning existing job");
    res.status(200).json({ job_id: existingJob.jobId, status: job?.status ?? "PENDING" });
    return;
  }

  const jobId = crypto.randomUUID();
  await createJob(jobId, { status: "PENDING", fileHash, reportDate: new Date(reportDate) });

  await addReportJob({ jobId, filePath: req.file.path, reportDate });

  loggerForJob(jobId).info("job PENDING, queued for processing");
  res.status(202).json({ job_id: jobId, status: "PENDING" });
});

// Lets a client poll for a job's status, and includes the result once done.
app.get("/jobs/:id", async (req, res) => {
  const jobId = req.params.id;
  const job = await getJob(jobId);

  if (!job) {
    res.status(404).json({ error: "job not found" });
    return;
  }

  if (job.status === "DONE") {
    const result = await getResult(jobId);
    // Rebuild the plain-English summary from the same stored rule results -
    // this is presentation only, the engine's own results never change.
    const ruleSets = loadRuleSets();
    const ruleSet = selectRuleSet(ruleSets, job.reportDate);
    const summary = result ? buildComplianceSummary(result.results, ruleSet) : undefined;
    res.json({ job_id: jobId, status: job.status, result, summary });
    return;
  }

  res.json({ job_id: jobId, status: job.status, error: job.error });
});

// Returns a finished report's full stored result.
app.get("/reports/:id", async (req, res) => {
  const result = await getResult(req.params.id);

  if (!result) {
    res.status(404).json({ error: "report not found" });
    return;
  }

  res.json(result);
});

const port = process.env["PORT"] ?? 3000;

// Only start listening when this file is run directly - not when a test
// imports `app` to exercise it with supertest. The worker is its own
// process now (run separately via `npm run worker`) since job/result
// storage moved to Postgres - the API and worker no longer need to share
// memory the way they did with the old in-memory store.
const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  app.listen(port, () => {
    logger.info({ port }, "server listening");
  });
}
