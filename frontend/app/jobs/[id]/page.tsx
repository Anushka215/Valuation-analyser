"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { PassedSection } from "@/components/PassedSection";
import { StatusBadge } from "@/components/StatusBadge";
import { SummaryItemRow } from "@/components/SummaryItemRow";
import type { JobStatusResponse } from "@/lib/api";
import { getJobStatus } from "@/lib/api";

const POLL_INTERVAL_MS = 2000;

export default function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [job, setJob] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // `poll` references `intervalId` only inside its `await` continuation,
    // which always runs after the `const` below has been assigned - so the
    // declaration order here is safe despite looking circular.
    async function poll() {
      try {
        const data = await getJobStatus(id);
        setJob(data);
        if (data.status === "DONE" || data.status === "FAILED") {
          clearInterval(intervalId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to check job status.");
        clearInterval(intervalId);
      }
    }

    poll(); // check immediately, then keep polling
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [id]);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Compliance report</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          Check another report
        </Link>
      </div>

      <p className="mb-4 font-mono text-xs text-gray-400">job_id: {id}</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!job && !error && <p className="text-gray-600">Loading job status...</p>}

      {job && (job.status === "PENDING" || job.status === "PROCESSING") && (
        <div className="rounded border border-gray-200 p-6 text-center">
          <StatusBadge label={job.status} />
          <p className="mt-3 text-gray-600">
            {job.status === "PENDING"
              ? "Waiting for a worker to pick this job up..."
              : "Running OCR, extracting fields, and evaluating rules..."}
          </p>
          <p className="mt-1 text-xs text-gray-400">Checking again every {POLL_INTERVAL_MS / 1000} seconds.</p>
        </div>
      )}

      {job && job.status === "FAILED" && (
        <div className="rounded border border-red-300 bg-red-50 p-6">
          <StatusBadge label="FAILED" />
          <p className="mt-3 text-red-800">{job.error ?? "Processing failed with no error message."}</p>
        </div>
      )}

      {job && job.status === "DONE" && job.summary && (
        <div>
          <div className="mb-2 rounded border border-gray-200 p-6 text-center">
            <p className="mb-2 text-sm text-gray-500">Collateral decision</p>
            <StatusBadge label={job.summary.decision} />
            <p className="mt-3 text-sm text-gray-700">{job.summary.reason}</p>
          </div>

          <p className="mb-6 text-center text-xs text-gray-400">
            {job.summary.counts.blocking} blocking, {job.summary.counts.needsReview} need review,{" "}
            {job.summary.counts.passed} passed, {job.summary.counts.notApplicable} not applicable
          </p>

          {job.summary.blockingIssues.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-lg font-semibold text-red-800">
                Blocking issues ({job.summary.blockingIssues.length})
              </h2>
              <div className="flex flex-col gap-2">
                {job.summary.blockingIssues.map((item, index) => (
                  <SummaryItemRow key={`blocking-${index}`} item={item} />
                ))}
              </div>
            </section>
          )}

          {job.summary.needsReview.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-lg font-semibold text-yellow-800">
                Needs review before approval ({job.summary.needsReview.length})
              </h2>
              <div className="flex flex-col gap-2">
                {job.summary.needsReview.map((item, index) => (
                  <SummaryItemRow key={`review-${index}`} item={item} />
                ))}
              </div>
            </section>
          )}

          <PassedSection passed={job.summary.passed} notApplicable={job.summary.notApplicable} />
        </div>
      )}
    </main>
  );
}
