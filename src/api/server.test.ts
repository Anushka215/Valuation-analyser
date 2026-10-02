// TEST-ONLY FAKE FIXTURES — mocks the queue and the job store, so this
// test needs no real Redis or Postgres. server.ts doesn't import the
// worker at all anymore, so there's nothing worker-related to mock here.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../queue/queue.js", () => ({
  addReportJob: vi.fn().mockResolvedValue(undefined),
}));

const { fakeJobs, fakeResults, fakeJobIdsByHash } = vi.hoisted(() => ({
  fakeJobs: new Map<string, { status: string; error?: string }>(),
  fakeResults: new Map<string, unknown>(),
  fakeJobIdsByHash: new Map<string, string>(),
}));

// A tiny in-memory stand-in for the real (Prisma-backed) job store, just
// so the API's routing logic can be tested on its own.
vi.mock("../reporting/jobStore.js", () => ({
  createJob: vi.fn(async (jobId: string, job: { status: string; fileHash: string }) => {
    fakeJobs.set(jobId, { status: job.status });
    fakeJobIdsByHash.set(job.fileHash, jobId);
  }),
  getJob: vi.fn(async (jobId: string) => fakeJobs.get(jobId)),
  getResult: vi.fn(async (jobId: string) => fakeResults.get(jobId)),
  findJobByFileHash: vi.fn(async (fileHash: string) => {
    const jobId = fakeJobIdsByHash.get(fileHash);
    return jobId ? { jobId } : undefined;
  }),
}));

import request from "supertest";
import { app } from "./server.js";

function fakePdfUpload(agent: ReturnType<typeof request>) {
  return agent
    .post("/reports")
    .field("reportDate", "2024-01-01")
    .attach("file", Buffer.from("%PDF-1.4 fake pdf content"), "report.pdf");
}

beforeEach(() => {
  fakeJobs.clear();
  fakeResults.clear();
  fakeJobIdsByHash.clear();
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("POST /reports", () => {
  it("returns 202 with a job_id and PENDING status", async () => {
    const response = await fakePdfUpload(request(app));

    expect(response.status).toBe(202);
    expect(response.body.status).toBe("PENDING");
    expect(typeof response.body.job_id).toBe("string");
  });

  it("returns 400 when no file is attached", async () => {
    const response = await request(app).post("/reports").field("reportDate", "2024-01-01");
    expect(response.status).toBe(400);
  });

  it("returns 400 when reportDate is missing", async () => {
    const response = await request(app)
      .post("/reports")
      .attach("file", Buffer.from("%PDF-1.4 fake pdf content"), "report.pdf");
    expect(response.status).toBe(400);
  });
});

describe("POST /reports idempotency", () => {
  it("returns the same job_id when the same file is uploaded twice", async () => {
    const identicalFile = Buffer.from("%PDF-1.4 identical fake pdf content");

    const firstResponse = await request(app)
      .post("/reports")
      .field("reportDate", "2024-01-01")
      .attach("file", identicalFile, "report.pdf");

    const secondResponse = await request(app)
      .post("/reports")
      .field("reportDate", "2024-01-01")
      .attach("file", identicalFile, "report-again.pdf");

    expect(firstResponse.status).toBe(202);
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.job_id).toBe(firstResponse.body.job_id);
  });

  it("creates a separate job when the file content is different", async () => {
    const firstResponse = await request(app)
      .post("/reports")
      .field("reportDate", "2024-01-01")
      .attach("file", Buffer.from("%PDF-1.4 file A"), "a.pdf");

    const secondResponse = await request(app)
      .post("/reports")
      .field("reportDate", "2024-01-01")
      .attach("file", Buffer.from("%PDF-1.4 file B"), "b.pdf");

    expect(secondResponse.status).toBe(202);
    expect(secondResponse.body.job_id).not.toBe(firstResponse.body.job_id);
  });
});

describe("GET /jobs/:id", () => {
  it("returns the job's status right after it's created", async () => {
    const createResponse = await fakePdfUpload(request(app));
    const jobId = createResponse.body.job_id;

    const statusResponse = await request(app).get(`/jobs/${jobId}`);

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.status).toBe("PENDING");
    expect(statusResponse.body.job_id).toBe(jobId);
  });

  it("returns 404 for a job id that doesn't exist", async () => {
    const response = await request(app).get("/jobs/does-not-exist");
    expect(response.status).toBe(404);
  });
});

describe("GET /reports/:id", () => {
  it("returns 404 for a report that isn't finished (or doesn't exist)", async () => {
    const createResponse = await fakePdfUpload(request(app));
    const jobId = createResponse.body.job_id;

    // The job is only PENDING - processing never actually runs in this
    // test - so no result has been stored yet.
    const response = await request(app).get(`/reports/${jobId}`);

    expect(response.status).toBe(404);
  });
});
