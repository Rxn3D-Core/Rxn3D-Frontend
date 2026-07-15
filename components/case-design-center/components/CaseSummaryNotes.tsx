"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
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
    props.selectedShadeGuide,
  ]);

  useEffect(() => {
    setManualOverride(null);
  }, [props.addedProducts?.length]);

  const noteText = manualOverride ?? dynamicNoteText;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    props.onNotesChange?.(noteText);
  }, [noteText, props.onNotesChange]);

  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el || expanded) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 56)}px`;
  }, [expanded]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (expanded) {
      el.style.height = "";
    } else {
      syncTextareaHeight();
    }
  }, [noteText, expanded, syncTextareaHeight]);

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
    >
      <div className="rounded-xl pt-3 overflow-hidden">
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 hover:bg-[#F9FAFB] transition-colors"
            aria-label="Expand notes"
          >
            <span className="text-sm font-semibold text-[#111827]">Case Summary Notes</span>
            <ChevronDown className="w-4 h-4 text-[#6B7280]" />
          </button>
        ) : (
          <div className="relative">
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
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
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-md hover:bg-[#E5E7EB] text-[#6B7280]"
                aria-label="Collapse notes"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <div
                className="pointer-events-none absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 bg-white px-2"
                aria-hidden
              >
                <span className="text-sm font-semibold text-[#111827] whitespace-nowrap">
                  Case Summary Notes
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={noteText}
                rows={expanded ? 10 : 2}
                onChange={(e) => {
                  setManualOverride(e.target.value);
                  if (!expanded) {
                    requestAnimationFrame(syncTextareaHeight);
                  }
                }}
                className={`w-full rounded-lg border border-[#D1D5DB] px-3 pt-4 pb-3 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 overflow-hidden ${
                  expanded ? "min-h-[200px] resize-y" : "resize-none"
                }`}
                placeholder="Notes will appear here as you complete product fields…"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
