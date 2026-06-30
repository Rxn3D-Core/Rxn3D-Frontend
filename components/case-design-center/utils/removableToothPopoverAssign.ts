import type { ProductExtraction } from "../types";

/** Popover status pick should set status, not toggle off when the same code is chosen again. */
export function shouldApplyExtractionOnPopoverSelect(
  currentCode: string | undefined,
  nextCode: string
): boolean {
  return currentCode !== nextCode;
}

export function resolveRemovablePopoverExtractionsForActiveCard({
  useArchSharedRemovable,
  mergedExtractions,
  activeProductCardId,
  addedProducts,
  arch,
  allArchTeeth,
  getToothProduct,
  getToothProductCard,
  card0Extractions,
}: {
  useArchSharedRemovable: boolean;
  mergedExtractions: ProductExtraction[];
  activeProductCardId: number;
  addedProducts: Array<{ id: number; arch: string; product?: { extractions?: ProductExtraction[] } | null }>;
  arch: "maxillary" | "mandibular";
  allArchTeeth: number[];
  getToothProduct: (
    arch: "maxillary" | "mandibular",
    toothNumber: number
  ) => { extractions?: ProductExtraction[] } | null;
  getToothProductCard: (
    arch: "maxillary" | "mandibular",
    toothNumber: number
  ) => number | null | undefined;
  card0Extractions: ProductExtraction[];
}): ProductExtraction[] {
  if (useArchSharedRemovable) {
    return mergedExtractions;
  }

  if (activeProductCardId !== 0) {
    const activeCard = addedProducts.find((ap) => ap.id === activeProductCardId && ap.arch === arch);
    if (!activeCard) return [];
    const cardTeethForExts = allArchTeeth.filter(
      (tn) => getToothProduct(arch, tn) && getToothProductCard(arch, tn) === activeCard.id
    );
    const repTn = cardTeethForExts.length > 0 ? cardTeethForExts[0] : -activeCard.id;
    return (
      getToothProduct(arch, repTn)?.extractions ??
      activeCard.product?.extractions ??
      []
    );
  }

  const card0Teeth = allArchTeeth.filter(
    (tn) => getToothProduct(arch, tn) && getToothProductCard(arch, tn) === 0
  );
  return card0Teeth.length > 0
    ? (getToothProduct(arch, card0Teeth[0])?.extractions ?? card0Extractions)
    : card0Extractions;
}
