// TEST-ONLY FAKE FIXTURES — mocks Prisma entirely, so this test needs no
// real Postgres running.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProcessReportResult } from "../pipeline/processReport.js";

const { mockPrismaClient } = vi.hoisted(() => ({
  mockPrismaClient: {
    job: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    result: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(),
}));

vi.mock("../generated/prisma/client.js", () => ({
  PrismaClient: vi.fn(() => mockPrismaClient),
}));

import { createJob, findJobByFileHash, getJob, getResult, saveResult, updateJobStatus } from "./jobStore.js";

function fakeResult(): ProcessReportResult {
  return {
    extracted: {} as ProcessReportResult["extracted"],
    verdict: "COMPLIANT",
    results: [],
  };
}

describe("jobStore", () => {
  beforeEach(() => {
    mockPrismaClient.job.create.mockReset();
    mockPrismaClient.job.update.mockReset();
    mockPrismaClient.job.findUnique.mockReset();
    mockPrismaClient.job.findFirst.mockReset();
    mockPrismaClient.result.create.mockReset();
    mockPrismaClient.result.findUnique.mockReset();
  });

  it("createJob inserts a row with all the fields the schema needs", async () => {
    mockPrismaClient.job.create.mockResolvedValue({});

    await createJob("job-1", { status: "PENDING", fileHash: "abc123", reportDate: new Date("2024-01-01") });

    expect(mockPrismaClient.job.create).toHaveBeenCalledWith({
      data: {
        id: "job-1",
        status: "PENDING",
        file_hash: "abc123",
        report_date: new Date("2024-01-01"),
      },
    });
  });

  it("updateJobStatus updates just the status and error", async () => {
    mockPrismaClient.job.update.mockResolvedValue({});

    await updateJobStatus("job-1", { status: "FAILED", error: "OCR timed out" });

    expect(mockPrismaClient.job.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "FAILED", error: "OCR timed out" },
    });
  });

  it("getJob returns undefined when no row is found", async () => {
    mockPrismaClient.job.findUnique.mockResolvedValue(null);

    expect(await getJob("missing-job")).toBeUndefined();
  });

  it("getJob maps a found row to the Job shape", async () => {
    mockPrismaClient.job.findUnique.mockResolvedValue({ status: "PROCESSING", error: null });

    expect(await getJob("job-1")).toEqual({ status: "PROCESSING" });
  });

  it("getJob includes the error message when the job failed", async () => {
    mockPrismaClient.job.findUnique.mockResolvedValue({ status: "FAILED", error: "boom" });

    expect(await getJob("job-1")).toEqual({ status: "FAILED", error: "boom" });
  });

  it("findJobByFileHash returns undefined when no job matches", async () => {
    mockPrismaClient.job.findFirst.mockResolvedValue(null);

    expect(await findJobByFileHash("no-such-hash")).toBeUndefined();
  });

  it("findJobByFileHash returns the matching job's id", async () => {
    mockPrismaClient.job.findFirst.mockResolvedValue({ id: "job-1" });

    expect(await findJobByFileHash("abc123")).toEqual({ jobId: "job-1" });
    expect(mockPrismaClient.job.findFirst).toHaveBeenCalledWith({ where: { file_hash: "abc123" } });
  });

  it("saveResult stores the verdict, results, and extracted data as JSON", async () => {
    mockPrismaClient.result.create.mockResolvedValue({});
    const result = fakeResult();

    await saveResult("job-1", result);

    expect(mockPrismaClient.result.create).toHaveBeenCalledWith({
      data: {
        job_id: "job-1",
        verdict: result.verdict,
        results_json: result.results,
        extracted_json: result.extracted,
      },
    });
  });

  it("getResult returns undefined when no result is stored yet", async () => {
    mockPrismaClient.result.findUnique.mockResolvedValue(null);

    expect(await getResult("no-result-job")).toBeUndefined();
  });

  it("getResult maps a stored row back to a ProcessReportResult", async () => {
    const result = fakeResult();
    mockPrismaClient.result.findUnique.mockResolvedValue({
      verdict: result.verdict,
      results_json: result.results,
      extracted_json: result.extracted,
    });

    expect(await getResult("job-1")).toEqual(result);
  });
});
