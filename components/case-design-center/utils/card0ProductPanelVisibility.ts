import type { Arch } from "../types";

/**
 * True when this tooth counts as a card-0 product selection.
 * Clasp/overlay-only teeth do not — they are chart overlays, not product teeth.
 */
function isProductSelectionTooth(params: {
  toothNumber: number;
  extractionMap: Record<number, string>;
  claspTeeth: number[];
}): boolean {
  const { toothNumber, extractionMap, claspTeeth } = params;
  if (!claspTeeth.includes(toothNumber)) return true;
  const code = extractionMap[toothNumber];
  // Clasp + exclusive non-TIM status still counts as product selection.
  return !!code && code !== "TIM" && !code.toUpperCase().startsWith("TIM");
}

/** True when the user has explicitly picked at least one card-0 tooth on the chart. */
export function hasUserSelectedCard0TeethOnArch(params: {
  arch: Arch;
  allArchTeeth: number[];
  selectedTeeth: number[];
  extractionMap: Record<number, string>;
  retentionTypesByTooth?: Record<number, unknown>;
  getToothProductCard: (arch: Arch, toothNumber: number) => number;
  /** Overlay/clasp teeth — alone they do not reveal the product panel. */
  claspTeeth?: number[];
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
    claspTeeth = [],
  } = params;

  if (
    selectedTeeth.some(
      (tn) =>
        getToothProductCard(arch, tn) === 0 &&
        isProductSelectionTooth({ toothNumber: tn, extractionMap, claspTeeth })
    )
  ) {
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
      code !== "TIM" &&
      isProductSelectionTooth({ toothNumber: tn, extractionMap, claspTeeth })
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
  /** Overlay/clasp teeth — excluded when they have no exclusive product status. */
  claspTeeth?: number[];
}): number[] {
  const {
    arch,
    allArchTeeth,
    selectedTeeth,
    extractionMap,
    getToothProductCard,
    claspTeeth = [],
  } = params;
  const fromSelection = selectedTeeth.filter(
    (tn) =>
      getToothProductCard(arch, tn) === 0 &&
      isProductSelectionTooth({ toothNumber: tn, extractionMap, claspTeeth })
  );
  const fromExtraction = allArchTeeth.filter((tn) => {
    const code = extractionMap[tn];
    return (
      getToothProductCard(arch, tn) === 0 &&
      !!code &&
      code !== "TIM" &&
      isProductSelectionTooth({ toothNumber: tn, extractionMap, claspTeeth })
    );
  });
  return [...new Set([...fromSelection, ...fromExtraction])].sort((a, b) => a - b);
}
