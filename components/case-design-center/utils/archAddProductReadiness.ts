import type { Arch, AddedProduct, ProductApiData } from "../types";
import { hasRetentionOptions } from "./categoryHelpers.ts";

function isActiveExtractionRow(e: {
  status?: string;
  name?: string | null;
  code?: string | null;
}): boolean {
  if (String(e.status ?? "Active").trim().toLowerCase() === "inactive") return false;
  if (e.name == null || e.code == null) return false;
  if (String(e.name).trim() === "" || String(e.code).trim() === "") return false;
  return true;
}

function isSingleDefaultOnlyExtractionList(
  extractions: ProductApiData["extractions"]
): boolean {
  const active = (extractions ?? []).filter(isActiveExtractionRow);
  if (active.length !== 1) return false;
  return String(active[0].is_default ?? "").trim().toLowerCase() === "yes";
}
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
  /**
   * Hide add control when any product on this arch has a single default extraction
   * only (full-arch auto-select). Prevents tooth-ownership collisions such as
   * Full Denture + Hard Reline on the same arch.
   */
  hasSingleDefaultOnlyProduct?: boolean;
};

/**
 * Whether the "+ Add product" control should appear for an arch.
 * - Existing products on the arch must all be complete before another can be added.
 * - When the arch has no products yet, allow add once the opposite arch is fully configured.
 * - Single-default-only products block additional products on that arch.
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
  hasSingleDefaultOnlyProduct,
}: ArchAddProductReadinessInput): boolean {
  if (caseSubmitted) return false;
  if (inlineAddProductArch != null) return false;
  if (atProductLimit) return false;
  if (hasSingleDefaultOnlyProduct) return false;

  if (hasProductsOnArch) {
    return allAccordionsCompleteOnArch && !archIncomplete && !removableCard0Blocked;
  }

  if (initialArch === arch) return false;

  if (!oppositeArchHasProducts) return false;

  return oppositeArchReady;
}

/** Removable product whose only active extraction is the marked default. */
export function isSingleDefaultOnlyProduct(
  product: ProductApiData | null | undefined
): boolean {
  if (!product || hasRetentionOptions(product)) return false;
  return isSingleDefaultOnlyExtractionList(product.extractions);
}

/**
 * True when any removable product already on this arch is single-default-only
 * (card 0 and/or added cards).
 */
export function archHasSingleDefaultOnlyProduct(
  arch: Arch,
  options: {
    initialArch?: "maxillary" | "mandibular" | "both";
    initialProductDetails?: ProductApiData | null;
    selectedProductId?: number;
    addedProducts?: AddedProduct[];
    card0Removed?: boolean;
  }
): boolean {
  const addedOnArch = (options.addedProducts ?? []).filter((ap) => ap.arch === arch);
  for (const ap of addedOnArch) {
    if (isSingleDefaultOnlyProduct(ap.product as ProductApiData | undefined)) {
      return true;
    }
  }

  if (options.card0Removed) return false;
  if (addedOnArch.some((ap) => ap.replacesInitialProduct)) return false;

  const card0OnArch =
    !!options.selectedProductId &&
    (options.initialArch === arch || options.initialArch === "both");
  if (!card0OnArch) return false;

  return isSingleDefaultOnlyProduct(options.initialProductDetails ?? null);
}

export function filterAddedProductsForArch(
  addedProducts: AddedProduct[] | undefined,
  arch: Arch
): AddedProduct[] {
  return (addedProducts ?? []).filter((ap) => ap.arch === arch);
}

/** Header "+ Add product" label — first product vs additional product on the same arch. */
export function addProductButtonLabel(arch: Arch, hasProductsOnArch: boolean): string {
  const archName = arch === "maxillary" ? "MAXILLARY" : "MANDIBULAR";
  return hasProductsOnArch ? `ANOTHER ${archName} PRODUCT` : `${archName} PRODUCT`;
}
