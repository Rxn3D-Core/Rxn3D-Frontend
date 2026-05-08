/**
 * Centralized category detection helpers.
 * Detection is based on product API data fields, not category name strings.
 * - Fixed Restoration: has retention_options → hasRetentionOptions(product)
 * - Removable / Orthodontics: no retention_options → !hasRetentionOptions(product)
 */

type ProductForCategoryCheck = {
  retention_options?: unknown[];
  extractions?: unknown[];
} | null | undefined;

type ProductWithRetention = { retention_options?: unknown[] } | null | undefined;

type AnyProduct = { retention_options?: unknown[]; extractions?: unknown[] };

/**
 * Returns true if the product is Fixed Restoration (has retention_options).
 * Use !hasRetentionOptions for Removable Restoration and Orthodontics.
 */
export function hasRetentionOptions(product: ProductWithRetention | ProductForCategoryCheck): boolean {
  const p = product as AnyProduct | null | undefined;
  if (!p) return false;
  return Array.isArray(p.retention_options) && p.retention_options.length > 0;
}

/** @deprecated Use hasRetentionOptions */
export const isFixedCategory = hasRetentionOptions;

/** @deprecated Use !hasRetentionOptions */
export function isRemovableCategory(product: ProductForCategoryCheck): boolean {
  return !hasRetentionOptions(product);
}

/** @deprecated Use !hasRetentionOptions */
export function isOrthodonticsCategory(product: ProductForCategoryCheck): boolean {
  return !hasRetentionOptions(product);
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
