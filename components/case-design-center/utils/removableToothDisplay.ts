import {
  isFullDentureProduct,
  isOverlayExtractionByFlag,
  isSingleDefaultOnlyExtractionList,
  isTimExtractionByFlag,
} from "./extractionHelpers";

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

/** All teeth that belong on this product card for extraction / tooth_chart payload. */
/**
 * Teeth in scope for removable `ToothStatusBoxes` (matches virtual-slip / slip submit).
 * Includes product `teeth_selection`, clasps, and any arch tooth with a status code.
 */
export function resolveRemovableStatusBoxSelectedTeeth({
  cardTeeth,
  toothExtractionMap,
  claspTeeth,
  archTeeth,
  useAllArchTeeth = false,
}: {
  cardTeeth: number[];
  toothExtractionMap: Record<number, string>;
  claspTeeth: number[];
  archTeeth: number[];
  /** Full-denture / arch-shared removable: every arch tooth may carry a status. */
  useAllArchTeeth?: boolean;
}): number[] {
  if (useAllArchTeeth) {
    return getSortedUniqueTeeth(archTeeth);
  }
  return buildExtractionScopeTeeth(cardTeeth, toothExtractionMap, claspTeeth, archTeeth);
}

export function buildExtractionScopeTeeth(
  cardTeeth: number[],
  toothExtractionMap: Record<number, string>,
  claspTeeth: number[],
  archTeeth: number[]
): number[] {
  const inArch = new Set(archTeeth);
  const out = new Set<number>();
  for (const toothNumber of cardTeeth) {
    if (inArch.has(toothNumber)) out.add(toothNumber);
  }
  for (const toothNumber of claspTeeth) {
    if (inArch.has(toothNumber)) out.add(toothNumber);
  }
  for (const [key, code] of Object.entries(toothExtractionMap)) {
    if (!code) continue;
    const toothNumber = Number(key);
    if (inArch.has(toothNumber)) out.add(toothNumber);
  }
  return getSortedUniqueTeeth([...out]);
}

/** Teeth selected for the product (orange header) — only these go in `teeth_selection`. */
export function resolveProductTeethForSlipSubmit({
  isRemovable,
  cardTeeth,
  toothExtractionMap,
  claspTeeth,
  noActiveBoxTeeth,
  extractions,
}: {
  isRemovable: boolean;
  cardTeeth: number[];
  toothExtractionMap: Record<number, string>;
  claspTeeth: number[];
  noActiveBoxTeeth: number[];
  extractions?: ReadonlyArray<{ code?: string | null; overlay?: string }>;
}): number[] {
  if (!isRemovable) {
    return getSortedUniqueTeeth(cardTeeth);
  }
  return getRemovableOrangeHeaderTeeth({
    selectedTeeth: cardTeeth,
    toothExtractionMap,
    claspTeeth,
    noActiveBoxTeeth,
    extractions,
    isFullDenture: isFullDentureProduct(extractions),
    isSingleDefaultOnly: isSingleDefaultOnlyExtractionList(extractions),
  });
}

export function getToothStatusBoxDisplayMap({
  extractions,
  selectedTeeth,
  toothExtractionMap,
  claspTeeth,
  excludeTeeth = [],
}: {
  extractions: Array<{ code: string; is_tim?: string; overlay?: string }>;
  selectedTeeth: number[];
  toothExtractionMap: Record<number, string>;
  claspTeeth: number[];
  /** Teeth to hide from the display (teeth shown in the product header). */
  excludeTeeth?: number[];
}): Record<string, number[]> {
  const excludeSet = new Set(excludeTeeth);
  return extractions.reduce<Record<string, number[]>>((acc, extraction) => {
    const teeth = getStatusBoxTeeth({
      selectedTeeth,
      toothExtractionMap,
      claspTeeth,
      extractionCode: extraction.code,
      isDefault: isTimExtractionByFlag(extraction),
      isClasp: isOverlayExtractionByFlag(extraction),
    });
    acc[extraction.code] = excludeSet.size > 0 ? teeth.filter((t) => !excludeSet.has(t)) : teeth;
    return acc;
  }, {});
}
