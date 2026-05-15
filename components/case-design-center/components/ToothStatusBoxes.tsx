import { useEffect, useRef } from "react";
import type { ProductExtraction } from "../types";
import { getStatusBoxTeeth } from "../utils/removableToothDisplay";
import { shouldAutoSelectArchForDefaultExtraction } from "../utils/extractionHelpers";

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
  /** Called when a box is clicked to make it active — optionally receives the full extractions list */
  onActiveExtractionChange: (code: string | null, extractions?: ProductExtraction[]) => void;
  onToothExtractionToggle: (toothNumber: number, extractionCode: string, extractions?: ProductExtraction[]) => void;
  /** Called when "Teeth in mouth" box is clicked — selects all arch teeth */
  onSelectAllTeeth: (teeth: number[]) => void;
  /** Called whenever the required-validation error state changes */
  onRequiredValidationChange?: (hasValidation: boolean) => void;
  /** When true, enables removable-specific display: "All teeth selected" label and compact empty boxes */
  isRemovable?: boolean;
  /** When true, case has been submitted — hide blue active border on status boxes */
  submitted?: boolean;
  /** When true, hide the default (Teeth in mouth) box — it's shown in the center navigation instead */
  hideDefaultBox?: boolean;
  /** When true, suppress the "Required: select at least N tooth" validation outline and message */
  disableRequiredValidation?: boolean;
  /** When true, render boxes with gray border and gray text (used in accordion headers) */
  grayed?: boolean;
  /** Optional UI-only display override keyed by extraction code. */
  displayTeethByCode?: Record<string, number[]>;
}

/** Fallback color map keyed by extraction code — used only when API color is null */
const EXTRACTION_COLOR_MAP: Record<string, { bg: string; textClass: string }> = {
  TIM:   { bg: "#F3EBD7", textClass: "text-black" },           // Teeth in mouth
  MT:    { bg: "#D3D3D3", textClass: "text-black" },           // Missing teeth
  WEOD:  { bg: "#FF0513", textClass: "text-white font-bold" }, // Will extract on delivery
  WED:   { bg: "#FF0513", textClass: "text-white font-bold" }, // Will extract on delivery (legacy)
  FR:    { bg: "#A0F69A", textClass: "text-black" },           // Fix/Repair
  CLASP: { bg: "#FFD1F9", textClass: "text-black" },           // Clasp
  CTS:   { bg: "#0CE7C6", textClass: "text-black" },           // Custom tooth status
};

