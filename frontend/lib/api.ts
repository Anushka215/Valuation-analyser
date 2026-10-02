// Thin wrappers around the backend API. Plain fetch, no client library.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export interface UploadResponse {
  job_id: string;
  status: string;
}

export async function uploadReport(file: File, reportDate: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("reportDate", reportDate);

  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload failed (status ${response.status})`);
  }

  return response.json();
}

// One rule's result, exactly as the engine produces it - status, severity,
// a plain message, and the provenance (clause_ref + field + actual_value).
export interface RuleResult {
  rule_id: string;
  status: "PASS" | "FAIL" | "NEEDS_REVIEW" | "NOT_APPLICABLE";
  severity: "HIGH" | "MEDIUM" | "LOW";
  message: string;
  clause_ref: string;
  field: string;
  actual_value: unknown;
}

export interface ReportResult {
  verdict: "COMPLIANT" | "NON_COMPLIANT" | "NEEDS_REVIEW";
  results: RuleResult[];
  extracted: Record<string, unknown>;
}

// One rule result reworded as a plain sentence for a human reviewer,
// still carrying the same provenance (clause_ref + field + actual_value).
export interface ComplianceSummaryItem {
  clause_ref: string;
  sentence: string;
  field: string;
  actual_value: unknown;
}

export interface ComplianceSummary {
  decision: "NOT ACCEPTABLE" | "ACCEPTABLE WITH REVIEW" | "ACCEPTABLE";
  reason: string;
  blockingIssues: ComplianceSummaryItem[];
  needsReview: ComplianceSummaryItem[];
  passed: ComplianceSummaryItem[];
  notApplicable: ComplianceSummaryItem[];
  counts: { blocking: number; needsReview: number; passed: number; notApplicable: number };
}

export interface JobStatusResponse {
  job_id: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  error?: string;
  result?: ReportResult;
  summary?: ComplianceSummary;
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`Failed to check job status (status ${response.status})`);
  }

  return response.json();
}
