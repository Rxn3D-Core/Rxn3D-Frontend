import { useEffect, useRef } from "react";
import type { ProductExtraction } from "../types";

interface ToothStatusBoxesProps {
  extractions: ProductExtraction[];
  selectedTeeth: number[];
  /** All tooth numbers for this arch (e.g. 1-16 for maxillary) */
  allArchTeeth: number[];
  /** toothNumber → extractionCode for teeth assigned to a non-TIM exclusive extraction */
  toothExtractionMap: Record<number, string>;
  /** Teeth assigned to the Clasp overlay (can coexist with other statuses) */
  claspTeeth: number[];
  /** Currently active extraction code (null = none selected) */
  activeExtractionCode: string | null;
  /** Called when a box is clicked to make it active */
  onActiveExtractionChange: (code: string | null) => void;
  onToothExtractionToggle: (toothNumber: number, extractionCode: string) => void;
  /** Called when "Teeth in mouth" box is clicked — selects all arch teeth */
  onSelectAllTeeth: (teeth: number[]) => void;
  /** Called whenever the required-validation error state changes */
  onRequiredValidationChange?: (hasValidation: boolean) => void;
  /** When true, enables removable-specific display: "All teeth selected" label and compact empty boxes */
  isRemovable?: boolean;
  /** When true, case has been submitted — hide blue active border on status boxes */
  submitted?: boolean;
}

/** Fallback color map keyed by extraction code — used only when API color is null */
const EXTRACTION_COLOR_MAP: Record<string, { bg: string; textClass: string }> = {
  TIM:   { bg: "#F3EBD7", textClass: "text-black" },           // Teeth in mouth
  MT:    { bg: "#D3D3D3", textClass: "text-black" },           // Missing teeth
  WEOD:  { bg: "#E92520", textClass: "text-white font-bold" }, // Will extract on delivery
  WED:   { bg: "#E92520", textClass: "text-white font-bold" }, // Will extract on delivery (legacy)
  FR:    { bg: "#A0F69A", textClass: "text-black" },           // Fix/Repair
  CLASP: { bg: "#FFD1F9", textClass: "text-black" },           // Clasp
  CTS:   { bg: "#0CE7C6", textClass: "text-black" },           // Custom tooth status
};

/** Fallback color map keyed by normalized extraction name — used only when API color and code map are null */
const EXTRACTION_NAME_COLOR_MAP: Record<string, { bg: string; textClass: string }> = {
  "teeth in mouth":           { bg: "#F3EBD7", textClass: "text-black" },
  "missing teeth":            { bg: "#D3D3D3", textClass: "text-black" },
  "will extract on delivery": { bg: "#E92520", textClass: "text-white font-bold" },
  "fix/repair":               { bg: "#A0F69A", textClass: "text-black" },
  "clasps":                   { bg: "#FFD1F9", textClass: "text-black" },
  "clasp":                    { bg: "#FFD1F9", textClass: "text-black" },
};

/** Determine text class from a hex background color (dark bg → white text) */
function textClassFromColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "text-black";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5 ? "text-white font-bold" : "text-black";
}

function resolveStyle(extraction: { code: string; name: string; color: string | null }): { bg: string; textClass: string } {
  // Priority: 1. API color → 2. code fallback → 3. name fallback → 4. default
  if (extraction.color && extraction.color.trim()) {
    const bg = extraction.color.trim();
    return { bg, textClass: textClassFromColor(bg) };
  }
  // 2. Match by code
  if (EXTRACTION_COLOR_MAP[extraction.code]) {
    return EXTRACTION_COLOR_MAP[extraction.code];
  }
  // 3. Match by normalized name
  const nameLower = (extraction.name ?? "").toLowerCase().trim();
  if (EXTRACTION_NAME_COLOR_MAP[nameLower]) {
    return EXTRACTION_NAME_COLOR_MAP[nameLower];
  }
  // 4. Default
  return { bg: "#F3EBD7", textClass: "text-black" };
}

/** Returns true if this extraction is the default box (is_default: "Yes", e.g. "Teeth in mouth") */
function isDefaultExtraction(extraction: ProductExtraction): boolean {
  return (
    extraction.is_default === "Yes" ||
    extraction.code === "TIM" ||
    (extraction.name ?? "").toLowerCase().trim() === "teeth in mouth"
  );
}

/** Returns true if this extraction is required (is_required: "Yes", e.g. "Missing teeth") */
function isRequiredExtraction(extraction: ProductExtraction): boolean {
  return (
    extraction.is_required === "Yes" ||
    extraction.code === "MT" ||
    (extraction.name ?? "").toLowerCase().trim() === "missing teeth"
  );
}

/** Returns true if this extraction is optional (is_optional: "Yes", e.g. "Will extract on delivery", "Clasps") */
function isOptionalExtraction(extraction: ProductExtraction): boolean {
  return extraction.is_optional === "Yes";
}

/** Returns true if this extraction is an overlay type (Clasp) — teeth can coexist with other statuses */
function isClaspExtraction(extraction: ProductExtraction): boolean {
  return (
    extraction.code === "CLASP" ||
    (extraction.name ?? "").toLowerCase().trim() === "clasps" ||
    (extraction.name ?? "").toLowerCase().trim() === "clasp"
  );
}

