import type { AddedProduct, Arch, ProductApiData } from "../types";

function hasLoadedProductDetail(
  product: ProductApiData | null | undefined
): boolean {
  return product != null && typeof product.id === "number" && product.id > 0;
}

/**
 * True while the active removable product's detail API is in flight or not yet
 * available on the representative tooth — tooth chart and status boxes stay off.
 */
export function isArchRemovableProductDetailPending(
  arch: Arch,
  allArchTeeth: readonly number[],
  sentinelTooth: number,
  activeProductCardId: number,
  addedProducts: readonly AddedProduct[],
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null,
  getToothProductCard: (arch: Arch, toothNumber: number) => number,
  isProductLoading: (arch: Arch, toothNumber: number) => boolean
): boolean {
  if (activeProductCardId !== 0) {
    const activeAp = addedProducts.find(
      (p) => p.id === activeProductCardId && p.arch === arch
    );
    if (hasLoadedProductDetail(activeAp?.product)) return false;

    const cardTeeth = allArchTeeth.filter(
      (tn) => getToothProductCard(arch, tn) === activeProductCardId
    );
    const repTn = cardTeeth[0];
    if (repTn != null) {
      if (isProductLoading(arch, repTn)) return true;
      return !hasLoadedProductDetail(getToothProduct(arch, repTn));
    }
    return Boolean(activeAp?.productId);
  }

  const repTn =
    allArchTeeth.find(
      (tn) => getToothProduct(arch, tn) && getToothProductCard(arch, tn) === 0
    ) ?? sentinelTooth;

  if (isProductLoading(arch, repTn) || isProductLoading(arch, sentinelTooth)) {
    return true;
  }
  return !hasLoadedProductDetail(
    getToothProduct(arch, repTn) ?? getToothProduct(arch, sentinelTooth)
  );
}

/** @deprecated Use isArchRemovableProductDetailPending */
export function isActiveRemovableProductDetailLoading(
  arch: Arch,
  allArchTeeth: readonly number[],
  sentinelTooth: number,
  activeProductIsRemovables: boolean,
  _isActiveNonRetention: boolean,
  activeProductCardId: number,
  addedProducts: readonly AddedProduct[],
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null,
  getToothProductCard: (arch: Arch, toothNumber: number) => number,
  isProductLoading: (arch: Arch, toothNumber: number) => boolean
): boolean {
  if (!activeProductIsRemovables) return false;
  return isArchRemovableProductDetailPending(
    arch,
    allArchTeeth,
    sentinelTooth,
    activeProductCardId,
    addedProducts,
    getToothProduct,
    getToothProductCard,
    isProductLoading
  );
}
