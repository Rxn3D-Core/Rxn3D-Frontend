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

/**
 * Returns the product's custom tooth-chart label when it opted in
 * (`enable_custom_label === "Yes"`) and provided a non-empty `custom_label`;
 * otherwise null. Used to override the default "Select teeth to replace …"
 * prompt above the slip tooth chart while keeping current behavior for
 * products without a custom label.
 */
export function resolveProductCustomLabel(product: unknown): string | null {
  if (!product || typeof product !== "object") return null;
  const p = product as { enable_custom_label?: unknown; custom_label?: unknown };
  if (p.enable_custom_label !== "Yes") return null;
  const label = typeof p.custom_label === "string" ? p.custom_label.trim() : "";
  return label.length > 0 ? label : null;
}
