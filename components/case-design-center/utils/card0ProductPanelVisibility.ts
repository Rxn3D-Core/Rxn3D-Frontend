import type { Arch } from "../types";

/** True when the user has explicitly picked at least one card-0 tooth on the chart. */
export function hasUserSelectedCard0TeethOnArch(params: {
  arch: Arch;
  allArchTeeth: number[];
  selectedTeeth: number[];
  extractionMap: Record<number, string>;
  retentionTypesByTooth?: Record<number, unknown>;
  getToothProductCard: (arch: Arch, toothNumber: number) => number;
  /** Submitted / preloaded slips already have teeth — do not hide the panel. */
  bypassGate?: boolean;
}): boolean {
  if (params.bypassGate) return true;

  const {
    arch,
    allArchTeeth,
    selectedTeeth,
    extractionMap,
    retentionTypesByTooth = {},
    getToothProductCard,
  } = params;

  if (selectedTeeth.some((tn) => getToothProductCard(arch, tn) === 0)) {
    return true;
  }

  if (
    Object.keys(retentionTypesByTooth).some(
      (tn) => getToothProductCard(arch, Number(tn)) === 0
    )
  ) {
    return true;
  }

  return allArchTeeth.some((tn) => {
    const code = extractionMap[tn];
    return (
      getToothProductCard(arch, tn) === 0 &&
      !!code &&
      code !== "TIM"
    );
  });
}

/** Card-0 teeth the user selected (chart membership or non-TIM extraction status). */
export function getCard0UserSelectedTeeth(params: {
  arch: Arch;
  allArchTeeth: number[];
  selectedTeeth: number[];
  extractionMap: Record<number, string>;
  getToothProductCard: (arch: Arch, toothNumber: number) => number;
}): number[] {
  const { arch, allArchTeeth, selectedTeeth, extractionMap, getToothProductCard } = params;
  const fromSelection = selectedTeeth.filter((tn) => getToothProductCard(arch, tn) === 0);
  const fromExtraction = allArchTeeth.filter((tn) => {
    const code = extractionMap[tn];
    return getToothProductCard(arch, tn) === 0 && !!code && code !== "TIM";
  });
  return [...new Set([...fromSelection, ...fromExtraction])].sort((a, b) => a - b);
}