export function ToothStatusBoxes({
  extractions,
  selectedTeeth,
  allArchTeeth,
  toothExtractionMap,
  claspTeeth,
  activeExtractionCode,
  onActiveExtractionChange,
  onToothExtractionToggle,
  onSelectAllTeeth,
  onRequiredValidationChange,
  isRemovable = false,
  submitted = false,
}: ToothStatusBoxesProps) {
  const activeExtractions = extractions
    .filter((e) => e.status === "Active" && e.name != null && e.code != null)
    .sort((a, b) => a.sequence - b.sequence);

  // Auto-select all arch teeth when a is_default extraction first appears
  const hasAutoSelected = useRef(false);
  const hasDefault = activeExtractions.some((e) => isDefaultExtraction(e));
  useEffect(() => {
    if (hasDefault && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      onSelectAllTeeth(allArchTeeth);
    }
  }, [hasDefault, allArchTeeth, onSelectAllTeeth]);

  if (activeExtractions.length === 0) return null;

  // Teeth in the default (TIM) box = selected teeth NOT assigned to any extraction
  const defaultTeeth = selectedTeeth.filter((tn) => !toothExtractionMap[tn]);

  // Check if any optional extraction has teeth assigned (used for required validation)
  const anyOptionalHasTeeth = activeExtractions
    .filter((e) => isOptionalExtraction(e))
    .some((e) =>
      isClaspExtraction(e)
        ? claspTeeth.some((tn) => selectedTeeth.includes(tn))
        : selectedTeeth.some((tn) => toothExtractionMap[tn] === e.code)
    );

  // Compute whether any required box is showing a validation error
  const hasRequiredValidation = activeExtractions.some((e) => {
    if (!isRequiredExtraction(e)) return false;
    const isClasp = isClaspExtraction(e);
    const teethForBox = isClasp
      ? claspTeeth.filter((tn) => selectedTeeth.includes(tn))
      : selectedTeeth.filter((tn) => toothExtractionMap[tn] === e.code);
    return teethForBox.length === 0 && !anyOptionalHasTeeth;
  });

  // Notify parent whenever validation state changes
  useEffect(() => {
    onRequiredValidationChange?.(hasRequiredValidation);
  }, [hasRequiredValidation, onRequiredValidationChange]);

  // Build pairs for 2-column grid layout
  const rows: ProductExtraction[][] = [];
  for (let i = 0; i < activeExtractions.length; i += 2) {
    rows.push(activeExtractions.slice(i, i + 2));
  }

  const lastRowIdx = rows.length - 1;

  const handleBoxClick = (extraction: ProductExtraction) => {
    if (isDefaultExtraction(extraction)) {
      // is_default: select all arch teeth, deactivate any active box
      onSelectAllTeeth(allArchTeeth);
      onActiveExtractionChange(null);
      return;
    }
    // is_required and is_optional: toggle active — user clicks teeth to assign
    if (activeExtractionCode === extraction.code) {
      onActiveExtractionChange(null);
    } else {
      onActiveExtractionChange(extraction.code);
    }
  };

  return (
    <>
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${rowIdx === lastRowIdx ? "mb-4" : "mb-2"}`}
        >
          {row.map((extraction) => {
            const isActive = !submitted && activeExtractionCode === extraction.code;
            const isDefault = isDefaultExtraction(extraction);
            const isRequired = isRequiredExtraction(extraction);

            const isClasp = isClaspExtraction(extraction);

            // Teeth shown in this box (sorted ascending)
            // Clasp is an overlay — uses its own set, not the exclusive extraction map
            const teethForBox = (isDefault
              ? defaultTeeth
              : isClasp
              ? claspTeeth.filter((tn) => selectedTeeth.includes(tn))
              : selectedTeeth.filter((tn) => toothExtractionMap[tn] === extraction.code)
            ).slice().sort((a, b) => a - b);

            const isEmpty = teethForBox.length === 0;
            const allSelected = isRemovable && isDefault && teethForBox.length === allArchTeeth.length && allArchTeeth.length > 0;

            let teethDisplay = "";
            if (teethForBox.length > 0) {
              teethDisplay = allSelected ? "All teeth selected" : `#${teethForBox.join(",")}`;
            }

            // Validation: is_required box needs teeth unless an is_optional box has teeth
            const showRequiredValidation =
              isRequired && isEmpty && !anyOptionalHasTeeth;

            const minTeeth = extraction.min_teeth ?? 1;

            const style = resolveStyle(extraction);

            // Compact (no teeth) vs normal size — only for removable context
            const isCompact = isRemovable && isEmpty;

            return (
              <div key={extraction.id} className="flex flex-col min-w-0">
                <div
                  className={`flex flex-col items-center justify-center rounded-md px-2 cursor-pointer hover:opacity-90 active:opacity-75 transition-all ${isCompact ? "py-1 min-h-[28px]" : "py-1.5 min-h-[50px] sm:min-h-[65px]"}`}
                  style={{
                    backgroundColor: style.bg,
                    outline: isActive
                      ? "3px solid #1162A8"
                      : showRequiredValidation
                      ? "2px solid #CF0202"
                      : "none",
                    outlineOffset: isActive ? "2px" : showRequiredValidation ? "1px" : "0px",
                  }}
                  onClick={() => handleBoxClick(extraction)}
                >
                  <p
                    className={`font-[Verdana] font-normal tracking-[0.05em] text-center break-words max-w-full ${style.textClass} ${isCompact ? "text-[10px] leading-tight" : "text-[14px] leading-tight"}`}
                  >
                    {extraction.name}
                    {teethDisplay && (
                      <>
                        {!isCompact && <br />}
                        {isCompact ? " " : ""}
                        <span className={isCompact ? "text-[16px]" : "text-[16px] font-normal"}>{teethDisplay}</span>
                      </>
                    )}
                  </p>
                  {showRequiredValidation && (
                    <p className="text-[10px] sm:text-xs text-[#CF0202] text-center font-[Verdana]">
                      Required: select at least {minTeeth} tooth
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
