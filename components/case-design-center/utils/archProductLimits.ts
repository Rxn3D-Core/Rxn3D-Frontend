import type { AddedProduct, Arch } from "../types";

/** Maximum product configurations allowed on one arch (initial + added). */
export const MAX_PRODUCTS_PER_ARCH = 3;

export function countProductsOnArch(
  arch: Arch,
  options: {
    initialArch?: "maxillary" | "mandibular" | "both";
    selectedProductId?: number;
    addedProducts?: AddedProduct[];
  }
): number {
  const addedOnArch = (options.addedProducts ?? []).filter((ap) => ap.arch === arch);
  const added = addedOnArch.length;
  const initialOnArch =
    !!options.selectedProductId &&
    (options.initialArch === arch || options.initialArch === "both") &&
    !addedOnArch.some((ap) => ap.replacesInitialProduct);
  return added + (initialOnArch ? 1 : 0);
}

export function isArchAtProductLimit(
  arch: Arch,
  options: Parameters<typeof countProductsOnArch>[1]
): boolean {
  return countProductsOnArch(arch, options) >= MAX_PRODUCTS_PER_ARCH;
}
