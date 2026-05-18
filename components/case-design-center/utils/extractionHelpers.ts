/**
 * When a product defines exactly one active extraction and marks it as default,
 * there is no meaningful choice — the UI can hide extraction boxes and ignore tooth clicks.
 */
function isActiveExtractionRow(e: {
  status?: string;
  name?: string | null;
  code?: string | null;
}): boolean {
  if (String(e.status ?? "Active").trim().toLowerCase() === "inactive") return false;
  if (e.name == null || e.code == null) return false;
  if (String(e.name).trim() === "" || String(e.code).trim() === "") return false;
  return true;
}

export type ExtractionLike = {
  status?: string;
  name?: string | null;
  code?: string | null;
  is_default?: string;
  is_tim?: string;
  overlay?: string;
};

export function isTimExtractionByFlag(extraction: ExtractionLike | undefined | null): boolean {
  return String(extraction?.is_tim ?? "").trim().toLowerCase() === "yes";
}

export function isOverlayExtractionByFlag(extraction: ExtractionLike | undefined | null): boolean {
  return String(extraction?.overlay ?? "").trim().toLowerCase() === "yes";
}

function findExtractionByCode(
  code: string,
  extractions?: ReadonlyArray<ExtractionLike> | null
): ExtractionLike | undefined {
  return (extractions ?? []).find((e) => e.code === code);
}

/** True when the extraction code belongs to an API row with overlay === "Yes". */
export function isOverlayExtractionCode(
  extractionCode: string,
  extractions?: ReadonlyArray<ExtractionLike> | null
): boolean {
  const match = findExtractionByCode(extractionCode, extractions);
  return match ? isOverlayExtractionByFlag(match) : false;
}

/**
 * Overlay extractions may only be applied on teeth whose base status is an is_tim extraction.
 * Unmapped teeth (not in toothExtractionMap) count as TIM when the product has an is_tim row.
 */
export function toothHasTimBaseExtraction(
  toothNumber: number,
  toothExtractionMap: Record<number, string>,
  extractions?: ReadonlyArray<ExtractionLike> | null
): boolean {
  const assignedCode = toothExtractionMap[toothNumber];
  if (assignedCode === undefined) {
    return (extractions ?? []).some((e) => isActiveExtractionRow(e) && isTimExtractionByFlag(e));
  }
  const assigned = findExtractionByCode(assignedCode, extractions);
  return assigned ? isTimExtractionByFlag(assigned) : false;
}

function isTimExtraction(extraction: ExtractionLike): boolean {
  return isTimExtractionByFlag(extraction);
}

export function isSingleDefaultOnlyExtractionList(
  extractions:
    | ReadonlyArray<ExtractionLike>
    | undefined
    | null
): boolean {
  const active = (extractions ?? []).filter(isActiveExtractionRow);
  if (active.length !== 1) return false;
  return String(active[0].is_default ?? "").trim().toLowerCase() === "yes";
}

/** Stable key for per-card "done picking extractions" acknowledgement state. */
export function removableCardAckKey(arch: "maxillary" | "mandibular", cardId: number): string {
  return `${arch}-removable-${cardId}`;
}

/**
 * Multi-status removable products: user must acknowledge tooth/extraction picks
 * before grade / shade / impression fields appear.
 */
export function requiresExtractionsAcknowledgement(
  extractions: ReadonlyArray<ExtractionLike> | undefined | null
): boolean {
  const active = (extractions ?? []).filter(isActiveExtractionRow);
  if (active.length === 0) return false;
  return !isSingleDefaultOnlyExtractionList(extractions);
}

export function shouldAutoSelectArchForDefaultExtraction(
  extractions: ReadonlyArray<ExtractionLike> | undefined | null
): boolean {
  const active = (extractions ?? []).filter(isActiveExtractionRow);
  const defaultExtraction = active.find(
    (extraction) => String(extraction.is_default ?? "").trim().toLowerCase() === "yes"
  );

  if (!defaultExtraction) return false;
  return !isTimExtraction(defaultExtraction);
}

export function getDefaultExtraction(
  extractions: ReadonlyArray<ExtractionLike & { color?: string | null }> | undefined | null
): (ExtractionLike & { color?: string | null }) | null {
  const active = (extractions ?? []).filter(isActiveExtractionRow);
  const defaultExtraction = active.find(
    (extraction) => String(extraction.is_default ?? "").trim().toLowerCase() === "yes"
  );
  return defaultExtraction || active[0] || null;
}

/** Determine text class from a hex background color (dark bg → white text) */
export function textClassFromColor(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return "text-black";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5 ? "text-white font-bold" : "text-black";
}
