// One small colored badge, reused for rule status, severity, job status,
// and the overall verdict - anywhere we show a short all-caps label.
const COLOR_BY_LABEL: Record<string, string> = {
  // rule / verdict outcomes
  PASS: "bg-green-100 text-green-800",
  COMPLIANT: "bg-green-100 text-green-800",
  FAIL: "bg-red-100 text-red-800",
  NON_COMPLIANT: "bg-red-100 text-red-800",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-800",
  NOT_APPLICABLE: "bg-gray-100 text-gray-500",

  // job status
  PENDING: "bg-gray-100 text-gray-700",
  PROCESSING: "bg-blue-100 text-blue-800",
  DONE: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",

  // severity
  HIGH: "bg-red-100 text-red-800",
  MEDIUM: "bg-yellow-100 text-yellow-800",
  LOW: "bg-gray-100 text-gray-700",

  // top-level collateral decision
  "NOT ACCEPTABLE": "bg-red-100 text-red-800",
  "ACCEPTABLE WITH REVIEW": "bg-yellow-100 text-yellow-800",
  ACCEPTABLE: "bg-green-100 text-green-800",
};

export function StatusBadge({ label }: { label: string }) {
  const colorClasses = COLOR_BY_LABEL[label] ?? "bg-gray-100 text-gray-700";

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${colorClasses}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}
