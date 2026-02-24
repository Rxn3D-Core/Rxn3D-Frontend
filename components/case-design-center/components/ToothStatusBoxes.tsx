import type { ProductExtraction } from "../types";

interface ToothStatusBoxesProps {
  extractions: ProductExtraction[];
  selectedTeeth: number[];
  /** All tooth numbers for this arch (e.g. 1-16 for maxillary) */
  allArchTeeth: number[];
  /** toothNumber → extractionCode for teeth assigned to a non-TIM extraction */
  toothExtractionMap: Record<number, string>;
  /** Currently active extraction code (null = none selected) */
  activeExtractionCode: string | null;
  /** Called when a box is clicked to make it active */
  onActiveExtractionChange: (code: string | null) => void;
  onToothExtractionToggle: (toothNumber: number, extractionCode: string) => void;
  /** Called when "Teeth in mouth" box is clicked — selects all arch teeth */
  onSelectAllTeeth: (teeth: number[]) => void;
  /** Called when "Missing teeth" box is clicked — clears all selected teeth */
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

/** Fallback color map keyed by normalized extraction name */
const EXTRACTION_NAME_COLOR_MAP: Record<string, { bg: string; textClass: string }> = {
  "teeth in mouth":           { bg: "#F3EBD7", textClass: "text-black" },
  "missing teeth":            { bg: "#E9E8E7", textClass: "text-black" },
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
  // 1. Use API-provided color if present
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

/** Returns true if this extraction is the "Teeth in mouth" box */
function isTIM(extraction: ProductExtraction): boolean {
  return (
    extraction.is_default === "Yes" ||
    extraction.code === "TIM" ||
    (extraction.name ?? "").toLowerCase().trim() === "teeth in mouth"
  );
}

/** Returns true if this extraction is the "Missing teeth" box */
function isMT(extraction: ProductExtraction): boolean {
  return (
    extraction.is_optional === "Yes" ||
    extraction.code === "MT" ||
    (extraction.name ?? "").toLowerCase().trim() === "missing teeth"
  );
}

export function ToothStatusBoxes({
  extractions,
  selectedTeeth,
  allArchTeeth,
  toothExtractionMap,
  activeExtractionCode,
  onActiveExtractionChange,
  onToothExtractionToggle,
  onSelectAllTeeth,
  onClearAllTeeth,
}: ToothStatusBoxesProps) {
  const activeExtractions = extractions
    .filter((e) => e.status === "Active" && e.name != null && e.code != null)
    .sort((a, b) => a.sequence - b.sequence);

  if (activeExtractions.length === 0) return null;

  // Teeth in the default (TIM) box = selected teeth NOT assigned to any extraction
  const defaultTeeth = selectedTeeth.filter((tn) => !toothExtractionMap[tn]);

  // Build pairs for 2-column grid layout
  const rows: ProductExtraction[][] = [];
  for (let i = 0; i < activeExtractions.length; i += 2) {
    rows.push(activeExtractions.slice(i, i + 2));
  }

  const lastRowIdx = rows.length - 1;

  const handleBoxClick = (extraction: ProductExtraction) => {
    if (isTIM(extraction)) {
      // Teeth in mouth: select all arch teeth, deactivate any active box
      onSelectAllTeeth(allArchTeeth);
      onActiveExtractionChange(null);
      return;
    }
    if (isMT(extraction)) {
      // Missing teeth: clear all selected teeth, activate MT box
      onClearAllTeeth();
      onActiveExtractionChange(extraction.code);
      return;
    }
    // Other boxes: toggle active — clicking the already-active box deactivates it
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
          className={`grid grid-cols-2 gap-2 ${rowIdx === lastRowIdx ? "mb-4" : "mb-2"}`}
        >
          {row.map((extraction) => {
            const isActive = activeExtractionCode === extraction.code;
            const isTIMBox = isTIM(extraction);
            const isMTBox = isMT(extraction);

            // Teeth shown in this box (sorted ascending)
            const teethForBox = (isTIMBox
              ? defaultTeeth
              : isMTBox
              ? allArchTeeth.filter((tn) => !selectedTeeth.includes(tn))
              : selectedTeeth.filter((tn) => toothExtractionMap[tn] === extraction.code)
            ).slice().sort((a, b) => a - b);

            const teethDisplay =
              teethForBox.length > 0 ? `#${teethForBox.join(",")}` : "";

            const style = resolveStyle(extraction);

            return (
              <div
                key={extraction.id}
                className="flex items-center justify-center rounded-md h-[65px] cursor-pointer hover:opacity-90 active:opacity-75 transition-all"
                style={{
                  backgroundColor: style.bg,
                  outline: isActive ? "3px solid #1162A8" : "none",
                  outlineOffset: isActive ? "2px" : "0px",
                }}
                onClick={() => handleBoxClick(extraction)}
              >
                <p
                  className={`font-[Verdana] text-[14px] leading-[26px] tracking-[0.05em] text-center ${style.textClass}`}
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
