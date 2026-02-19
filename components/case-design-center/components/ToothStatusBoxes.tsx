import type { ProductExtraction } from "../types";

interface ToothStatusBoxesProps {
  extractions: ProductExtraction[];
  selectedTeeth: number[];
  /** All tooth numbers for this arch (e.g. 1-16 for maxillary) */
  allArchTeeth: number[];
  /** toothNumber → extractionCode for teeth moved out of the default box */
  toothExtractionMap: Record<number, string>;
  onToothExtractionToggle: (toothNumber: number, extractionCode: string) => void;
  /** Called when "Teeth in mouth" box is clicked — should select all arch teeth */
  onSelectAllTeeth: (teeth: number[]) => void;
  /** Called when "Missing teeth" (or optional) box is clicked — should clear all selected teeth */
  onClearAllTeeth: () => void;
}

/** Color map keyed by extraction code — matches the reference UI template */
const EXTRACTION_COLOR_MAP: Record<string, { bg: string; textClass: string }> = {
  TIM:   { bg: "#F3EBD7", textClass: "text-black" },           // Teeth in mouth
  MT:    { bg: "#E9E8E7", textClass: "text-black" },           // Missing teeth
  WED:   { bg: "#E92520", textClass: "text-white font-bold" }, // Will extract on delivery
  FR:    { bg: "#A0F69A", textClass: "text-black" },           // Fix/Repair
  CLASP: { bg: "#FFD1F9", textClass: "text-black" },           // Clasp
  CTS:   { bg: "#0CE7C6", textClass: "text-black" },           // Custom tooth status
};

const DEFAULT_STYLE = { bg: "#F3EBD7", textClass: "text-black" };

export function ToothStatusBoxes({
  extractions,
  selectedTeeth,
  allArchTeeth,
  toothExtractionMap,
  onToothExtractionToggle,
  onSelectAllTeeth,
  onClearAllTeeth,
}: ToothStatusBoxesProps) {
  const activeExtractions = extractions
    .filter((e) => e.status === "Active")
    .sort((a, b) => a.sequence - b.sequence);

  if (activeExtractions.length === 0) return null;

  // Teeth in the default box = selected teeth NOT assigned to any non-default extraction
  const defaultTeeth = selectedTeeth.filter((tn) => !toothExtractionMap[tn]);

  // Build pairs for 2-column grid layout
  const rows: ProductExtraction[][] = [];
  for (let i = 0; i < activeExtractions.length; i += 2) {
    rows.push(activeExtractions.slice(i, i + 2));
  }

  const lastRowIdx = rows.length - 1;

  const handleBoxClick = (extraction: ProductExtraction) => {
    // Clicking the default (Teeth in mouth) box → auto-select all arch teeth
    if (extraction.is_default === "Yes") {
      onSelectAllTeeth(allArchTeeth);
      return;
    }
    // Clicking the optional (Missing teeth) box → clear all selected teeth
    if (extraction.is_optional === "Yes") {
      onClearAllTeeth();
      return;
    }
    // Toggle all currently-in-default teeth into this extraction
    // If all default teeth are already in this extraction, move them back
    const teethInThisBox = selectedTeeth.filter(
      (tn) => toothExtractionMap[tn] === extraction.code
    );
    const allDefaultAreHere =
      defaultTeeth.length === 0 && teethInThisBox.length === selectedTeeth.length;

    if (allDefaultAreHere) {
      // Move all back to default
      selectedTeeth.forEach((tn) => onToothExtractionToggle(tn, extraction.code));
    } else {
      // Move all default teeth into this extraction
      defaultTeeth.forEach((tn) => onToothExtractionToggle(tn, extraction.code));
    }
  };

  return (
    <>
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={`grid grid-cols-2 gap-2 ${rowIdx === lastRowIdx ? "mb-4" : "mb-2"}`}
        >
          {row.map((extraction) => {
            const isDefault = extraction.is_default === "Yes";
            const isOptional = extraction.is_optional === "Yes";
            const isClickable = isDefault || isOptional;

            // Teeth shown in this box (sorted ascending)
            const teethForBox = (isDefault
              ? defaultTeeth
              : isOptional
              ? allArchTeeth.filter((tn) => !selectedTeeth.includes(tn))
              : selectedTeeth.filter((tn) => toothExtractionMap[tn] === extraction.code)
            ).slice().sort((a, b) => a - b);

            const teethDisplay =
              teethForBox.length > 0 ? `#${teethForBox.join(",")}` : "";

            const style = EXTRACTION_COLOR_MAP[extraction.code] ?? DEFAULT_STYLE;

            return (
              <div
                key={extraction.id}
                className={`flex items-center justify-center rounded-md h-[65px] ${
                  isClickable ? "cursor-pointer hover:opacity-90 active:opacity-75" : ""
                }`}
                style={{ backgroundColor: style.bg }}
                onClick={isClickable ? () => handleBoxClick(extraction) : undefined}
              >
                <p
                  className={`font-[Verdana] text-[14px] leading-[26px] tracking-[-0.02em] text-center ${style.textClass}`}
                >
                  {extraction.name}
                  {teethDisplay && (
                    <>
                      <br />
                      {teethDisplay}
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
