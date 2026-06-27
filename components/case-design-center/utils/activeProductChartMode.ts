import type { AddedProduct, Arch, ProductApiData } from "../types";
import {
  getProductLayers,
  hasRetentionOptions,
  type ProductLayers,
} from "./categoryHelpers.ts";

type ProductResolver = (arch: Arch, toothNumber: number) => ProductApiData | null;

/** Added product applies to this arch (explicit arch or legacy "both"). */
export function addedProductAppliesToArch(
  ap: AddedProduct | undefined,
  arch: Arch
): boolean {
  if (!ap) return false;
  const apArch = String(ap.arch ?? "").toLowerCase();
  if (apArch === "both") return true;
  return apArch === arch;
}

function resolveAddedProduct(
  arch: Arch,
  activeProductCardId: number,
  addedProducts: readonly AddedProduct[] | undefined
): AddedProduct | undefined {
  if (activeProductCardId === 0) return undefined;
  return (addedProducts ?? []).find((p) => p.id === activeProductCardId);
}

function resolveProductForActiveCard(
  arch: Arch,
  activeProductCardId: number,
  activeAp: AddedProduct | undefined,
  getToothProduct: ProductResolver,
  allArchTeeth: readonly number[],
  getToothProductCard: (arch: Arch, toothNumber: number) => number
): ProductApiData | null | undefined {
  if (!activeAp) return null;
  const assignedTooth = allArchTeeth.find(
    (tn) =>
      getToothProductCard(arch, tn) === activeProductCardId &&
      !!getToothProduct(arch, tn)
  );
  return (
    (assignedTooth != null ? getToothProduct(arch, assignedTooth) : null) ??
    getToothProduct(arch, -activeAp.id) ??
    activeAp.product ??
    null
  );
}

/**
 * True when the *active* product on this arch uses removable-style chart interaction
 * (toggle teeth / extraction boxes, no per-tooth retention popover).
 */
export function isActiveProductSelectionOnlyOnArch(params: {
  arch: Arch;
  activeProductCardId: number;
  addedProducts?: readonly AddedProduct[];
  getToothProduct: ProductResolver;
  getToothProductCard: (arch: Arch, toothNumber: number) => number;
  allArchTeeth: readonly number[];
  initialProductDetails: ProductApiData | null;
  initialProductDetailsPending: boolean;
  initialArch?: string;
  activeFixedGroupProductId?: number | null;
  cachedProductById?: ReadonlyMap<number, ProductApiData>;
}): boolean {
  const {
    arch,
    activeProductCardId,
    addedProducts,
    getToothProduct,
    getToothProductCard,
    allArchTeeth,
    initialProductDetails,
    initialProductDetailsPending,
    initialArch,
    activeFixedGroupProductId = null,
    cachedProductById,
  } = params;

  if (activeProductCardId !== 0) {
    const activeAp = resolveAddedProduct(arch, activeProductCardId, addedProducts);
    if (!addedProductAppliesToArch(activeAp, arch)) return false;

    const resolved = resolveProductForActiveCard(
      arch,
      activeProductCardId,
      activeAp,
      getToothProduct,
      allArchTeeth,
      getToothProductCard
    );
    if (resolved) return !hasRetentionOptions(resolved);

    const apHasRetention = hasRetentionOptions(activeAp?.product);
    if (
      !apHasRetention &&
      activeAp?.productId &&
      !activeAp.product?.retention_options &&
      activeAp.product?.has_retention == null
    ) {
      const cached = activeAp.productId
        ? cachedProductById?.get(activeAp.productId)
        : undefined;
      if (!cached) return false;
      return !hasRetentionOptions(cached);
    }
    return !apHasRetention;
  }

  if (activeFixedGroupProductId !== null) return false;

  if (initialProductDetailsPending || initialProductDetails === null) return false;
  if (hasRetentionOptions(initialProductDetails)) return false;
  if (initialArch === "maxillary" && arch === "mandibular") return false;
  if (initialArch === "mandibular" && arch === "maxillary") return false;
  return true;
}

/**
 * Capability-driven companion to {@link isActiveProductSelectionOnlyOnArch}.
 *
 * Resolves the *active* product on this arch (same resolution chain) and reports
 * its two independent chart layers. Drive composable chart behavior off this:
 * - `retention` → enable the retention popover (Prep/Implant/Pontic)
 * - `extraction` → enable the extraction layer (status popover / boxes)
 *
 * A "both" product returns `{ retention: true, extraction: true }`; today the
 * binary helpers collapse that to retention-only, which is why extraction UX is
 * suppressed for it. Returns all-false when the active product can't be resolved
 * (pending / none), so callers fall back to plain selection.
 */
export function getActiveProductLayersOnArch(params: {
  arch: Arch;
  activeProductCardId: number;
  addedProducts?: readonly AddedProduct[];
  getToothProduct: ProductResolver;
  getToothProductCard: (arch: Arch, toothNumber: number) => number;
  allArchTeeth: readonly number[];
  initialProductDetails: ProductApiData | null;
  initialProductDetailsPending: boolean;
  initialArch?: string;
  activeFixedGroupProductId?: number | null;
  cachedProductById?: ReadonlyMap<number, ProductApiData>;
}): ProductLayers {
  const NONE: ProductLayers = { retention: false, extraction: false };
  const {
    arch,
    activeProductCardId,
    addedProducts,
    getToothProduct,
    getToothProductCard,
    allArchTeeth,
    initialProductDetails,
    initialProductDetailsPending,
    initialArch,
    activeFixedGroupProductId = null,
    cachedProductById,
  } = params;

  if (activeProductCardId !== 0) {
    const activeAp = resolveAddedProduct(arch, activeProductCardId, addedProducts);
    if (!addedProductAppliesToArch(activeAp, arch)) return NONE;

    const resolved = resolveProductForActiveCard(
      arch,
      activeProductCardId,
      activeAp,
      getToothProduct,
      allArchTeeth,
      getToothProductCard
    );
    if (resolved) return getProductLayers(resolved);

    // Fall back to the added product's own payload, then the cached catalog copy.
    if (
      activeAp?.productId &&
      !activeAp.product?.retention_options &&
      activeAp.product?.has_retention == null
    ) {
      const cached = activeAp.productId
        ? cachedProductById?.get(activeAp.productId)
        : undefined;
      if (cached) return getProductLayers(cached);
    }
    return getProductLayers(activeAp?.product);
  }

  if (activeFixedGroupProductId !== null) {
    // A fixed group implies a retention product; extraction is resolved per-tooth.
    return { retention: true, extraction: false };
  }

  if (initialProductDetailsPending || initialProductDetails === null) return NONE;
  if (initialArch === "maxillary" && arch === "mandibular") return NONE;
  if (initialArch === "mandibular" && arch === "maxillary") return NONE;
  return getProductLayers(initialProductDetails);
}

/** Tooth chart should use removable extraction UI for the active product. */
export function shouldUseRemovableToothChartPath(params: {
  arch: Arch;
  activeProductCardId: number;
  activeFixedGroupProductId: number | null;
  isActiveProductSelectionOnly: boolean;
}): boolean {
  const { activeProductCardId, activeFixedGroupProductId, isActiveProductSelectionOnly } =
    params;
  return (
    isActiveProductSelectionOnly &&
    !(activeProductCardId === 0 && activeFixedGroupProductId !== null)
  );
}
