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
  return null;
}

interface AccordionHeaderActionsProps {
  isExpanded: boolean;
  caseSubmitted?: boolean;
  showExtractionsDone?: boolean;
  extractionsAcknowledged?: boolean;
  onExtractionsAcknowledgedChange?: (value: boolean) => void;
  /** Fixed restoration: Done after chart retention selection. */
  showRetentionDone?: boolean;
  retentionDoneAcknowledged?: boolean;
  onRetentionDoneChange?: (value: boolean) => void;
  /** Expand/collapse accordion and activate this product for tooth-status selection. */
  onToggleExpand?: () => void;
  /** When false, chevron cannot switch accordion focus. */
  expandEnabled?: boolean;
}

/** Top-right header: extractions Done/check (tooth selection complete), then expand chevron. */
export function AccordionHeaderActions({
  isExpanded,
  caseSubmitted = false,
  showExtractionsDone = false,
  extractionsAcknowledged = false,
  onExtractionsAcknowledgedChange,
  showRetentionDone = false,
  retentionDoneAcknowledged = false,
  onRetentionDoneChange,
  onToggleExpand,
  expandEnabled = true,
}: AccordionHeaderActionsProps) {
  return (
    <div className="absolute top-3 right-2 z-10 flex items-center gap-2">
      {showExtractionsDone && onExtractionsAcknowledgedChange && (
        <div onClick={(e) => e.stopPropagation()}>
          <ExtractionsDoneAcknowledgement
            acknowledged={extractionsAcknowledged}
            onAcknowledgedChange={onExtractionsAcknowledgedChange}
            caseSubmitted={caseSubmitted}
          />
        </div>
      )}
      {showRetentionDone && onRetentionDoneChange && (
        <div onClick={(e) => e.stopPropagation()}>
          <ExtractionsDoneAcknowledgement
            acknowledged={retentionDoneAcknowledged}
            onAcknowledgedChange={onRetentionDoneChange}
            caseSubmitted={caseSubmitted}
          />
        </div>
      )}
      <button
        type="button"
        disabled={!expandEnabled}
        onClick={(e) => {
          e.stopPropagation();
          if (expandEnabled) onToggleExpand?.();
        }}
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
          expandEnabled ? "hover:bg-gray-100" : "cursor-not-allowed opacity-40"
        }`}
        title={isExpanded ? "Collapse product" : "Expand product"}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Collapse product" : "Expand product"}
      >
        <ChevronDown
          size={21.6}
          className={`text-black transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
