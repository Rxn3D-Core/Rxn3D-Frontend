import {
  isSingleDefaultOnlyExtractionList,
  type ExtractionLike,
} from "./extractionHelpers";

const FLIPPER_STAYPLATE_NAME = /flipper|stay\s*plate/i;

/** True when the product is a flipper or stay plate removable. */
export function isFlipperOrStayplateProduct(
  productName: string | null | undefined
): boolean {
  return FLIPPER_STAYPLATE_NAME.test(String(productName ?? "").trim());
}

/**
 * Removable chart Rule 2: tooth click opens the status popover when no
 * extraction box is active and the product has multiple status options.
 */
export function isRemovableToothStatusPopoverEligible(
  extractions: ReadonlyArray<ExtractionLike> | undefined | null,
  activeExtractionCode: string | null
): boolean {
  if (activeExtractionCode !== null) return false;
  return !isSingleDefaultOnlyExtractionList(extractions);
}

export function isRemovableToothSelectionFocused({
  caseSubmitted,
  activeProductCardId,
  confirmDetailsChecked,
  isCardActive,
  toothChartInteractionEnabled,
  teethCount,
  isSelectionModeActive,
}: {
  caseSubmitted: boolean;
  activeProductCardId: number | null;
  confirmDetailsChecked: boolean;
  isCardActive: boolean;
  toothChartInteractionEnabled: boolean;
  teethCount: number;
  isSelectionModeActive: boolean;
}): boolean {
  if (caseSubmitted || activeProductCardId === null || confirmDetailsChecked) {
    return false;
  }
  if (!isCardActive || !toothChartInteractionEnabled) return false;
  return teethCount === 0 || isSelectionModeActive;
}

export const FLIPPER_STAYPLATE_SELECTION_HINT =
  "Select teeth that will be included in flipper/stayplate";
