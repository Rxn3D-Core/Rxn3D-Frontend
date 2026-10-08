import {
  isOverlayExtractionCode,
  type ExtractionLike,
} from "./extractionHelpers";

export function getRemovableToothClickMode({
  activeProductIsRemovables,
  activeExtractionCode,
}: {
  activeProductIsRemovables: boolean;
  activeExtractionCode: string | null;
}): "status_assignment" | "product_selection" | null {
  if (!activeProductIsRemovables) return null;
  return activeExtractionCode ? "status_assignment" : "product_selection";
}

/**
 * Whether a removable tooth click should also add the tooth to product selection
 * (orange header / accordion panel). Overlay statuses (clasps) never count —
 * they are chart overlays only, not flipper/stayplate product teeth.
 */
export function shouldAddToProductSelectionOnRemovableClick({
  activeProductIsRemovables,
  activeExtractionCode,
  extractions,
}: {
  activeProductIsRemovables: boolean;
  activeExtractionCode: string | null;
  extractions?: ReadonlyArray<ExtractionLike> | null;
}): boolean {
  if (
    activeExtractionCode &&
    isOverlayExtractionCode(activeExtractionCode, extractions)
  ) {
    return false;
  }
  return getRemovableToothClickMode({
    activeProductIsRemovables,
    activeExtractionCode,
  }) !== null;
}
