import type { Arch } from "../types";
import type { AddedProduct } from "../types";

export type ArchAddProductReadinessInput = {
  arch: Arch;
  initialArch?: "maxillary" | "mandibular" | "both";
  hasProductsOnArch: boolean;
  allAccordionsCompleteOnArch: boolean;
  archIncomplete: boolean;
  removableCard0Blocked: boolean;
  oppositeArchHasProducts: boolean;
  oppositeArchReady: boolean;
  inlineAddProductArch: Arch | null;
  caseSubmitted?: boolean;
  /** Hide add control when the arch already has the maximum allowed products. */
  atProductLimit?: boolean;
};

/**
 * Whether the "+ Add product" control should appear for an arch.
 * - Existing products on the arch must all be complete before another can be added.
 * - When the arch has no products yet, allow add once the opposite arch is fully configured.
 */
export function canShowAddProductButton({
  arch,
  initialArch,
  hasProductsOnArch,
  allAccordionsCompleteOnArch,
  archIncomplete,
  removableCard0Blocked,
  oppositeArchHasProducts,
  oppositeArchReady,
  inlineAddProductArch,
  caseSubmitted,
  atProductLimit,
}: ArchAddProductReadinessInput): boolean {
  if (caseSubmitted) return false;
  if (inlineAddProductArch != null) return false;
  if (atProductLimit) return false;

  if (hasProductsOnArch) {
    return allAccordionsCompleteOnArch && !archIncomplete && !removableCard0Blocked;
  }

  if (initialArch === arch) return false;

  if (!oppositeArchHasProducts) return false;

  return oppositeArchReady;
}

export function filterAddedProductsForArch(
  addedProducts: AddedProduct[] | undefined,
  arch: Arch
): AddedProduct[] {
  return (addedProducts ?? []).filter((ap) => ap.arch === arch);
}
