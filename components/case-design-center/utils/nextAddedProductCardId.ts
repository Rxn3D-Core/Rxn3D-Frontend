import type { AddedProduct } from "../types";

/**
 * Next card id for an added product (cards 1, 2, 3…).
 * Card 0 is reserved for the initial wizard product and is never allocated here.
 */
export function nextAddedProductCardId(
  existing: readonly Pick<AddedProduct, "id">[] | undefined
): number {
  let maxId = 0;
  for (const product of existing ?? []) {
    if (typeof product.id === "number" && product.id > maxId) {
      maxId = product.id;
    }
  }
  return maxId + 1;
}
