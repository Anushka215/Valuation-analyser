import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import type { JobStatus } from "../generated/prisma/client.js";
import type { ProcessReportResult } from "../pipeline/processReport.js";

// One shared PrismaClient for the whole process - creating a new one per
// request would open far too many database connections.
const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
const prisma = new PrismaClient({ adapter });

export type { JobStatus };

export interface Job {
  status: JobStatus;
  error?: string;
  reportDate: Date;
}

export interface NewJob {
  status: JobStatus;
  fileHash: string;
  reportDate: Date;
}

// Only what updateJobStatus actually writes - separate from Job (the read
// shape) since an in-progress status update never touches reportDate.
export interface JobStatusUpdate {
  status: JobStatus;
  error?: string;
}

// Creates a brand-new job row. Called once, when an upload first comes in
// (file_hash and report_date are only known at that point).
export async function createJob(jobId: string, job: NewJob): Promise<void> {
  await prisma.job.create({
    data: {
      id: jobId,
      status: job.status,
      file_hash: job.fileHash,
      report_date: job.reportDate,
    },
  });
}

// Updates an existing job's status as it moves through the pipeline
// (PENDING -> PROCESSING -> DONE/FAILED).
export async function updateJobStatus(jobId: string, job: JobStatusUpdate): Promise<void> {
  const data: { status: JobStatus; error?: string } = { status: job.status };
  if (job.error !== undefined) {
    data.error = job.error;
  }

  await prisma.job.update({ where: { id: jobId }, data });
}

export async function getJob(jobId: string): Promise<Job | undefined> {
  const row = await prisma.job.findUnique({ where: { id: jobId } });
  if (!row) {
    return undefined;
  }

  const job: Job = { status: row.status, reportDate: row.report_date };
  if (row.error !== null) {
    job.error = row.error;
  }
  return job;
}

// Looks up an existing job by file hash, for idempotency: the same PDF
// uploaded twice should reuse the first job instead of reprocessing it.
export async function findJobByFileHash(fileHash: string): Promise<{ jobId: string } | undefined> {
  const row = await prisma.job.findFirst({ where: { file_hash: fileHash } });
  if (!row) {
    return undefined;
  }
  return { jobId: row.id };
}

export async function saveResult(jobId: string, result: ProcessReportResult): Promise<void> {
  await prisma.result.create({
    data: {
      job_id: jobId,
      verdict: result.verdict,
      // Prisma's Json type doesn't know the shape of our data ahead of
      // time, so we go through `unknown` rather than pretend it matches.
      results_json: result.results as unknown as object,
      extracted_json: result.extracted as unknown as object,
    },
  });
}

export async function getResult(jobId: string): Promise<ProcessReportResult | undefined> {
  const row = await prisma.result.findUnique({ where: { job_id: jobId } });
  if (!row) {
    return undefined;
  }

  return {
    verdict: row.verdict as ProcessReportResult["verdict"],
    results: row.results_json as unknown as ProcessReportResult["results"],
    extracted: row.extracted_json as unknown as ProcessReportResult["extracted"],
  };
}
