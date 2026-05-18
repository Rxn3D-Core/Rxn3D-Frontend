"use client";

import { Check, ChevronDown } from "lucide-react";

interface ExtractionsDoneAcknowledgementProps {
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  caseSubmitted?: boolean;
}

/**
 * Compact Done control for multi-extraction removable cards.
 * Done → green check; toggling check off hides grade / shade / impression again.
 */
export function ExtractionsDoneAcknowledgement({
  acknowledged,
  onAcknowledgedChange,
  caseSubmitted = false,
}: ExtractionsDoneAcknowledgementProps) {
  if (caseSubmitted) return null;

  if (acknowledged) {
    return (
      <button
        type="button"
        onClick={() => onAcknowledgedChange(false)}
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-[#f0fdf4] transition-colors"
        title="Extractions confirmed — click to edit"
        aria-label="Extractions confirmed — click to edit"
      >
        <Check size={22} className="text-[#34C759]" strokeWidth={2.5} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onAcknowledgedChange(true)}
      className="px-3 py-1 rounded-[6px] font-['Verdana'] font-bold text-[13px] text-white bg-[#1162A8] hover:bg-[#0d4d85] transition-colors shadow-sm"
    >
      Done
    </button>
  );
}

interface AccordionHeaderActionsProps {
  isExpanded: boolean;
  caseSubmitted?: boolean;
  showExtractionsDone?: boolean;
  extractionsAcknowledged?: boolean;
  onExtractionsAcknowledgedChange?: (value: boolean) => void;
}

/** Top-right header: optional extractions Done/check, then expand chevron. */
export function AccordionHeaderActions({
  isExpanded,
  caseSubmitted = false,
  showExtractionsDone = false,
  extractionsAcknowledged = false,
  onExtractionsAcknowledgedChange,
}: AccordionHeaderActionsProps) {
  return (
    <div
      className="absolute top-3 right-2 z-10 flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      {showExtractionsDone && onExtractionsAcknowledgedChange && (
        <ExtractionsDoneAcknowledgement
          acknowledged={extractionsAcknowledged}
          onAcknowledgedChange={onExtractionsAcknowledgedChange}
          caseSubmitted={caseSubmitted}
        />
      )}
      <ChevronDown
        size={21.6}
        className={`text-black transition-transform ${isExpanded ? "rotate-180" : ""}`}
      />
    </div>
  );
}
