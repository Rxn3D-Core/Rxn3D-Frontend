import type { AddedProduct, Arch } from "../types";

export type ArchToothOwnershipContext = {
  arch: Arch;
  toothNumber: number;
  activeProductCardId: number;
  getToothProductCard: (arch: Arch, toothNumber: number) => number;
  /**
   * Optional: returns true only when `setToothProductCard` was explicitly
   * called for this tooth (i.e. the tooth has a real card assignment stored
   * in the map, not the fallback default of 0).
   *
   * When provided, teeth that have never been explicitly assigned are treated
   * as unclaimed — they are not considered "locked" even if they appear in the
   * arch selection list (e.g. auto-selected via single-default extractions).
   * Callers that do not supply this function retain the original behaviour.
   */
  isToothExplicitlyAssigned?: (arch: Arch, toothNumber: number) => boolean;
  maxillaryTeeth: readonly number[];
  mandibularTeeth: readonly number[];
};

/** True when this tooth is already assigned to a different product card on the arch. */
export function isToothLockedByAnotherProduct({
  arch,
  toothNumber,
  activeProductCardId,
  getToothProductCard,
  isToothExplicitlyAssigned,
  maxillaryTeeth,
  mandibularTeeth,
}: ArchToothOwnershipContext): boolean {
  const selectedOnArch = arch === "maxillary" ? maxillaryTeeth : mandibularTeeth;
  if (!selectedOnArch.includes(toothNumber)) return false;
  // A tooth that has never been explicitly assigned to any card was populated
  // by auto-selection (e.g. single-default extractions). It is not "owned" by
  // the initial product card — any focused added product can claim it freely.
  if (isToothExplicitlyAssigned && !isToothExplicitlyAssigned(arch, toothNumber)) {
    return false;
  }
  const ownerCardId = getToothProductCard(arch, toothNumber);
  return ownerCardId !== activeProductCardId;
}

export function resolveProductCardDisplayName({
  cardId,
  arch,
  addedProducts,
  selectedProductName,
}: {
  cardId: number;
  arch: Arch;
  addedProducts: readonly AddedProduct[];
  selectedProductName?: string;
}): string {
  if (cardId === 0) {
    return selectedProductName?.trim() || "the initial product";
  }
  const ap = addedProducts.find((p) => p.id === cardId && p.arch === arch);
  const name = ap?.product?.name?.trim();
  return name || "another product";
}

export function buildToothOwnershipConflictMessage(
  toothNumber: number,
  ownerProductName: string
): string {
  return `Tooth #${toothNumber} is already selected for "${ownerProductName}". It cannot be used on another product.`;
}

export function filterTeethAvailableForActiveProduct(
  arch: Arch,
  toothNumbers: readonly number[],
  context: Omit<ArchToothOwnershipContext, "arch" | "toothNumber">
): { allowed: number[]; blocked: number[] } {
  const allowed: number[] = [];
  const blocked: number[] = [];
  for (const toothNumber of toothNumbers) {
    if (
      isToothLockedByAnotherProduct({
        ...context,
        arch,
        toothNumber,
      })
    ) {
      blocked.push(toothNumber);
    } else {
      allowed.push(toothNumber);
    }
  }
  return { allowed, blocked };
}
