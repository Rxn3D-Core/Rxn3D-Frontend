import type { AddedProduct, Arch } from "../types";

export type ArchToothOwnershipContext = {
  arch: Arch;
  toothNumber: number;
  activeProductCardId: number;
  getToothProductCard: (arch: Arch, toothNumber: number) => number;
  maxillaryTeeth: readonly number[];
  mandibularTeeth: readonly number[];
};

/** True when this tooth is already assigned to a different product card on the arch. */
export function isToothLockedByAnotherProduct({
  arch,
  toothNumber,
  activeProductCardId,
  getToothProductCard,
  maxillaryTeeth,
  mandibularTeeth,
}: ArchToothOwnershipContext): boolean {
  const selectedOnArch = arch === "maxillary" ? maxillaryTeeth : mandibularTeeth;
  if (!selectedOnArch.includes(toothNumber)) return false;
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
