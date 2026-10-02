import type { ComplianceSummaryItem } from "@/lib/api";

// One line of the compliance summary: the plain-English sentence, plus
// the provenance (clause + field/value) a reviewer needs to double-check
// the call - the same traceability the raw rule dump had, just reworded.
export function SummaryItemRow({ item, dimmed }: { item: ComplianceSummaryItem; dimmed?: boolean }) {
  return (
    <div className={`rounded border border-gray-200 p-3 ${dimmed ? "opacity-60" : ""}`}>
      <p className="text-sm text-gray-900">{item.sentence}</p>
      <p className="mt-1 font-mono text-xs text-gray-500">
        clause {item.clause_ref} — {item.field}: {JSON.stringify(item.actual_value)}
      </p>
    </div>
  );
}
