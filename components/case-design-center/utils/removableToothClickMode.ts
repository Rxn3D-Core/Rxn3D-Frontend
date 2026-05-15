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

export function shouldAddToProductSelectionOnRemovableClick({
  activeProductIsRemovables,
  activeExtractionCode,
}: {
  activeProductIsRemovables: boolean;
  activeExtractionCode: string | null;
}): boolean {
  return getRemovableToothClickMode({
    activeProductIsRemovables,
    activeExtractionCode,
  }) !== null;
}
