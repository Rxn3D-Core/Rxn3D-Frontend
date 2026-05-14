function getSortedUniqueTeeth(teeth: number[]): number[] {
  return [...new Set(teeth)].sort((a, b) => a - b);
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
