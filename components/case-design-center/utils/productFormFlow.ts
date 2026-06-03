import type { ProductApiData } from "../types";
import { productSupportsAddons } from "./addonDisplayHelpers";

export interface ProductFormFlags {
  hasRetentionOptions: boolean;
  hasExtractions: boolean;
  hasGrade: boolean;
  hasStage: boolean;
  hasTeethShade: boolean;
  hasGumShade: boolean;
  hasVariations: boolean;
  hasAdvanceFields: boolean;
  hasImpressions: boolean;
  hasAddons: boolean;
}

export function getProductFormFlags(product: ProductApiData | null): ProductFormFlags {
  if (!product) {
    return {
      hasRetentionOptions: false,
      hasExtractions: false,
      hasGrade: false,
      hasStage: false,
      hasTeethShade: false,
      hasGumShade: false,
      hasVariations: false,
      hasAdvanceFields: false,
      hasImpressions: false,
      hasAddons: false,
    };
  }
  return {
    hasRetentionOptions: product.has_retention === "Yes" || (product.retention_options?.length ?? 0) > 0,
    hasExtractions: product.has_extraction === "Yes",
    hasGrade: product.has_grade === "Yes" || (product.has_multiple_grades === "Yes" && (product.grades?.length ?? 0) > 0),
    hasStage: product.has_stage === "Yes",
    hasTeethShade: product.has_teeth_shade === "Yes",
    hasGumShade: product.has_gum_shade === "Yes",
    hasVariations: product.has_variation === "Yes" || product.has_variation === true,
    hasAdvanceFields: product.has_advance_field === "Yes",
    hasImpressions: product.has_impression === "Yes",
    hasAddons: productSupportsAddons(product),
  };
}
