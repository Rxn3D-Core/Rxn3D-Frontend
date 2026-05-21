import type { Arch, AddedProduct, ProductApiData } from "../types";
import { parseImpressionKey } from "./impressionFieldSync";
import { listRemovableCardIdsOnArch } from "./archSharedRemovable";

/** Merge impression qty keys for one arch from any product into a single snapshot. */
export function getArchImpressionSnapshot(
  selectedImpressions: Record<string, number>,
  arch: Arch
): Map<string, number> {
  const snapshot = new Map<string, number>();
  for (const [key, qty] of Object.entries(selectedImpressions)) {
    if (qty <= 0) continue;
    const parsed = parseImpressionKey(key);
    if (!parsed || parsed.arch !== arch) continue;
    snapshot.set(parsed.code, Math.max(snapshot.get(parsed.code) ?? 0, qty));
  }
  return snapshot;
}

export function archHasAnyImpressionSelections(
  selectedImpressions: Record<string, number>,
  arch: Arch
): boolean {
  return getArchImpressionSnapshot(selectedImpressions, arch).size > 0;
}

export function collectImpressionProductIdsForArch(
  arch: Arch,
  options: {
    card0IsRemovable: boolean;
    addedProducts: AddedProduct[];
    maxillaryRetentionTypes: Record<number, string[]>;
    mandibularRetentionTypes: Record<number, string[]>;
    getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null;
    initialProductDetails?: ProductApiData | null;
  }
): string[] {
  const ids = new Set<string>();

  if (options.card0IsRemovable) {
    ids.add("0");
    if (options.initialProductDetails?.id != null) {
      ids.add(String(options.initialProductDetails.id));
    }
  }

  for (const ap of options.addedProducts) {
    if (ap.arch !== arch) continue;
    ids.add(String(ap.id));
    if (ap.productId != null) ids.add(String(ap.productId));
    if (ap.product?.id != null) ids.add(String(ap.product.id));
  }

  const retentionTypes =
    arch === "maxillary"
      ? options.maxillaryRetentionTypes
      : options.mandibularRetentionTypes;
  for (const tn of Object.keys(retentionTypes)) {
    const product = options.getToothProduct(arch, Number(tn));
    if (product?.id != null) ids.add(String(product.id));
  }

  for (const cardId of listRemovableCardIdsOnArch(
    arch,
    options.addedProducts,
    options.card0IsRemovable
  )) {
    ids.add(String(cardId));
  }

  return [...ids];
}

/** Write the arch snapshot to every product id on that arch (single shared impression model). */
export function applyArchImpressionSnapshot(
  selectedImpressions: Record<string, number>,
  arch: Arch,
  productIds: string[],
  snapshot: Map<string, number>
): Record<string, number> {
  const next = { ...selectedImpressions };
  const existingProductIds = new Set<string>();

  for (const [key, qty] of Object.entries(selectedImpressions)) {
    if (qty <= 0) continue;
    const parsed = parseImpressionKey(key);
    if (parsed?.arch === arch) {
      existingProductIds.add(parsed.productId);
    }
  }

  for (const key of Object.keys(next)) {
    const parsed = parseImpressionKey(key);
    if (parsed?.arch === arch) delete next[key];
  }

  const uniqueIds = [...new Set(productIds)];
  const targetIds =
    uniqueIds.length > 0
      ? uniqueIds
      : existingProductIds.size > 0
        ? [...existingProductIds]
        : ["0"];
  for (const productId of targetIds) {
    for (const [code, qty] of snapshot) {
      if (qty > 0) {
        next[`${productId}_${arch}_${code}`] = qty;
      }
    }
  }

  return next;
}

export function normalizeArchSharedImpressions(
  selectedImpressions: Record<string, number>,
  arches: Arch[],
  getProductIdsForArch: (arch: Arch) => string[]
): Record<string, number> {
  let next = selectedImpressions;
  for (const arch of arches) {
    const snapshot = getArchImpressionSnapshot(next, arch);
    if (snapshot.size === 0) continue;
    next = applyArchImpressionSnapshot(next, arch, getProductIdsForArch(arch), snapshot);
  }
  return next;
}

/** Prefer an existing product id that already has arch selections; otherwise use the opener. */
export function resolveCanonicalImpressionProductId(
  selectedImpressions: Record<string, number>,
  arch: Arch,
  preferredProductId: string
): string {
  const snapshot = getArchImpressionSnapshot(selectedImpressions, arch);
  if (snapshot.size === 0) return preferredProductId;

  for (const [key] of Object.entries(selectedImpressions)) {
    const parsed = parseImpressionKey(key);
    if (parsed?.arch === arch && (selectedImpressions[key] ?? 0) > 0) {
      return parsed.productId;
    }
  }
  return preferredProductId;
}

export function buildImpressionDisplayTextForArch(
  selectedImpressions: Record<string, number>,
  arch: Arch,
  resolveLabel: (code: string) => string
): string {
  const snapshot = getArchImpressionSnapshot(selectedImpressions, arch);
  return [...snapshot.entries()]
    .map(([code, qty]) => `${qty}x ${resolveLabel(code)}`)
    .join(", ");
}
