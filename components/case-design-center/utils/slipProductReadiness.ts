import type { AddedProduct, Arch, ProductApiData } from "../types";
import { hasRetentionOptions } from "./categoryHelpers.ts";
import {
  canSkipExtractionToothSelection,
  isFullDentureProduct,
  isSingleDefaultOnlyExtractionList,
} from "./extractionHelpers.ts";
import { areExtractionRequirementsSatisfied } from "./extractionRequirementHelpers.ts";
import {
  resolveAddedCardProductData,
  resolveAddedCardRepTooth,
} from "./resolveAddedCardProduct.ts";
import { listRemovableCardIdsOnArch } from "./archSharedRemovable.ts";
import { getRemovableOrangeHeaderTeeth } from "./removableToothDisplay.ts";

type GetToothProduct = (arch: Arch, toothNumber: number) => ProductApiData | null;
type GetToothProductCard = (arch: Arch, toothNumber: number) => number;

/** True when the arch has any configured product card (teeth optional). */
export function archHasAnyConfiguredProduct({
  hasTeethOrRetentionProducts,
  hasFixedAdded,
  hasRemovableAdded,
}: {
  hasTeethOrRetentionProducts: boolean;
  hasFixedAdded: boolean;
  hasRemovableAdded: boolean;
}): boolean {
  return hasTeethOrRetentionProducts || hasFixedAdded || hasRemovableAdded;
}

/** Product-selected teeth for a removable card (selection list ∩ card ownership). */
export function countRemovableProductTeethOnCard({
  arch,
  cardId,
  selectedTeeth,
  getToothProductCard,
}: {
  arch: Arch;
  cardId: number;
  selectedTeeth: readonly number[];
  getToothProductCard: GetToothProductCard;
}): number {
  return selectedTeeth.filter((tn) => getToothProductCard(arch, tn) === cardId).length;
}

/**
 * Teeth that count toward the product orange header: owned + (selected, or no
 * status code yet). Matches accordion `#…` membership more closely than
 * selection∩ownership alone.
 */
export function countRemovableHeaderTeethOnCard({
  arch,
  cardId,
  allArchTeeth,
  selectedTeeth,
  toothExtractionMap,
  getToothProductCard,
}: {
  arch: Arch;
  cardId: number;
  allArchTeeth: readonly number[];
  selectedTeeth: readonly number[];
  toothExtractionMap: Record<number, string>;
  getToothProductCard: GetToothProductCard;
}): number {
  const selectedSet = new Set(selectedTeeth);
  return allArchTeeth.filter((tn) => {
    if (getToothProductCard(arch, tn) !== cardId) return false;
    const code = toothExtractionMap[tn];
    return selectedSet.has(tn) || !code;
  }).length;
}

/**
 * Removable product card is ready for Submit: product teeth (when required),
 * extraction min/max / required-or-optional rules, and selection field chain.
 */
export function isRemovableCardReadyForSubmit({
  arch,
  cardId,
  product,
  allArchTeeth,
  selectedTeeth,
  toothExtractionMap,
  claspTeeth,
  noActiveBoxTeeth = [],
  getToothProduct,
  getToothProductCard,
  areSelectionFieldsComplete,
}: {
  arch: Arch;
  cardId: number;
  product: ProductApiData | null;
  allArchTeeth: readonly number[];
  selectedTeeth: readonly number[];
  toothExtractionMap: Record<number, string>;
  claspTeeth: readonly number[];
  /** Teeth kept in the orange header while no status box is active. */
  noActiveBoxTeeth?: readonly number[];
  getToothProduct: GetToothProduct;
  getToothProductCard: GetToothProductCard;
  areSelectionFieldsComplete: (args: {
    product: ProductApiData;
    cardId: number;
    cardTeeth: number[];
    repTooth: number;
  }) => boolean;
}): boolean {
  if (!product) return false;

  const ownedTeeth = allArchTeeth.filter(
    (tn) => getToothProductCard(arch, tn) === cardId
  );
  // Same membership as the accordion `#27,28,29` header. Selection-list counts
  // miss product teeth that carry a default status code.
  const headerTeethCount = getRemovableOrangeHeaderTeeth({
    selectedTeeth: [...ownedTeeth],
    toothExtractionMap,
    claspTeeth: [...claspTeeth],
    noActiveBoxTeeth: [...noActiveBoxTeeth],
    extractions: product.extractions,
    isFullDenture: isFullDentureProduct(product.extractions),
    isSingleDefaultOnly: isSingleDefaultOnlyExtractionList(product.extractions),
  }).length;
  const productTeethCount = Math.max(
    headerTeethCount,
    countRemovableProductTeethOnCard({
      arch,
      cardId,
      selectedTeeth,
      getToothProductCard,
    }),
    countRemovableHeaderTeethOnCard({
      arch,
      cardId,
      allArchTeeth,
      selectedTeeth,
      toothExtractionMap,
      getToothProductCard,
    })
  );

  if (
    !canSkipExtractionToothSelection(
      product.extractions,
      product as unknown as Record<string, unknown>
    ) &&
    productTeethCount === 0
  ) {
    return false;
  }

  const cardTeeth =
    ownedTeeth.length > 0
      ? [...ownedTeeth]
      : selectedTeeth.filter((tn) => getToothProductCard(arch, tn) === cardId);

  const repTooth = resolveAddedCardRepTooth(cardTeeth, cardId, getToothProduct, arch);
  const fieldsComplete = areSelectionFieldsComplete({
    product,
    cardId,
    cardTeeth,
    repTooth,
  });
  if (!fieldsComplete) return false;

  // Extractions are enforced by the tooth-status Done gate before fields unlock.
  // Re-checking them here races catalog hydration and hides Submit while every
  // accordion field is already green. Still require them when the card has no
  // product teeth yet (canSkip path with optional statuses).
  if (productTeethCount > 0) return true;

  return areExtractionRequirementsSatisfied(product.extractions, {
    selectedTeeth: [...selectedTeeth],
    toothExtractionMap,
    claspTeeth: [...claspTeeth],
  });
}

