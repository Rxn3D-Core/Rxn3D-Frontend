/**
 * Centralized category detection helpers.
 * Detection is based on product API data fields, not category name strings.
 * - Products with retention options: hasRetentionOptions(product)
 * - Products without retention options: isNonRetentionCategory(product)
 */

type ProductForCategoryCheck = {
  retention_options?: unknown[];
  extractions?: unknown[];
} | null | undefined;

type ProductWithRetention = { retention_options?: unknown[] } | null | undefined;

type AnyProduct = { retention_options?: unknown[]; extractions?: unknown[] };

export function hasRetentionOptions(product: ProductWithRetention | ProductForCategoryCheck): boolean {
  const p = product as AnyProduct | null | undefined;
  if (!p) return false;
  return Array.isArray(p.retention_options) && p.retention_options.length > 0;
}

export function isNonRetentionCategory(product: ProductForCategoryCheck): boolean {
  return !hasRetentionOptions(product);
}

export function isOrthodonticsCategory(product: ProductForCategoryCheck): boolean {
  return isNonRetentionCategory(product);
}

/** Get the normalized category name from a product's nested subcategory */
export function getCategoryName(product: { subcategory?: { category?: { name?: string } } } | null | undefined): string {
  return product?.subcategory?.category?.name ?? "";
}

/** Returns true if the product is a single-stage product where the stage picker should be skipped.
 *  Covers both cases: is_single_stage=Yes with no stages configured, and is_single_stage=Yes
 *  with stages present (auto-selected by AutoSelectSingleStage). In either case, no manual
 *  stage selection is needed and the AutoOpenStageIfEmpty trigger must be suppressed. */
export function isSingleStageNoStages(product: { is_single_stage?: string; stages?: unknown[] } | null | undefined): boolean {
  if (!product) return false;
  return product.is_single_stage === "Yes";
}
