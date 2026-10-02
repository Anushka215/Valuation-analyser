"use client";

import { useState } from "react";
import type { ComplianceSummaryItem } from "@/lib/api";
import { SummaryItemRow } from "./SummaryItemRow";

// Passed / not-applicable rules aren't what a reviewer needs to act on, so
// they're collapsed to just their counts by default and only rendered in
// full when expanded.
export function PassedSection({
  passed,
  notApplicable,
}: {
  passed: ComplianceSummaryItem[];
  notApplicable: ComplianceSummaryItem[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="text-sm font-semibold text-gray-700 hover:underline"
      >
        {expanded ? "▾" : "▸"} Passed / Not applicable ({passed.length} passed, {notApplicable.length} not
        applicable)
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2">
          {passed.map((item, index) => (
            <SummaryItemRow key={`passed-${index}`} item={item} />
          ))}
          {notApplicable.map((item, index) => (
            <SummaryItemRow key={`na-${index}`} item={item} dimmed />
          ))}
        </div>
      )}
    </section>
  );
}
