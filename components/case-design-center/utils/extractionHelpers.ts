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
  is_optional?: string;
  is_required?: string;
  overlay?: string;
};

export function isTimExtractionByFlag(extraction: ExtractionLike | undefined | null): boolean {
  return String(extraction?.is_tim ?? "").trim().toLowerCase() === "yes";
}

/** TIM / "Teeth in mouth" row — matches CDC panels and tooth-status popover conventions. */
export function isTimExtractionRow(extraction: ExtractionLike | undefined | null): boolean {
  if (!extraction) return false;
  if (isTimExtractionByFlag(extraction)) return true;
  const code = String(extraction.code ?? "")
    .trim()
    .toUpperCase();
  if (code === "TIM" || code.startsWith("TIM")) return true;
  const name = String(extraction.name ?? "")
    .toLowerCase()
    .trim();
  return name === "teeth in mouth" || name.includes("in mouth");
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

/** Full-denture products: no TIM row; only missing-teeth style extractions. */
export function isFullDentureProduct(
  extractions: ReadonlyArray<{ code?: string; name?: string; status?: string }> | undefined | null
): boolean {
  if (!extractions?.length) return false;
  const active = extractions.filter((e) => isActiveExtractionRow(e));
  if (active.length === 0) return false;
  const hasTim = active.some(
    (e) => e.code === "TIM" || (e.name ?? "").toLowerCase().trim() === "teeth in mouth"
  );
  if (hasTim) return false;
  return active.every(
    (e) => e.code === "MT" || (e.name ?? "").toLowerCase().trim() === "missing teeth"
  );
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

function isDefaultExtractionRow(e: ExtractionLike): boolean {
  return String(e.is_default ?? "").trim().toLowerCase() === "yes";
}

/** A non-default extraction the user is not required to apply. */
function isOptionalNonDefaultRow(e: ExtractionLike): boolean {
  if (String(e.is_optional ?? "").trim().toLowerCase() === "yes") return true;
  // Anything not explicitly marked required counts as optional.
  return String(e.is_required ?? "").trim().toLowerCase() !== "yes";
}

/**
 * True when the product has a default extraction and every other active
 * extraction is optional — so the user can proceed (click "Done") without
 * selecting any teeth, and the default extraction applies to all teeth.
 *
 * Covers:
 *  - single-default-only lists (e.g. orthodontics "Teeth in mouth")
 *  - default + optional lists (e.g. night guard with optional "Missing tooth")
 *
 * Returns false when any non-default extraction is required (e.g. a partial
 * denture whose "Missing teeth" must be selected before proceeding).
 */
/** True when the product defines at least one active extraction row in the library. */
export function hasConfiguredExtractions(
  extractions: ReadonlyArray<ExtractionLike> | undefined | null
): boolean {
  return (extractions ?? []).some(isActiveExtractionRow);
}

export function isExtractionSelectionOptional(
  extractions: ReadonlyArray<ExtractionLike> | undefined | null
): boolean {
  const active = (extractions ?? []).filter(isActiveExtractionRow);
  if (active.length === 0) return false;
  if (!active.some(isDefaultExtractionRow)) return false;
  return active.filter((e) => !isDefaultExtractionRow(e)).every(isOptionalNonDefaultRow);
}

/**
 * True when the user does not need to pick teeth/extractions on the chart before
 * grade / stage / impression fields — either no extractions are configured on the
 * product, or every configured extraction is optional relative to the default.
 */
export function canSkipExtractionToothSelection(
  extractions: ReadonlyArray<ExtractionLike> | undefined | null
): boolean {
  if (!hasConfiguredExtractions(extractions)) return true;
  return isExtractionSelectionOptional(extractions);
}

/** Stable key for per-card "done picking extractions" acknowledgement state. */
export function removableCardAckKey(arch: "maxillary" | "mandibular", cardId: number): string {
  return `${arch}-removable-${cardId}`;
}

/** Card 0 fixed restoration: user acknowledged tooth chart retention picks. */
export function fixedRetentionAckKey(arch: "maxillary" | "mandibular"): string {
  return `${arch}-fixed-retention-0`;
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

/**
 * The active extraction explicitly marked as the product default (is_default === "yes"),
 * or null when none is. Unlike {@link getDefaultExtraction} this never falls back to the
 * first active row — callers that want "show the default, otherwise show nothing" (e.g. the
 * center "Teeth in mouth" badge) depend on the null when no default is configured.
 */
export function getDefaultExtractionStrict(
  extractions: ReadonlyArray<ExtractionLike & { color?: string | null }> | undefined | null
): (ExtractionLike & { color?: string | null }) | null {
  const active = (extractions ?? []).filter(isActiveExtractionRow);
  return active.find(isDefaultExtractionRow) ?? null;
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
