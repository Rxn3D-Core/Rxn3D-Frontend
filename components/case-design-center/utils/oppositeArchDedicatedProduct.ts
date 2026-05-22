import type { AddedProduct, Arch } from "../types";

export type InitialArch = "maxillary" | "mandibular" | "both" | undefined;

/**
 * True when the opposite arch has its own product workflow (wizard card 0 and/or added products),
 * so the mirrored opposing accordion on the primary panel is redundant.
 */
export function oppositeArchHasDedicatedProduct(
  oppositeArch: Arch,
  initialArch: InitialArch,
  selectedProductId: number | undefined | null,
  addedProducts: AddedProduct[] | undefined
): boolean {
  const added = addedProducts ?? [];
  if (added.some((ap) => ap.arch === oppositeArch)) return true;

  if (!selectedProductId) return false;

  if (oppositeArch === "maxillary") {
    return initialArch === "maxillary" || initialArch === "both";
  }
  if (oppositeArch === "mandibular") {
    return initialArch === "mandibular" || initialArch === "both";
  }
  return false;
}

/** Whether to pass opposingProductData into a panel (mirror accordion for the opposite arch). */
export function shouldShowOpposingProductMirror(options: {
  initialProductHasOppositeSection: boolean;
  /** Wizard started on this arch (maxillary panel: mandibular; mandibular panel: maxillary). */
  hostMatchesInitialArch: boolean;
  primaryArchTeethSelected: boolean;
  oppositeArch: Arch;
  initialArch: InitialArch;
  selectedProductId: number | undefined | null;
  addedProducts: AddedProduct[] | undefined;
  /** Both arches already have removables card-0 / selection-only work (legacy gate). */
  bothArchesHaveRemovables: boolean;
}): boolean {
  const {
    initialProductHasOppositeSection,
    hostMatchesInitialArch,
    primaryArchTeethSelected,
    oppositeArch,
    initialArch,
    selectedProductId,
    addedProducts,
    bothArchesHaveRemovables,
  } = options;

  if (!initialProductHasOppositeSection || !hostMatchesInitialArch || !primaryArchTeethSelected) {
    return false;
  }
  if (bothArchesHaveRemovables) return false;
  return !oppositeArchHasDedicatedProduct(
    oppositeArch,
    initialArch,
    selectedProductId,
    addedProducts
  );
}
