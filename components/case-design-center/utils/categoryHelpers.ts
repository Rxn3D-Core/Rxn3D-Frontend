/**
 * Centralized category detection helpers.
 * Detection is based on product API data fields, not category name strings.
 * - Products with retention options: hasRetentionOptions(product)
 * - Products without retention options: isNonRetentionCategory(product)
 */

type ProductForCategoryCheck = {
  retention_options?: unknown[];
  extractions?: unknown[];
  has_retention?: string | boolean | null;
} | null | undefined;

type ProductWithRetention = { retention_options?: unknown[]; has_retention?: string | boolean | null } | null | undefined;

type AnyProduct = { retention_options?: unknown[]; extractions?: unknown[]; has_retention?: string | boolean | null };

export function hasRetentionOptions(product: ProductWithRetention | ProductForCategoryCheck): boolean {
  const p = product as AnyProduct | null | undefined;
  if (!p) return false;

  if (p.has_retention === true || p.has_retention === "Yes" || p.has_retention === "yes") {
    return true;
  }
  if (p.has_retention === false || p.has_retention === "No" || p.has_retention === "no") {
    return false;
  }

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

function normalizeYesNo(value: unknown): "Yes" | "No" | undefined {
  if (value === true || value === "Yes" || value === "yes") return "Yes";
  if (value === false || value === "No" || value === "no") return "No";
  return undefined;
}

export type ProductStageOption = { name: string; is_default?: string };

export type ProductForStageSelection = {
  is_single_stage?: string | boolean;
  has_stage?: string | boolean | null;
  stages?: ProductStageOption[];
};

/** Legacy label — do not show or persist in the stage field UI. */
export const SKIPPED_STAGE_LABEL = "Single Stage";

/**
 * Show the stage field only when the product has one or more stages in stages[] and
 * flags allow stage selection (not has_stage No, not is_single_stage Yes).
 */
export function productHasStageField(
  product: ProductForStageSelection | null | undefined
): boolean {
  if (!product) return false;
  if (normalizeYesNo(product.has_stage) === "No") return false;
  if (normalizeYesNo(product.is_single_stage) === "Yes") return false;
  if (!Array.isArray(product.stages) || product.stages.length === 0) return false;
  return true;
}

/** True when the stage field / picker must not be shown. */
export function shouldSkipStageSelection(
  product: ProductForStageSelection | null | undefined
): boolean {
  return !productHasStageField(product);
}

/** Stage value safe to show in accordion badges and fieldsets (never the skip placeholder). */
export function isDisplayableStageValue(value: string | undefined | null): boolean {
  const v = value?.trim();
  return !!v && v !== SKIPPED_STAGE_LABEL;
}

export type StageSelectionResolution =
  | { kind: "skip" }
  | { kind: "auto"; stageName: string }
  | { kind: "prompt" };

/** Resolve auto-select vs user prompt when the stage field is shown. */
export function resolveStageSelection(
  product: ProductForStageSelection | null | undefined
): StageSelectionResolution {
  if (!productHasStageField(product)) {
    return { kind: "skip" };
  }

  const stages = product!.stages!;
  if (stages.length === 1) {
    const name = stages[0]?.name?.trim();
    return name ? { kind: "auto", stageName: name } : { kind: "skip" };
  }

  const defaultStage = stages.find((s) => normalizeYesNo(s.is_default) === "Yes");
  const defaultName = defaultStage?.name?.trim();
  if (defaultName) {
    return { kind: "auto", stageName: defaultName };
  }

  return { kind: "prompt" };
}

/** True when the user can open the stage picker to choose among multiple stages. */
export function productHasSelectableStages(
  product: ProductForStageSelection | null | undefined
): boolean {
  return Array.isArray(product?.stages) && product.stages.length > 1;
}

/** Stage name to apply without opening the modal, or null when the user must choose or field is hidden. */
export function getResolvedStageName(
  product: ProductForStageSelection | null | undefined
): string | null {
  const resolution = resolveStageSelection(product);
  if (resolution.kind === "auto") return resolution.stageName;
  return null;
}

/** @deprecated Use shouldSkipStageSelection — kept for existing call sites. */
export function isSingleStageNoStages(
  product: ProductForStageSelection | null | undefined
): boolean {
  return shouldSkipStageSelection(product);
}
