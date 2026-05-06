/**
 * Centralized category detection helpers.
 * Detection is based on product API data fields, not category name strings.
 * - Fixed Restoration: has retention_options
 * - Removable Restoration: has extractions, no retention_options
 * - Orthodontics: has neither extractions nor retention_options
 */

type ProductForCategoryCheck = {
  retention_options?: unknown[];
  extractions?: unknown[];
} | null | undefined;

type ProductWithRetention = { retention_options?: unknown[] } | null | undefined;

/**
 * Returns true if the product has retention options configured.
 * Fixed products are tooth-based and always have retention_options.
 * Removable/Orthodontics products do not.
 */
export function hasRetentionOptions(product: ProductWithRetention): boolean {
  if (!product) return false;
  return Array.isArray(product.retention_options) && product.retention_options.length > 0;
}

/** Returns true if the product is Fixed Restoration (has retention_options) */
export function isFixedCategory(product: ProductForCategoryCheck): boolean {
  if (!product) return false;
  return Array.isArray(product.retention_options) && product.retention_options.length > 0;
}

/** Returns true if the product is Removable Restoration (has extractions, no retention_options) */
export function isRemovableCategory(product: ProductForCategoryCheck): boolean {
  if (!product) return false;
  const hasExtractions = Array.isArray(product.extractions) && product.extractions.length > 0;
  const hasRetention = Array.isArray(product.retention_options) && product.retention_options.length > 0;
  return hasExtractions && !hasRetention;
}

/** Returns true if the product is Orthodontics (has neither extractions nor retention_options) */
export function isOrthodonticsCategory(product: ProductForCategoryCheck): boolean {
  if (!product) return false;
  const hasRetention = Array.isArray(product.retention_options) && product.retention_options.length > 0;
  const hasExtractions = Array.isArray(product.extractions) && product.extractions.length > 0;
  return !hasRetention && !hasExtractions;
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
