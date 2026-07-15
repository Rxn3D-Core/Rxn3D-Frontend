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
  has_extraction?: string | boolean | null;
} | null | undefined;

type ProductWithRetention = { retention_options?: unknown[]; has_retention?: string | boolean | null } | null | undefined;

type AnyProduct = {
  retention_options?: unknown[];
  extractions?: unknown[];
  has_retention?: string | boolean | null;
  has_extraction?: string | boolean | null;
};

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

/**
 * Capability check: does this product carry an extraction layer (missing/extract/
 * clasps/etc.)? Flag-first (`has_extraction`), then falls back to a non-empty
 * `extractions[]`. Independent of and orthogonal to {@link hasRetentionOptions}.
 */
export function hasExtractionOptions(
  product: ProductForCategoryCheck | ProductWithRetention
): boolean {
  const p = product as AnyProduct | null | undefined;
  if (!p) return false;

  if (p.has_extraction === true || p.has_extraction === "Yes" || p.has_extraction === "yes") {
    return true;
  }
  if (p.has_extraction === false || p.has_extraction === "No" || p.has_extraction === "no") {
    return false;
  }

  return Array.isArray(p.extractions) && p.extractions.length > 0;
}

/**
 * The two independent, composable chart layers a product can carry. Drive chart
 * behavior off this — never off category. All four combinations are valid:
 * retention-only, extraction-only, both, or neither (plain selection).
 */
export interface ProductLayers {
  retention: boolean;
  extraction: boolean;
}

export function getProductLayers(
  product: ProductForCategoryCheck | ProductWithRetention
): ProductLayers {
  return {
    retention: hasRetentionOptions(product),
    extraction: hasExtractionOptions(product),
  };
}

/** Fixed restoration slip flow (retention chart, shades, etc.). */
export function isFixedRestorationProduct(product: unknown): boolean {
  return hasRetentionOptions(resolveProductForRetentionCheck(product));
}

/** Removables slip flow — also used for ortho (same UI and code path). */
export function isNonFixedRestorationProduct(product: unknown): boolean {
  return !isFixedRestorationProduct(product);
}

/** @deprecated Use isNonFixedRestorationProduct — ortho shares the removables flow. */
export function isOrthodonticsCategory(product: ProductForCategoryCheck): boolean {
  return isNonRetentionCategory(product);
}

/** Unwrap slip line items / nested API payloads before checking retention. */
export function resolveProductForRetentionCheck(source: unknown): ProductForCategoryCheck {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  const nested = record.product;
  if (nested && typeof nested === "object") {
    const p = nested as AnyProduct;
    if (
      p.has_retention != null ||
      (Array.isArray(p.retention_options) && p.retention_options.length > 0)
    ) {
      return p;
    }
  }
  return source as ProductForCategoryCheck;
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

/** Human-readable stage label; never returns raw JSON. */
export function parseStageDisplayName(stageRaw: string | undefined | null): string {
  if (!stageRaw?.trim()) return "";
  try {
    const parsed = JSON.parse(stageRaw) as { name?: string };
    if (typeof parsed?.name === "string" && parsed.name.trim()) return parsed.name;
  } catch {
    /* plain string stage name */
  }
  return stageRaw;
}

/** Stage value safe to show in accordion badges and fieldsets (never the skip placeholder). */
export function isDisplayableStageValue(value: string | undefined | null): boolean {
  const v = parseStageDisplayName(value);
  return !!v && v !== SKIPPED_STAGE_LABEL;
}

export function parseStageFieldValue(
  stageRaw: string | undefined | null
): { stage_id?: number; name: string } | null {
  const trimmed = (stageRaw ?? "").trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as { stage_id?: number; name?: string };
    if (typeof parsed?.name === "string" && parsed.name.trim()) {
      const stage_id = Number(parsed.stage_id ?? 0);
      return {
        name: parsed.name.trim(),
        ...(stage_id > 0 ? { stage_id } : {}),
      };
    }
  } catch {
    /* plain string stage name */
  }
  return { name: trimmed };
}

export function serializeStageFieldValue(stage: {
  stage_id?: number | null;
  name: string;
}): string {
  const stage_id = Number(stage.stage_id ?? 0);
  if (stage_id > 0) {
    return JSON.stringify({ stage_id, name: stage.name });
  }
  return stage.name;
}

type StageIdLookup = {
  stages?: Array<{ name?: string; stage_id?: number; id?: number }>;
};

/** Resolve stage_id from stored field JSON and/or product stage catalog. */
export function resolveStageIdFromSelection(
  product: StageIdLookup | null | undefined,
  stageRaw: string | undefined | null,
  stageNameFallback?: string | null
): number | undefined {
  const fromField = parseStageFieldValue(stageRaw);
  if (fromField?.stage_id && fromField.stage_id > 0) {
    return fromField.stage_id;
  }

  const name = fromField?.name ?? stageNameFallback?.trim() ?? "";
  if (!name || !product?.stages?.length) return undefined;

  const stageObj = product.stages.find((s) => s.name === name);
  const stage_id = Number(stageObj?.stage_id ?? stageObj?.id ?? 0);
  return stage_id > 0 ? stage_id : undefined;
}

export function serializeStageSelectionFromProduct(
  product: StageIdLookup | null | undefined,
  stageName: string
): string {
  const stageObj = product?.stages?.find((s) => s.name === stageName);
  return serializeStageFieldValue({
    name: stageName,
    stage_id: stageObj?.stage_id ?? stageObj?.id,
  });
}

/** @deprecated Use shouldSkipStageSelection — kept for existing call sites. */
export function isSingleStageNoStages(
  product: ProductForStageSelection | null | undefined
): boolean {
  return shouldSkipStageSelection(product);
}
