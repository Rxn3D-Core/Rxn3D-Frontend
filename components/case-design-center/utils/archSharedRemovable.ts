import type { Arch, AddedProduct, ProductApiData, ProductExtraction } from "../types";
import { hasRetentionOptions } from "./categoryHelpers";

/** Single acknowledgement slot for arch-wide extraction / tooth-status setup. */
export const ARCH_SHARED_REMOVABLE_ACK_CARD_ID = -1;

export function archHasRemovableProducts(
  arch: Arch,
  options: {
    card0IsRemovable: boolean;
    addedProducts: AddedProduct[];
  }
): boolean {
  if (options.card0IsRemovable) return true;
  return options.addedProducts.some(
    (ap) => ap.arch === arch && ap.product != null && !hasRetentionOptions(ap.product)
  );
}

function isActiveExtractionRow(e: ProductExtraction): boolean {
  if (String(e.status ?? "Active").trim().toLowerCase() === "inactive") return false;
  if (e.name == null || e.code == null) return false;
  if (String(e.name).trim() === "" || String(e.code).trim() === "") return false;
  return true;
}

/** Union of active extractions from all removable products on an arch (deduped by code). */
export function mergeArchRemovableExtractions(
  sources: Array<{ extractions?: ProductExtraction[] | null } | null | undefined>
): ProductExtraction[] {
  const byCode = new Map<string, ProductExtraction>();
  for (const src of sources) {
    for (const e of src?.extractions ?? []) {
      if (!isActiveExtractionRow(e)) continue;
      if (!byCode.has(e.code)) byCode.set(e.code, e);
    }
  }
  return [...byCode.values()].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

export function collectArchRemovableProductSources(
  arch: Arch,
  allArchTeeth: number[],
  addedProducts: AddedProduct[],
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null,
  getToothProductCard: (arch: Arch, toothNumber: number) => number,
  card0IsRemovable: boolean,
  card0Extractions?: ProductExtraction[],
  initialProductDetails?: ProductApiData | null
): Array<ProductApiData | null | undefined> {
  const sources: Array<ProductApiData | null | undefined> = [];

  if (card0IsRemovable) {
    const card0Tn = allArchTeeth.find(
      (tn) => getToothProductCard(arch, tn) === 0 && getToothProduct(arch, tn)
    );
    if (card0Tn != null) {
      sources.push(getToothProduct(arch, card0Tn));
    } else if (initialProductDetails) {
      sources.push(initialProductDetails);
    } else if (card0Extractions?.length) {
      sources.push({ extractions: card0Extractions } as ProductApiData);
    }
  }

  for (const ap of addedProducts) {
    if (ap.arch !== arch) continue;
    if (ap.product && hasRetentionOptions(ap.product)) continue;
    const assigned = allArchTeeth
      .filter((tn) => getToothProductCard(arch, tn) === ap.id)
      .sort((a, b) => a - b);
    const repTn = assigned.length > 0 ? assigned[0] : -ap.id;
    sources.push(getToothProduct(arch, repTn) ?? ap.product ?? null);
  }

  return sources;
}

export function listRemovableCardIdsOnArch(
  arch: Arch,
  addedProducts: AddedProduct[],
  card0IsRemovable: boolean
): number[] {
  const ids: number[] = [];
  if (card0IsRemovable) ids.push(0);
  for (const ap of addedProducts) {
    if (ap.arch !== arch) continue;
    if (ap.product && hasRetentionOptions(ap.product)) continue;
    ids.push(ap.id);
  }
  return ids;
}

export function getRepToothForRemovableCard(
  arch: Arch,
  cardId: number,
  allArchTeeth: number[],
  getToothProductCard: (arch: Arch, toothNumber: number) => number,
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null
): number {
  if (cardId !== 0) {
    const assigned = allArchTeeth
      .filter((tn) => getToothProductCard(arch, tn) === cardId)
      .sort((a, b) => a - b);
    if (assigned.length > 0) return assigned[0];
    return -cardId;
  }

  const card0Assigned = allArchTeeth
    .filter((tn) => getToothProductCard(arch, tn) === 0 && getToothProduct(arch, tn))
    .sort((a, b) => a - b);
  if (card0Assigned.length > 0) return card0Assigned[0];
  return allArchTeeth[0] ?? (arch === "maxillary" ? 1 : 17);
}
