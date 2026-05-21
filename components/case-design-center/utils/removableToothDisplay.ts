import { isOverlayExtractionByFlag, isTimExtractionByFlag } from "./extractionHelpers";

function getSortedUniqueTeeth(teeth: number[]): number[] {
  return [...new Set(teeth)].sort((a, b) => a - b);
}

function looksLikeMissingCode(code: string): boolean {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  return normalized === "MT" || normalized.startsWith("MT_") || normalized.includes("MISSING");
}

/** True when this tooth has an overlay extraction (e.g. Clasps) — never counts toward the orange header. */
export function toothHasOverlayAssignment(
  toothNumber: number,
  toothExtractionMap: Record<number, string>,
  claspTeeth: number[],
  extractions?: ReadonlyArray<{ code?: string | null; overlay?: string }> | null
): boolean {
  if (claspTeeth.includes(toothNumber)) return true;
  const code = toothExtractionMap[toothNumber];
  if (!code || !extractions?.length) return false;
  const match = extractions.find((e) => e.code === code);
  return match ? isOverlayExtractionByFlag(match) : false;
}

export function getCardScopedSelectedTeeth({
  selectedTeeth,
  cardId,
  arch,
  getToothProductCard,
}: {
  selectedTeeth: number[];
  cardId: number;
  arch: "maxillary" | "mandibular";
  getToothProductCard: (arch: "maxillary" | "mandibular", toothNumber: number) => number | null | undefined;
}): number[] {
  return getSortedUniqueTeeth(
    selectedTeeth.filter((toothNumber) => getToothProductCard(arch, toothNumber) === cardId)
  );
}

export function getRemovableHeaderTeeth({
  selectedTeeth,
  toothExtractionMap,
  isFullDenture,
  isNonRetention = false,
}: {
  selectedTeeth: number[];
  toothExtractionMap: Record<number, string>;
  isFullDenture: boolean;
  isNonRetention?: boolean;
}): number[] {
  const teeth = getSortedUniqueTeeth(selectedTeeth);

  if (isFullDenture) return teeth;

  if (isNonRetention) {
    return teeth.filter((toothNumber) => {
      const code = toothExtractionMap[toothNumber];
      return code && code !== "TIM";
    });
  }

  return teeth.filter((toothNumber) => toothExtractionMap[toothNumber] !== "MT");
}

export function getStatusBoxTeeth({
  selectedTeeth,
  toothExtractionMap,
  claspTeeth,
  extractionCode,
  isDefault,
  isClasp,
}: {
  selectedTeeth: number[];
  toothExtractionMap: Record<number, string>;
  claspTeeth: number[];
  extractionCode: string;
  isDefault: boolean;
  isClasp: boolean;
}): number[] {
  const selectedSet = new Set(selectedTeeth);
  const includeAcrossProducts = looksLikeMissingCode(extractionCode);

  if (isDefault) {
    return getSortedUniqueTeeth(
      selectedTeeth.filter((toothNumber) => toothExtractionMap[toothNumber] === undefined)
    );
  }

  if (isClasp) {
    return getSortedUniqueTeeth(claspTeeth.filter((toothNumber) => selectedSet.has(toothNumber)));
  }

  return getSortedUniqueTeeth(
    Object.entries(toothExtractionMap)
      .filter(
        ([toothNumber, code]) =>
          (code === extractionCode || (includeAcrossProducts && looksLikeMissingCode(code))) &&
          (includeAcrossProducts || selectedSet.has(Number(toothNumber)))
      )
      .map(([toothNumber]) => Number(toothNumber))
  );
}

export function getRemovableOrangeHeaderTeeth({
  selectedTeeth,
  toothExtractionMap,
  claspTeeth = [],
  noActiveBoxTeeth,
  extractions,
  isFullDenture,
  isSingleDefaultOnly = false,
}: {
  selectedTeeth: number[];
  toothExtractionMap: Record<number, string>;
  /** Teeth with overlay === Yes (clasps) — excluded from orange header entirely */
  claspTeeth?: number[];
  noActiveBoxTeeth: number[];
  extractions?: ReadonlyArray<{ code?: string | null; overlay?: string }>;
  isFullDenture: boolean;
  /** When true, product has only one default status — show all scoped teeth in the orange box. */
  isSingleDefaultOnly?: boolean;
}): number[] {
  const withoutOverlay = (teeth: number[]) =>
    teeth.filter(
      (toothNumber) =>
        !toothHasOverlayAssignment(toothNumber, toothExtractionMap, claspTeeth, extractions)
    );

  const scopedTeeth = withoutOverlay(
    isFullDenture
      ? selectedTeeth.filter((toothNumber) => {
          const code = toothExtractionMap[toothNumber];
          return !!code && code !== "TIM";
        })
      : selectedTeeth
  );

  if (isSingleDefaultOnly) {
    return getSortedUniqueTeeth(scopedTeeth);
  }

  return getSortedUniqueTeeth(
    scopedTeeth.filter(
      (toothNumber) =>
        !toothExtractionMap[toothNumber] ||
        noActiveBoxTeeth.includes(toothNumber)
    )
  );
}

export function getToothStatusBoxDisplayMap({
  extractions,
  selectedTeeth,
  toothExtractionMap,
  claspTeeth,
}: {
  extractions: Array<{ code: string; is_tim?: string; overlay?: string }>;
  selectedTeeth: number[];
  toothExtractionMap: Record<number, string>;
  claspTeeth: number[];
}): Record<string, number[]> {
  return extractions.reduce<Record<string, number[]>>((acc, extraction) => {
    acc[extraction.code] = getStatusBoxTeeth({
      selectedTeeth,
      toothExtractionMap,
      claspTeeth,
      extractionCode: extraction.code,
      isDefault: isTimExtractionByFlag(extraction),
      isClasp: isOverlayExtractionByFlag(extraction),
    });
    return acc;
  }, {});
}
