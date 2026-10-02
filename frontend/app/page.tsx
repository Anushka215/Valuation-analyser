"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadReport } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [reportDate, setReportDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Please choose a PDF file.");
      return;
    }
    if (!reportDate) {
      setError("Please choose a report date.");
      return;
    }

    setSubmitting(true);
    try {
      const { job_id } = await uploadReport(file, reportDate);
      router.push(`/jobs/${job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-1 text-2xl font-semibold">Property Valuation Compliance Checker</h1>
      <p className="mb-6 text-gray-600">
        Upload a scanned valuation report to check it against bank guideline rules.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="file">
            Valuation report (PDF)
          </label>
          <input
            id="file"
            type="file"
            accept="application/pdf"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="reportDate">
            Report date
          </label>
          <input
            id="reportDate"
            type="date"
            value={reportDate}
            onChange={(event) => setReportDate(event.target.value)}
            className="block w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Uploading..." : "Check compliance"}
        </button>
      </form>
    </main>
  );
}
