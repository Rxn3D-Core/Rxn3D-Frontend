function getSortedUniqueTeeth(teeth: number[]): number[] {
  return [...new Set(teeth)].sort((a, b) => a - b);
}

function isDefaultExtractionLike(extraction: {
  code: string;
  name?: string | null;
}): boolean {
  return (
    extraction.code === "TIM" ||
    (extraction.name ?? "").toLowerCase().trim() === "teeth in mouth"
  );
}

function isClaspExtractionLike(extraction: {
  code: string;
  name?: string | null;
}): boolean {
  const normalizedName = (extraction.name ?? "").toLowerCase().trim();
  return (
    extraction.code === "CLASP" ||
    normalizedName === "clasps" ||
    normalizedName === "clasp"
  );
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
  if (isDefault) {
    return getSortedUniqueTeeth(
      selectedTeeth.filter((toothNumber) => toothExtractionMap[toothNumber] === undefined)
    );
  }

  if (isClasp) {
    return getSortedUniqueTeeth(claspTeeth);
  }

  return getSortedUniqueTeeth(
    Object.entries(toothExtractionMap)
      .filter(([, code]) => code === extractionCode)
      .map(([toothNumber]) => Number(toothNumber))
  );
}

export function getRemovableOrangeHeaderTeeth({
  selectedTeeth,
  toothExtractionMap,
  noActiveBoxTeeth,
  isFullDenture,
}: {
  selectedTeeth: number[];
  toothExtractionMap: Record<number, string>;
  noActiveBoxTeeth: number[];
  isFullDenture: boolean;
}): number[] {
  const scopedTeeth = isFullDenture
    ? selectedTeeth.filter((toothNumber) => {
        const code = toothExtractionMap[toothNumber];
        return !!code && code !== "TIM";
      })
    : selectedTeeth;

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
  extractions: Array<{ code: string; name?: string | null }>;
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
      isDefault: isDefaultExtractionLike(extraction),
      isClasp: isClaspExtractionLike(extraction),
    });
    return acc;
  }, {});
}