/** Fallback color map keyed by normalized extraction name — used only when API color and code map are null */
const EXTRACTION_NAME_COLOR_MAP: Record<string, { bg: string; textClass: string }> = {
  "teeth in mouth":           { bg: "#F3EBD7", textClass: "text-black" },
  "missing teeth":            { bg: "#D3D3D3", textClass: "text-black" },
  "will extract on delivery": { bg: "#FF0513", textClass: "text-white font-bold" },
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

/**
 * Returns true if this extraction is the "Teeth in mouth" bucket — the box that
 * holds teeth that have NOT been assigned to any other extraction code.
 *
 * Note: this is intentionally NOT keyed on `is_default === "Yes"`. Products may
 * legitimately mark another extraction (e.g. "Missing teeth" on full dentures)
 * as the product default; those behave as regular, code-keyed status boxes and
 * must still contain teeth explicitly mapped to them. Only TIM / "Teeth in
 * mouth" represents the "unassigned" bucket this predicate cares about.
 */
function isDefaultExtraction(extraction: ProductExtraction): boolean {
  return (
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
  onToothExtractionToggle: _onToothExtractionToggle,
  onSelectAllTeeth,
  onRequiredValidationChange,
  isRemovable = false,
  submitted = false,
  hideDefaultBox = false,
  disableRequiredValidation = false,
  grayed = false,
  displayTeethByCode,
}: ToothStatusBoxesProps) {
  const allActiveExtractions = extractions
    .filter((e) => e.status === "Active" && e.name != null && e.code != null)
    .sort((a, b) => a.sequence - b.sequence);

  // `hideDefaultBox` hides the "Teeth in mouth" (TIM) box because that status
  // is surfaced in the center navigation instead. `isDefaultExtraction` now
  // only matches TIM, so product-specific defaults (e.g. "Missing teeth" on
  // full dentures) still render as regular status boxes.
  const activeExtractions = hideDefaultBox
    ? allActiveExtractions.filter((e) => !isDefaultExtraction(e))
    : allActiveExtractions;

  // Auto-select all arch teeth when a is_default extraction first appears (check unfiltered list)
  // Skip if teeth are already selected — prevents re-triggering on accordion collapse/expand remount
  const hasAutoSelected = useRef(false);
  const shouldAutoSelectDefaultTeeth = shouldAutoSelectArchForDefaultExtraction(allActiveExtractions);
  useEffect(() => {
    if (shouldAutoSelectDefaultTeeth && !hasAutoSelected.current && selectedTeeth.length === 0) {
      hasAutoSelected.current = true;
      onSelectAllTeeth(allArchTeeth);
    }
  }, [shouldAutoSelectDefaultTeeth, allArchTeeth, onSelectAllTeeth, selectedTeeth.length]);

  if (activeExtractions.length === 0) return null;

  // Teeth in the default (TIM) box = selected teeth NOT assigned to any extraction
  const defaultTeeth = selectedTeeth.filter((tn) => !toothExtractionMap[tn]);

  const getTeethForBox = (extraction: ProductExtraction): number[] =>
    getStatusBoxTeeth({
      selectedTeeth,
      toothExtractionMap,
      claspTeeth,
      extractionCode: extraction.code,
      isDefault: isDefaultExtraction(extraction),
      isClasp: isClaspExtraction(extraction),
    });

  // Check if any optional extraction has teeth assigned (used for required validation)
  const anyOptionalHasTeeth = activeExtractions
    .filter((e) => isOptionalExtraction(e))
    .some((e) => getTeethForBox(e).length > 0);

  // Compute whether any required box is showing a validation error
  const hasRequiredValidation = !disableRequiredValidation && activeExtractions.some((e) => {
    if (!isRequiredExtraction(e)) return false;
    const teethForBox = getTeethForBox(e);
    return teethForBox.length === 0 && !anyOptionalHasTeeth;
  });

  // Notify parent whenever validation state changes
  useEffect(() => {
    onRequiredValidationChange?.(hasRequiredValidation);
  }, [hasRequiredValidation, onRequiredValidationChange]);

  // No longer need 2-column grid — use flex-wrap for compact auto-sized boxes

  // Pre-compute which boxes have teeth (for submitted filtering)
  const boxesWithTeeth = submitted
    ? activeExtractions.filter((extraction) => {
        const teethForBox = getTeethForBox(extraction);
        return teethForBox.length > 0;
      })
    : activeExtractions;
  const onlyOneBoxWithTeeth = submitted && boxesWithTeeth.length === 1;

  return (
    <div className="flex flex-wrap gap-[9.94px]">
      {activeExtractions.map((extraction) => {
        const isActive = !submitted && activeExtractionCode === extraction.code;
        const isDefault = isDefaultExtraction(extraction);
        const isRequired = isRequiredExtraction(extraction);

        const isClasp = isClaspExtraction(extraction);

        // Teeth shown in this box (sorted ascending)
        // Clasp is an overlay — uses its own set, not the exclusive extraction map
        const teethForBox = getTeethForBox(extraction);
        const displayTeethForBox = displayTeethByCode?.[extraction.code] ?? teethForBox;

        const isEmpty = teethForBox.length === 0;

        // When submitted, hide empty boxes (no teeth assigned)
        if (submitted && isEmpty) return null;

        const allSelected = isRemovable && isDefault && displayTeethForBox.length === allArchTeeth.length && allArchTeeth.length > 0;

        let teethDisplay = "";
        if (displayTeethForBox.length > 0) {
          teethDisplay = allSelected ? "All teeth selected" : `#${displayTeethForBox.join(",")}`;
        }

        // Validation: is_required box needs teeth unless an is_optional box has teeth
        const showRequiredValidation =
          !disableRequiredValidation && isRequired && isEmpty && !anyOptionalHasTeeth;

        const minTeeth = extraction.min_teeth ?? 1;
        const maxTeeth = extraction.max_teeth;
        const hasMaxLimit = maxTeeth !== null && maxTeeth !== undefined && maxTeeth > 0;
        const isAtMax = hasMaxLimit && teethForBox.length >= maxTeeth!;

        const style = resolveStyle(extraction);
        const isInteractive = !submitted && !grayed;

        // Compact (no teeth) vs normal size — only for removable context
        const isCompact = isRemovable && isEmpty;

        return (
          <div
            key={extraction.id}
            className={`flex flex-col items-center justify-center rounded-[6px] transition-all shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] ${isCompact ? "px-[10px] py-1 min-h-[28px]" : "px-[10px] py-1.5 min-h-[50px]"} ${isInteractive ? "cursor-pointer hover:shadow-[1px_1px_5px_rgba(0,0,0,0.3)]" : ""}`}
            onClick={() => {
              if (!isInteractive) return;
              onActiveExtractionChange(isActive ? null : extraction.code, extractions);
            }}
            style={{
              backgroundColor: grayed ? "white" : submitted ? style.bg : "white",
              outline: grayed
                ? "1.5px solid #B4B0B0"
                : isActive
                ? "3px solid #1162A8"
                : showRequiredValidation
                ? "2px solid #CF0202"
                : "none",
              outlineOffset: grayed ? "0px" : isActive ? "2px" : showRequiredValidation ? "1px" : "0px",
              ...(onlyOneBoxWithTeeth ? { flex: "1 1 100%" } : {}),
            }}
          >
            <p
              className={`font-[Verdana] font-normal tracking-[0.05em] text-center break-words max-w-full ${grayed ? "text-[#9B9B9B]" : submitted ? style.textClass : 'text-black'} text-[16px] leading-tight`}
            >
              {extraction.name}
              {teethDisplay && (
                <>
                  <br />
                  <span className="text-[16px] font-normal">{teethDisplay}</span>
                </>
              )}
            </p>
            {showRequiredValidation && (
              <p className={`text-[10px] sm:text-xs text-center font-[Verdana] ${style.textClass.includes("text-white") ? "text-white" : "text-[#CF0202]"}`}>
                Required: select at least {minTeeth} tooth
              </p>
            )}
            {!isDefault && isAtMax && !isEmpty && (
              <p className={`text-[10px] sm:text-xs text-center font-[Verdana] ${style.textClass.includes("text-white") ? "text-white/70" : "text-gray-500"}`}>
                Max: {maxTeeth} tooth{maxTeeth! > 1 ? "" : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
