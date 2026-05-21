import type {
  AddedProduct,
  Arch,
  ImpressionOptionForModal,
  ProductApiData,
  RetentionType,
} from "../types";
import { productImpressionsToModalOptions } from "../types";
import { isOppositeImpressionEnabled } from "./opposingImpressionReadiness";
import {
  archHasImpressionSelections,
  buildImpressionDisplayText,
  getDualModalArches,
  impressionTouchKey,
  mergeCatalogWithArchSelections,
  reconcileArchSelectionsWithCatalog,
} from "./impressionStorage";
import type { SlipImpressionSelections } from "./impressionStorage";

export { getDualModalArches, impressionTouchKey, buildImpressionDisplayText, archHasImpressionSelections };

/** @deprecated Product id no longer used in impression keys; kept for call-site compatibility. */
export const ARCH_IMPRESSION_PRODUCT_ID = "0";

export function getImpressionOptionsForProduct(
  product: ProductApiData | null | undefined
): ImpressionOptionForModal[] {
  return productImpressionsToModalOptions(product?.impressions);
}

/** Map stored code to display name using product catalog options. */
export function resolveImpressionName(
  code: string,
  options: ImpressionOptionForModal[]
): string {
  const impression = options.find(
    (i) => i.value === code || i.code === code || i.name === code
  );
  return impression?.name || code;
}

const MAXILLARY_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const MANDIBULAR_TEETH = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

export function resolveProductForImpression(
  arch: Arch,
  productId: string,
  getToothProduct: (arch: Arch, tooth: number) => ProductApiData | null,
  initialProductDetails: ProductApiData | null | undefined,
  toothNumber?: number
): ProductApiData | null {
  if (toothNumber != null) {
    const fromTooth = getToothProduct(arch, toothNumber);
    if (fromTooth) return fromTooth;
  }
  if (
    initialProductDetails &&
    (initialProductDetails.id?.toString() === productId || productId === "0")
  ) {
    return initialProductDetails;
  }
  const allTeeth = arch === "maxillary" ? MAXILLARY_TEETH : MANDIBULAR_TEETH;
  for (const tn of allTeeth) {
    const p = getToothProduct(arch, tn);
    if (p?.id?.toString() === productId) return p;
  }
  return null;
}

export function archHasActiveImpressionSelections(
  selectedImpressions: SlipImpressionSelections,
  _productId: string,
  arch: Arch
): boolean {
  void _productId;
  return archHasImpressionSelections(selectedImpressions, arch);
}

/** Union impression catalog from every product row on an arch (survives per-product API reload). */
export function collectImpressionCatalogForArch(
  arch: Arch,
  getToothProduct: (arch: Arch, tooth: number) => ProductApiData | null,
  retentionTypes: Record<number, RetentionType[]>,
  addedProducts: AddedProduct[] | undefined,
  initialProductDetails?: ProductApiData | null,
  initialArch?: Arch | "both" | null
): ImpressionOptionForModal[] {
  const seen = new Map<string, ImpressionOptionForModal>();
  const addProduct = (product: ProductApiData | null | undefined) => {
    for (const opt of getImpressionOptionsForProduct(product)) {
      const code = opt.code ?? opt.value ?? opt.name;
      if (code && !seen.has(code)) seen.set(code, opt);
    }
  };

  for (const tn of Object.keys(retentionTypes).map(Number)) {
    if (!Number.isFinite(tn)) continue;
    addProduct(getToothProduct(arch, tn));
  }

  for (const ap of addedProducts ?? []) {
    if (ap.arch !== arch) continue;
    addProduct(ap.product as ProductApiData | null | undefined);
    if (ap.id) {
      addProduct(getToothProduct(arch, -ap.id));
    }
  }

  if (initialProductDetails) {
    const includeForSlipArch =
      initialArch === "both" || initialArch === arch || initialArch == null;
    // Single-arch removable + opposing scan: lower/upper grid uses the same product catalog.
    const includeForOpposingJawOnSingleArchSlip =
      initialArch != null &&
      initialArch !== "both" &&
      initialArch !== arch &&
      isOppositeImpressionEnabled(initialProductDetails);
    if (includeForSlipArch || includeForOpposingJawOnSingleArchSlip) {
      addProduct(initialProductDetails);
    }
  }

  return [...seen.values()];
}

/** Dedupe impression options by code (first catalog wins for metadata). */
export function unionImpressionCatalogs(
  ...catalogs: ImpressionOptionForModal[][]
): ImpressionOptionForModal[] {
  const seen = new Map<string, ImpressionOptionForModal>();
  for (const catalog of catalogs) {
    for (const opt of catalog) {
      const code = opt.code ?? opt.value ?? opt.name;
      if (code && !seen.has(code)) seen.set(code, opt);
    }
  }
  return [...seen.values()];
}

/** All impression types available on the slip (both jaws), for dual-grid modals. */
export function collectSlipWideImpressionCatalog(
  getToothProduct: (arch: Arch, tooth: number) => ProductApiData | null,
  maxillaryRetentionTypes: Record<number, RetentionType[]>,
  mandibularRetentionTypes: Record<number, RetentionType[]>,
  addedProducts: AddedProduct[] | undefined,
  initialProductDetails?: ProductApiData | null,
  initialArch?: Arch | "both" | null
): ImpressionOptionForModal[] {
  return unionImpressionCatalogs(
    collectImpressionCatalogForArch(
      "maxillary",
      getToothProduct,
      maxillaryRetentionTypes,
      addedProducts,
      initialProductDetails,
      initialArch
    ),
    collectImpressionCatalogForArch(
      "mandibular",
      getToothProduct,
      mandibularRetentionTypes,
      addedProducts,
      initialProductDetails,
      initialArch
    )
  );
}

export function buildImpressionModalOptions(
  arch: Arch,
  selectedImpressions: SlipImpressionSelections,
  catalog: ImpressionOptionForModal[],
  mockFallback: ImpressionOptionForModal[]
): ImpressionOptionForModal[] {
  const merged = mergeCatalogWithArchSelections(
    catalog,
    selectedImpressions[arch]
  );
  if (merged.length > 0) return merged;
  if (archHasImpressionSelections(selectedImpressions, arch)) {
    return selectedImpressions[arch]
      .filter((e) => e.qty > 0)
      .map((entry) => ({
        id: entry.impression_id,
        name: entry.name || entry.code,
        code: entry.code,
        value: entry.code,
        label: entry.name || entry.code,
      }));
  }
  return catalog.length > 0 ? catalog : mockFallback;
}

export {
  mergeCatalogWithArchSelections,
  reconcileArchSelectionsWithCatalog,
};
