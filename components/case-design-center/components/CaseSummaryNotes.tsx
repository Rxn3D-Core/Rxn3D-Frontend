"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ClipboardList,
  ClipboardCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Maximize2,
} from "lucide-react";
import type { NotesProps } from "../types";
import { buildCaseSummaryText, buildNoteGroups } from "../utils/caseNoteBuilder";

export function CaseSummaryNotes(props: NotesProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [manualOverride, setManualOverride] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const dynamicNoteText = useMemo(() => {
    const groups = buildNoteGroups(props);
    return buildCaseSummaryText(groups);
  }, [
    props.maxillaryRetentionTypes,
    props.mandibularRetentionTypes,
    props.maxillaryTeeth,
    props.mandibularTeeth,
    props.selectedStages,
    props.right1Brand,
    props.right1Platform,
    props.right2Brand,
    props.right2Platform,
    props.right1Inclusion,
    props.right2Inclusion,
    props.fieldValues,
    props.toothProducts,
    props.toothProductCardMap,
    props.selectedShades,
    props.selectedImpressions,
    props.maxillaryToothExtractionMap,
    props.mandibularToothExtractionMap,
    props.maxillaryImplantDetailByTooth,
    props.mandibularImplantDetailByTooth,
    props.addedProducts,
  ]);

  useEffect(() => {
    setManualOverride(null);
  }, [props.addedProducts?.length]);

  const noteText = manualOverride ?? dynamicNoteText;

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#F9FAFB] border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#6B7280]" />
            <span className="text-sm font-semibold text-[#111827]">Case Summary Notes</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="p-1.5 rounded-md hover:bg-[#E5E7EB] text-[#6B7280]"
              aria-label={expanded ? "Collapse editor" : "Expand editor"}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="p-1.5 rounded-md hover:bg-[#E5E7EB] text-[#6B7280]"
              aria-label={collapsed ? "Expand notes" : "Collapse notes"}
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!collapsed && (
          <div className={`p-4 ${expanded ? "min-h-[280px]" : ""}`}>
            <textarea
              value={noteText}
              onChange={(e) => setManualOverride(e.target.value)}
              className={`w-full resize-y rounded-lg border border-[#D1D5DB] p-3 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 ${
                expanded ? "min-h-[240px]" : "min-h-[120px]"
              }`}
              placeholder="Notes will appear here as you complete product fields…"
            />
            {noteText && !manualOverride && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-[#059669]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Auto-generated from your selections</span>
                <ClipboardCheck className="w-3.5 h-3.5 ml-1 text-[#6B7280]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
