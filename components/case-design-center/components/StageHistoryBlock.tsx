"use client";

import type { NewStageEligibilityStageRef } from "@/lib/api/slip-new-stage-eligibility";

export function StageHistoryBlock({
  history,
  className = "",
}: {
  history: NewStageEligibilityStageRef[];
  className?: string;
}) {
  if (!history.length) return null;

  return (
    <div
      className={`rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 ${className}`}
    >
      <p className="text-xs font-semibold text-[#4C4D55]">Stage history</p>
      <ul className="mt-1.5 space-y-1 text-xs text-[#64748B]">
        {history.map((h, idx) => (
          <li key={`${h.slip_id}-${h.stage_id}-${idx}`}>
            <span className="text-[#334155]">{h.slip_number}</span>
            {" — "}
            {h.stage_name}
            {h.completed_on ? ` (${h.completed_on})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
