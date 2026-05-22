import type { Arch, ProductApiData } from "../types";

type GetToothProduct = (arch: Arch, toothNumber: number) => ProductApiData | null | undefined;

/** Wizard stub has extractions/retention_options; full library GET adds shades + advance_fields. */
export function isHydratedProductApiData(
  product: ProductApiData | null | undefined
): boolean {
  if (!product?.id) return false;
  if (Array.isArray(product.advance_fields) && product.advance_fields.length > 0) {
    return true;
  }
  if (Array.isArray(product.teeth_shades) && product.teeth_shades.length > 0) {
    return true;
  }
  return false;
}

/** Tooth number used for field progress / shade keys on an added-product card. */
export function resolveAddedCardRepTooth(
  cardTeeth: readonly number[],
  cardId: number,
  getToothProduct: GetToothProduct,
  arch: Arch
): number {
  if (cardTeeth.length > 0) {
    const withProduct = cardTeeth.find((tn) => getToothProduct(arch, tn));
    return withProduct ?? Math.min(...cardTeeth);
  }
  return -cardId;
}

/** First loaded product on any tooth in the card, else virtual slot (-cardId), else stub. */
export function resolveAddedCardProductData(
  arch: Arch,
  cardId: number,
  cardTeeth: readonly number[],
  getToothProduct: GetToothProduct,
  stubProduct: ProductApiData | null | undefined
): ProductApiData | null {
  for (const tn of cardTeeth) {
    const p = getToothProduct(arch, tn);
    if (p) return p;
  }
  return getToothProduct(arch, -cardId) ?? stubProduct ?? null;
}