/**
 * Every removable card on the arch must be ready.
 * Pass `card0IsRemovable: false` to validate only added cards — card 0 can stay
 * on the legacy side-ready gates so a sole-arch complete product still submits.
 */
export function areArchRemovableProductsReadyForSubmit({
  arch,
  addedProducts,
  card0IsRemovable,
  card0Product,
  allArchTeeth,
  selectedTeeth,
  toothExtractionMap,
  claspTeeth,
  noActiveBoxTeeth,
  getToothProduct,
  getToothProductCard,
  areSelectionFieldsComplete,
}: {
  arch: Arch;
  addedProducts: readonly AddedProduct[];
  card0IsRemovable: boolean;
  card0Product: ProductApiData | null;
  allArchTeeth: readonly number[];
  selectedTeeth: readonly number[];
  toothExtractionMap: Record<number, string>;
  claspTeeth: readonly number[];
  noActiveBoxTeeth?: readonly number[];
  getToothProduct: GetToothProduct;
  getToothProductCard: GetToothProductCard;
  areSelectionFieldsComplete: (args: {
    product: ProductApiData;
    cardId: number;
    cardTeeth: number[];
    repTooth: number;
  }) => boolean;
}): boolean {
  const cardIds = listRemovableCardIdsOnArch(arch, [...addedProducts], card0IsRemovable);
  if (cardIds.length === 0) return true;

  for (const cardId of cardIds) {
    const ownedTeeth = allArchTeeth.filter(
      (tn) => getToothProductCard(arch, tn) === cardId
    );
    const product =
      cardId === 0
        ? resolveAddedCardProductData(
            arch,
            0,
            ownedTeeth,
            getToothProduct,
            card0Product
          )
        : resolveAddedCardProductData(
            arch,
            cardId,
            ownedTeeth,
            getToothProduct,
            addedProducts.find((ap) => ap.id === cardId)?.product ?? null
          );

    if (
      !isRemovableCardReadyForSubmit({
        arch,
        cardId,
        product,
        allArchTeeth,
        selectedTeeth,
        toothExtractionMap,
        claspTeeth,
        noActiveBoxTeeth,
        getToothProduct,
        getToothProductCard,
        areSelectionFieldsComplete,
      })
    ) {
      return false;
    }
  }

  return true;
}

/** Fixed added product on an arch needs at least one retention tooth assigned to that card. */
export function areArchFixedAddedProductsReadyForSubmit({
  arch,
  addedProducts,
  retentionTypesByTooth,
  getToothProductCard,
}: {
  arch: Arch;
  addedProducts: readonly AddedProduct[];
  retentionTypesByTooth: Record<number, unknown>;
  getToothProductCard: GetToothProductCard;
}): boolean {
  const fixedAdded = addedProducts.filter(
    (ap) => ap.arch === arch && hasRetentionOptions(ap.product)
  );
  if (fixedAdded.length === 0) return true;

  for (const ap of fixedAdded) {
    const hasTooth = Object.keys(retentionTypesByTooth).some(
      (tn) => getToothProductCard(arch, Number(tn)) === ap.id
    );
    if (!hasTooth) return false;
  }
  return true;
}
