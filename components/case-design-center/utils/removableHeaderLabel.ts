export function getRemovableHeaderTitle({
  productName,
  hasVariation,
  teethCount,
  isFullDenture,
  hasVariationMatch,
}: {
  productName: string;
  hasVariation?: string | boolean | null;
  teethCount: number;
  isFullDenture: boolean;
  hasVariationMatch: boolean;
}): string {
  if (isFullDenture) return productName;

  const variationDisabled =
    hasVariation === false ||
    hasVariation === "No" ||
    hasVariation === "no";

  if (variationDisabled) {
    return productName;
  }

  return productName;
}

export function shouldShowRemovableHeaderContent({
  hasProduct,
  hasVariation,
  teethCount = 0,
  caseSubmitted,
}: {
  hasProduct: boolean;
  hasVariation?: string | boolean | null;
  teethCount?: number;
  caseSubmitted?: boolean;
}): boolean {
  const variationEnabled =
    hasVariation === true ||
    hasVariation === "Yes" ||
    hasVariation === "yes";

  if (variationEnabled) {
    return hasProduct || teethCount > 0 || !!caseSubmitted;
  }

  return hasProduct || !!caseSubmitted;
}
