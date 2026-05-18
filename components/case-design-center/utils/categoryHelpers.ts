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
  stages?: ProductStageOption[];
};

export const SKIPPED_STAGE_LABEL = "Single Stage";

/**
 * Stage selection rules:
 * - is_single_stage Yes → skip (no picker)
 * - is_single_stage No → if stages[] empty, skip; if 1 stage, auto-select it;
 *   if 2+ stages, auto-select the one with is_default Yes; otherwise prompt user
 */
export type StageSelectionResolution =
  | { kind: "skip"; stageLabel: string }
  | { kind: "auto"; stageName: string }
  | { kind: "prompt" };

export function resolveStageSelection(
  product: ProductForStageSelection | null | undefined
): StageSelectionResolution {
  if (!product) return { kind: "prompt" };

  if (normalizeYesNo(product.is_single_stage) === "Yes") {
    return { kind: "skip", stageLabel: SKIPPED_STAGE_LABEL };
  }

  const stages = Array.isArray(product.stages) ? product.stages : [];
  if (stages.length === 0) {
    return { kind: "skip", stageLabel: SKIPPED_STAGE_LABEL };
  }

  if (stages.length === 1) {
    const name = stages[0]?.name?.trim();
    return name ? { kind: "auto", stageName: name } : { kind: "skip", stageLabel: SKIPPED_STAGE_LABEL };
  }

  const defaultStage = stages.find((s) => normalizeYesNo(s.is_default) === "Yes");
  const defaultName = defaultStage?.name?.trim();
  if (defaultName) {
    return { kind: "auto", stageName: defaultName };
  }

  return { kind: "prompt" };
}

/** True when the stage picker must not be shown (single-stage or no stages configured). */
export function shouldSkipStageSelection(
  product: ProductForStageSelection | null | undefined
): boolean {
  return resolveStageSelection(product).kind === "skip";
}

/** Stage name to apply without opening the modal, or null when the user must choose. */
export function getResolvedStageName(
  product: ProductForStageSelection | null | undefined
): string | null {
  const resolution = resolveStageSelection(product);
  if (resolution.kind === "skip") return resolution.stageLabel;
  if (resolution.kind === "auto") return resolution.stageName;
  return null;
}

/** @deprecated Use shouldSkipStageSelection — kept for existing call sites. */
export function isSingleStageNoStages(
  product: ProductForStageSelection | null | undefined
): boolean {
  return shouldSkipStageSelection(product);
}
