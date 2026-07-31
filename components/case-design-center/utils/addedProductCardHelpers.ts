import type { AddedProduct, Arch, ProductApiData, ProductExtraction } from "../types";
import { addedProductAppliesToArch } from "./activeProductChartMode.ts";
import {
  resolveAddedCardProductData,
  resolveAddedCardRepTooth,
} from "./resolveAddedCardProduct.ts";

type GetToothProduct = (arch: Arch, toothNumber: number) => ProductApiData | null | undefined;
type GetToothProductCard = (arch: Arch, toothNumber: number) => number;

/** Find the active added product when cardId > 0; undefined for card 0. */
export function findAddedProductByCardId(
  addedProducts: readonly AddedProduct[] | undefined,
  cardId: number
): AddedProduct | undefined {
  if (cardId === 0) return undefined;
  return (addedProducts ?? []).find((p) => p.id === cardId);
}

/** Active added product that applies to this arch (undefined for card 0). */
export function resolveActiveAddedProductOnArch(
  addedProducts: readonly AddedProduct[] | undefined,
  activeProductCardId: number,
  arch: Arch
): AddedProduct | undefined {
  const ap = findAddedProductByCardId(addedProducts, activeProductCardId);
  if (!addedProductAppliesToArch(ap, arch)) return undefined;
  return ap;
}

/**
 * Product API data for an added card (teeth → virtual −cardId → stub).
 * Card 0 callers must not use this — keep using card0InitialProduct / selectedProductId.
 */
export function resolveAddedCardProduct(
  arch: Arch,
  ap: AddedProduct,
  allArchTeeth: readonly number[],
  getToothProduct: GetToothProduct,
  getToothProductCard: GetToothProductCard
): ProductApiData | null {
  const cardTeeth = allArchTeeth.filter(
    (tn) => getToothProductCard(arch, tn) === ap.id
  );
  return resolveAddedCardProductData(
    arch,
    ap.id,
    cardTeeth,
    getToothProduct,
    (ap.product as ProductApiData | null | undefined) ?? null
  );
}

/** Extractions list for an added card (resolved product, else stub). */
export function resolveAddedCardExtractions(
  arch: Arch,
  ap: AddedProduct,
  allArchTeeth: readonly number[],
  getToothProduct: GetToothProduct,
  getToothProductCard: GetToothProductCard
): ProductExtraction[] | undefined {
  const product = resolveAddedCardProduct(
    arch,
    ap,
    allArchTeeth,
    getToothProduct,
    getToothProductCard
  );
  return product?.extractions ?? (ap.product as ProductApiData | undefined)?.extractions;
}

/** Representative tooth for field keys on an added card (may be −cardId). */
export function resolveAddedCardFieldTooth(
  arch: Arch,
  ap: AddedProduct,
  allArchTeeth: readonly number[],
  getToothProduct: GetToothProduct,
  getToothProductCard: GetToothProductCard
): number {
  const cardTeeth = allArchTeeth.filter(
    (tn) => getToothProductCard(arch, tn) === ap.id
  );
  return resolveAddedCardRepTooth(cardTeeth, ap.id, getToothProduct, arch);
}

/**
 * Header tooth list for an added fixed card.
 * Callers pass default-chart productTeeth when the product has a default tooth chart
 * so TIM/bridge rows appear like card 0 (not only selected implants).
 */
export function resolveAddedFixedCardHeaderTeeth(params: {
  assignedTeeth: readonly number[];
  defaultChartProductTeeth?: readonly number[];
}): number[] {
  const { assignedTeeth, defaultChartProductTeeth = [] } = params;
  return [...new Set([...assignedTeeth, ...defaultChartProductTeeth])].sort(
    (a, b) => a - b
  );
}
