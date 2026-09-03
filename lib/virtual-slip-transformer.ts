/**
 * Transforms the API response from GET /v1/slip/slip/{slipId}/details
 * into the props and state shape required by CaseDesignCenter in read-only mode.
 *
 * Used by the read-only virtual slip page and by add-new-stage / edit-slip
 * preload (`preloadInitialSlipState` → CaseDesignCenter).
 */

import type { AddedProduct, VirtualSlipInitialState } from "@/components/case-design-center/types";
import type { Arch, RetentionType } from "@/components/case-design-center/types";
import type { ImplantDetailData } from "@/components/case-design-center/components/ImplantDetailSection";
import {
  emptyImpressionSelections,
  type ArchImpressionEntry,
  type SlipImpressionSelections,
} from "@/components/case-design-center/utils/impressionStorage";
import {
  isFixedRestorationProduct,
  resolveProductForRetentionCheck,
} from "@/components/case-design-center/utils/categoryHelpers";
import {
  buildGroupedExtractionsChartDisplay,
  mergeArchExtractionDisplays,
  mergePreloadExtractionDisplaysForArch,
  overlayPreloadExtractionsOnChartDisplay,
  slipProductExtractionCatalog,
} from "@/lib/virtual-slip-extraction-display";
import { isTimExtractionRow } from "@/components/case-design-center/utils/extractionHelpers";
import { parseSlipProductNotes } from "@/lib/parse-slip-product-notes";

/**
 * Give the preloaded product object an `extractions` catalog merged from the slip
 * row (saved extractions[], row-level product_extractions, and per-tooth images
 * from slip_product_teeth_selections). The CDC panels build the chart's
 * extractionsByCode / extractionImagesByCode from product.extractions, so without
 * this the preloaded chart can't resolve saved status codes to tooth images and
 * falls back to default tooth graphics.
 */
function withSlipExtractionCatalog(apiProduct: any, baseProduct: any): any {
  const catalog = slipProductExtractionCatalog(apiProduct);
  if (catalog.length === 0) return baseProduct;
  return { ...baseProduct, extractions: catalog };
}

function upsertArchImpression(
  selections: SlipImpressionSelections,
  arch: Arch,
  entry: ArchImpressionEntry
) {
  const list = selections[arch];
  const idx = list.findIndex((e) => e.code === entry.code);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      qty: Math.max(list[idx].qty, entry.qty),
      name: entry.name || list[idx].name,
      impression_id: entry.impression_id || list[idx].impression_id,
    };
  } else {
    list.push(entry);
  }
}

/**
 * Parse a teeth value that may be a comma-separated string, an array of numbers,
 * or an array of objects ({ tooth_number } / { tooth_num } / { number }).
 * Mirrors `parseTeeth` in lib/virtual-slip-view-model.ts so the editable preload
 * (add-new-stage / edit-slip) reads the same shapes as the read-only virtual slip.
 */
function parseTeethValue(value: unknown): number[] {
  if (!value) return [];
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }
  if (Array.isArray(value)) {
    return value
      .map((v: any) =>
        typeof v === "number"
          ? v
          : parseInt(String(v?.tooth_number ?? v?.tooth_num ?? v?.number ?? v), 10)
      )
      .filter((n) => !isNaN(n));
  }
  return [];
}

/**
 * The per-tooth chart rows the read-only view model accepts. Fixed products keep their
 * selected teeth here (slip_product_teeth_selections) — with prep/retention images per
 * tooth — and may leave `teeth_selection` empty, so the editable preload reads them too.
 */
function getToothChartRows(apiProduct: any): any[] {
  const candidates = [
    apiProduct?.slip_product_teeth_selections,
    apiProduct?.selected_teeth,
    apiProduct?.selected_teeth_map,
    apiProduct?.tooth_chart,
    apiProduct?.tooth_chart_entries,
    apiProduct?.tooth_chart_details,
    apiProduct?.tooth_selections,
  ];
  const rows = candidates.find((c) => Array.isArray(c)) as any[] | undefined;
  return rows ?? [];
}

function toothNumberFromChartRow(row: any): number {
  return Number(
    row?.tooth_number ??
      row?.tooth_chart_entry?.tooth_number ??
      row?.tooth_num ??
      row?.number ??
      row
  );
}

function parseToothChartRowTeeth(apiProduct: any): number[] {
  const teeth: number[] = [];
  for (const row of getToothChartRows(apiProduct)) {
    const tn = toothNumberFromChartRow(row);
    if (Number.isFinite(tn)) teeth.push(tn);
  }
  return teeth;
}

/**
 * Per-tooth retention type (Prep / Implant / Pontic) resolved from the tooth-chart
 * rows' chart_type / retention option name. Used as a fallback when the product has
 * no `retentions[]` array, so Implant/Pontic teeth still render with the right badge.
 */
function parseToothChartRetentionByTooth(
  apiProduct: any
): Record<number, RetentionType> {
  const VALID = new Map<string, RetentionType>([
    ["prep", "Prep"],
    ["implant", "Implant"],
    ["pontic", "Pontic"],
  ]);
  const map: Record<number, RetentionType> = {};
  for (const row of getToothChartRows(apiProduct)) {
    const tn = toothNumberFromChartRow(row);
    if (!Number.isFinite(tn)) continue;
    const entry = row?.tooth_chart_entry ?? {};
    const raw = String(
      entry?.chart_type ??
        row?.chart_type ??
        entry?.retention_option?.name ??
        row?.retention_option?.name ??
        ""
    )
      .trim()
      .toLowerCase();
    const resolved = VALID.get(raw);
    if (resolved) map[tn] = resolved;
  }
  return map;
}

/**
 * Resolve a slip product's selected teeth from the slip-details payload, matching
 * the read-only virtual slip view model: teeth_selection (string OR array), then a
 * `teeth` fallback, then the per-tooth chart rows (slip_product_teeth_selections),
 * which is where fixed products keep their selected teeth. Preserves source order
 * and de-dupes.
 */
export function parseProductTeeth(apiProduct: any): number[] {
  const teeth = parseTeethValue(apiProduct?.teeth_selection ?? apiProduct?.teeth);
  if (teeth.length > 0) return [...new Set(teeth)];
  // Fixed products can leave teeth_selection empty and keep their selected teeth only
  // in the per-tooth chart rows — fall back to those so the chart and repTooth-gated
  // fields (shades, grade, stage) still preload. Removables always carry teeth_selection,
  // so their TIM/status chart rows never leak in here.
  return [...new Set(parseToothChartRowTeeth(apiProduct))];
}

/** First non-empty, trimmed string from the arguments. */
function firstNonEmptyString(...values: Array<unknown>): string {
  for (const v of values) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s) return s;
  }
  return "";
}

function positiveId(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function buildImplantDetailsByTooth(apiProduct: any): Record<number, ImplantDetailData> {
  const result: Record<number, ImplantDetailData> = {};
  const abutmentByTooth: Record<number, any> = {};

  for (const row of Array.isArray(apiProduct?.abutment_details)
    ? apiProduct.abutment_details
    : []) {
    const toothNumber = Number(row?.teeth_number ?? row?.tooth_number);
    if (Number.isFinite(toothNumber)) abutmentByTooth[toothNumber] = row;
  }

  const savedAdvanceFields = Array.isArray(apiProduct?.advance_fields)
    ? apiProduct.advance_fields
    : [];
  const inclusionValues: Record<number, string> = {};
  for (const saved of savedAdvanceFields) {
    const fieldId =
      saved?.advance_field_id ?? saved?.advance_field?.id ?? saved?.field_id;
    const fieldName = String(saved?.advance_field?.name ?? "").toLowerCase();
    const value = firstNonEmptyString(saved?.advance_field_value, saved?.value);
    if (fieldId && value && fieldName.includes("inclusion")) {
      inclusionValues[fieldId] = value;
    }
  }

  for (const row of Array.isArray(apiProduct?.implant_details)
    ? apiProduct.implant_details
    : []) {
    const toothNumber = Number(row?.teeth_number ?? row?.tooth_number);
    if (!Number.isFinite(toothNumber)) continue;

    const abutment = abutmentByTooth[toothNumber] ?? {};
    const size =
      typeof row?.size === "string"
        ? row.size
        : firstNonEmptyString(
            row?.size?.label,
            row?.size?.name,
            row?.implant_platform_size?.label,
            row?.implant_platform_size?.name,
            row?.platform_size?.label,
            row?.size_label
          );
    const inclusions = firstNonEmptyString(
      row?.inclusions,
      row?.inclusion,
      ...Object.values(inclusionValues)
    );

    result[toothNumber] = {
      brand: firstNonEmptyString(
        row?.implant?.brand_name,
        row?.implant?.brand?.name,
        row?.brand?.name,
        row?.brand_name,
        row?.brand
      ),
      systemName: firstNonEmptyString(
        row?.implant?.system_name,
        row?.implant_system?.name,
        row?.system?.name,
        row?.system_name
      ),
      platform: firstNonEmptyString(
        row?.platform?.name,
        row?.implant_platform?.name,
        row?.platform_name
      ),
      size,
      inclusions: inclusions || "No inclusion",
      inclusionQty: Number(
        row?.inclusion_quantity ?? row?.inclusion_qty ?? row?.quantity ?? 0
      ),
      abutmentType: firstNonEmptyString(
        abutment?.abutment?.type,
        abutment?.abutment_type?.type,
        abutment?.abutment_type?.name,
        abutment?.abutmentType
      ),
      abutmentDetail: firstNonEmptyString(
        abutment?.abutment_option?.name,
        abutment?.option?.name,
        abutment?.abutmentDetail
      ),
      dynamicFields: { ...inclusionValues },
      // Keep IDs so ImplantDetailSection can resolve names once the catalog loads.
      implantId: positiveId(row?.implant_id ?? row?.implant?.id),
      platformId: positiveId(
        row?.implant_platform_id ?? row?.platform_id ?? row?.platform?.id ?? row?.implant_platform?.id
      ),
      sizeId: positiveId(
        row?.implant_platform_size_id ??
          row?.platform_size_id ??
          row?.size_id ??
          row?.size?.id ??
          row?.implant_platform_size?.id
      ),
      abutmentId: positiveId(
        abutment?.abutment_id ?? abutment?.abutment?.id
      ),
      abutmentOptionId: positiveId(
        abutment?.abutment_option_id ??
          abutment?.option_id ??
          abutment?.abutment_option?.id ??
          abutment?.option?.id
      ),
    };
  }

  return result;
}

/**
 * Resolve a shade name from the saved advance_fields, mirroring the read-only view
 * model: a saved entry whose nested `advance_field.field_type` is "shade_guide" carries
 * the picked shade in `teeth_shade.name` (or `advance_field_value`). `wantStump` selects
 * the stump/gum-named field; otherwise the first tooth (non-stump) shade field.
 */
function shadeFromSavedAdvanceFields(apiProduct: any, wantStump: boolean): string {
  if (!Array.isArray(apiProduct?.advance_fields)) return "";
  for (const saved of apiProduct.advance_fields) {
    if (saved?.advance_field?.field_type !== "shade_guide") continue;
    const name = String(saved?.advance_field?.name ?? "").toLowerCase();
    const isStump = name.includes("stump") || name.includes("gum");
    if (isStump !== wantStump) continue;
    const value = firstNonEmptyString(saved?.teeth_shade?.name, saved?.advance_field_value);
    if (value) return value;
  }
  return "";
}

/**
 * Determine the arch of a product based on its `type` field.
 * "Upper" → "maxillary", "Lower" → "mandibular"
 */
function archFromType(type: string | null | undefined): "maxillary" | "mandibular" {
  return type?.toLowerCase() === "lower" ? "mandibular" : "maxillary";
}

function isNonFixedApiProduct(apiProduct: any): boolean {
  return !isFixedRestorationProduct(resolveProductForRetentionCheck(apiProduct));
}

/**
 * Populate arch-level extraction maps for CDC preload (add-new-stage / edit-slip).
 * Top arch chart: grouped `extractions[]` only — not product `teeth_selection` / TIM.
 * Product accordions still use `teeth_selection` + status boxes with `excludeTeeth`.
 */
function hydrateArchExtractionMapsFromSlipProducts(
  apiProducts: any[],
  state: {
    maxillaryToothExtractionMap: Record<number, string>;
    mandibularToothExtractionMap: Record<number, string>;
    maxillaryClaspTeeth: number[];
    mandibularClaspTeeth: number[];
    maxillaryNoActiveBoxTeeth: number[];
    mandibularNoActiveBoxTeeth: number[];
  },
): void {
  for (const arch of ["maxillary", "mandibular"] as const) {
    const archProducts = apiProducts.filter((p) => archFromType(p?.type) === arch);
    if (archProducts.length === 0) continue;

    let extractionDisplay = mergeArchExtractionDisplays(
      archProducts.map(buildGroupedExtractionsChartDisplay),
    );

    const preloadDisplay = mergePreloadExtractionDisplaysForArch(archProducts, arch);
    if (preloadDisplay) {
      extractionDisplay = overlayPreloadExtractionsOnChartDisplay(
        extractionDisplay,
        preloadDisplay,
        archProducts,
      );
    }

    const toothMap =
      arch === "maxillary"
        ? state.maxillaryToothExtractionMap
        : state.mandibularToothExtractionMap;
    const claspList =
      arch === "maxillary" ? state.maxillaryClaspTeeth : state.mandibularClaspTeeth;
    const noActiveBoxList =
      arch === "maxillary"
        ? state.maxillaryNoActiveBoxTeeth
        : state.mandibularNoActiveBoxTeeth;

    for (const [toothKey, code] of Object.entries(extractionDisplay.toothExtractionMap)) {
      const tn = Number(toothKey);
      if (!Number.isFinite(tn)) continue;
      const meta = extractionDisplay.extractionsByCode[code];
      if (isTimExtractionRow({ code, name: meta?.name })) continue;
      toothMap[tn] = code;
    }

    for (const tn of extractionDisplay.claspTeeth) {
      if (!claspList.includes(tn)) claspList.push(tn);
    }

    for (const apiProduct of archProducts) {
      if (!isNonFixedApiProduct(apiProduct)) continue;
      const teeth = parseProductTeeth(apiProduct);
      for (const tn of teeth) {
        if (claspList.includes(tn)) continue;
        if (toothMap[tn] && !noActiveBoxList.includes(tn)) {
          noActiveBoxList.push(tn);
        }
      }
    }
  }
}


/**
 * Transform the raw products array from the virtual slip details API response
 * into the AddedProduct[] shape expected by CaseDesignCenter.
 *
 * Card IDs start at 1 (0 is reserved for the initial product card).
 */
export function buildAddedProducts(apiProducts: unknown[]): AddedProduct[] {
  if (!Array.isArray(apiProducts) || apiProducts.length === 0) return [];

  return apiProducts.map((apiProduct: any, index) => {
    // Merge category/subcategory from the slip-product level into the product object.
    // useCaseDesignState reads product?.subcategory?.category?.name for category detection.
    const baseProduct = apiProduct.product ?? { id: apiProduct.product_id ?? 0 };
    const product = withSlipExtractionCatalog(apiProduct, {
      ...baseProduct,
      subcategory: baseProduct.subcategory ?? {
        ...(apiProduct.subcategory ?? {}),
        category: baseProduct.subcategory?.category ?? apiProduct.category ?? {},
      },
      // Also embed category_name for any code that reads it as a flat field
      category_name: baseProduct.category_name ?? apiProduct.category?.name ?? "",
    });

    return {
      id: index + 1,
      productId: apiProduct.product?.id ?? apiProduct.product_id ?? undefined,
      product,
      arch: archFromType(apiProduct.type),
      expanded: true,
    };
  });
}

/**
 * Build the VirtualSlipInitialState from the products array.
 * This pre-populates all the sub-hook state that CaseDesignCenter
 * needs to render the read-only panels correctly.
 */
export function buildVirtualSlipInitialState(apiProducts: unknown[]): VirtualSlipInitialState {
  if (!Array.isArray(apiProducts) || apiProducts.length === 0) {
    return {
      maxillaryTeeth: [],
      mandibularTeeth: [],
      maxillaryRetentionTypes: {},
      mandibularRetentionTypes: {},
      toothProducts: {},
      toothProductCards: {},
      selectedShades: {},
      selectedStages: {},
      selectedImpressions: emptyImpressionSelections(),
      completedFields: {},
      fieldValues: {},
      maxillaryToothExtractionMap: {},
      mandibularToothExtractionMap: {},
      maxillaryClaspTeeth: [],
      mandibularClaspTeeth: [],
      maxillaryNoActiveBoxTeeth: [],
      mandibularNoActiveBoxTeeth: [],
      maxillaryImplantDetailsByTooth: {},
      mandibularImplantDetailsByTooth: {},
    };
  }

  const maxillaryTeeth: number[] = [];
  const mandibularTeeth: number[] = [];
  const maxillaryRetentionTypes: Record<number, RetentionType[]> = {};
  const mandibularRetentionTypes: Record<number, RetentionType[]> = {};
  const toothProducts: Record<string, any> = {};
  const toothProductCards: Record<string, number> = {};
  const selectedShades: Record<string, string> = {};
  const selectedStages: Record<string, string> = {};
  const selectedImpressions = emptyImpressionSelections();
  const completedFields: Record<string, string[]> = {};
  const fieldValues: Record<string, Record<string, string>> = {};
  // Per-arch tooth-status extraction selections (Missing, Will-extract, etc.) and
  // overlay/clasp teeth, mirroring useToothSelection's interactive state shape.
  const maxillaryToothExtractionMap: Record<number, string> = {};
  const mandibularToothExtractionMap: Record<number, string> = {};
  const maxillaryClaspTeeth: number[] = [];
  const mandibularClaspTeeth: number[] = [];
  // Removable product teeth that also carry a status code — must stay in the orange header.
  const maxillaryNoActiveBoxTeeth: number[] = [];
  const mandibularNoActiveBoxTeeth: number[] = [];
  const maxillaryImplantDetailsByTooth: Record<number, ImplantDetailData> = {};
  const mandibularImplantDetailsByTooth: Record<number, ImplantDetailData> = {};

  for (let i = 0; i < apiProducts.length; i++) {
    const apiProduct: any = apiProducts[i];
    const cardId = i + 1; // 0 reserved for initial product
    const arch = archFromType(apiProduct.type);
    const productData = withSlipExtractionCatalog(
      apiProduct,
      apiProduct.product ?? { id: apiProduct.product_id ?? 0 },
    );
    const teeth = parseProductTeeth(apiProduct);
    const productApiId = apiProduct.product?.id ?? apiProduct.product_id;

    // Saved advance-field values keyed by advance_field id. Used to preload both the
    // shade-guide shades (named cervical/incisal/… fields) and the fixed advance-field
    // steps below, so the edit-slip preload matches every field the panels read.
    const savedAdvanceFieldValueById: Record<number, string> = {};
    if (Array.isArray(apiProduct.advance_fields)) {
      for (const saved of apiProduct.advance_fields) {
        const fieldId =
          saved.advance_field_id ?? saved.advance_field?.id ?? saved.field_id;
        // Shade-guide fields keep the picked shade in teeth_shade.name, not advance_field_value.
        const value = firstNonEmptyString(
          saved.advance_field_value,
          saved.value,
          saved.teeth_shade?.name
        );
        if (fieldId && value) savedAdvanceFieldValueById[fieldId] = value;
      }
    }

    // ── Teeth ──────────────────────────────────────────────────────────────
    if (arch === "maxillary") {
      for (const tn of teeth) {
        if (!maxillaryTeeth.includes(tn)) maxillaryTeeth.push(tn);
      }
    } else {
      for (const tn of teeth) {
        if (!mandibularTeeth.includes(tn)) mandibularTeeth.push(tn);
      }
    }

    // ── Retention types (Prep for fixed, none for removables) ──────────────
    // Category is at the slip-product level (apiProduct.category.name), not inside the product object
    const isNonFixed = isNonFixedApiProduct(apiProduct);

    if (!isNonFixed) {
      const retentionTypesMap = arch === "maxillary" ? maxillaryRetentionTypes : mandibularRetentionTypes;

      // Build a per-tooth retention map from the API retentions array.
      // Each entry: { tooth_number: number, retention: { id, name } }
      // Valid retention names: "Prep", "Implant", "Pontic"
      const VALID_RETENTION_TYPES = new Set<string>(["Prep", "Implant", "Pontic"]);
      const retentionsByTooth: Record<number, RetentionType[]> = {};
      if (Array.isArray(apiProduct.retentions) && apiProduct.retentions.length > 0) {
        for (const r of apiProduct.retentions) {
          const tn: number = r.tooth_number ?? r.tooth_num;
          const name: string = r.retention?.name ?? r.retention_name ?? "";
          if (tn && VALID_RETENTION_TYPES.has(name)) {
            if (!retentionsByTooth[tn]) retentionsByTooth[tn] = [];
            retentionsByTooth[tn].push(name as RetentionType);
          }
        }
      }

      const chartRetentionByTooth = parseToothChartRetentionByTooth(apiProduct);
      for (const tn of teeth) {
        // Prefer the retentions[] array; fall back to the tooth-chart row's chart type
        // (Implant/Pontic), then Prep so a fixed tooth always renders a badge.
        retentionTypesMap[tn] =
          retentionsByTooth[tn] ??
          (chartRetentionByTooth[tn] ? [chartRetentionByTooth[tn]] : ["Prep"]);
      }
    }

    // ── Tooth → product mapping ────────────────────────────────────────────
    // The representative tooth is the first tooth in the API's teeth_selection order.
    // This must match how the panel computes apFirstTn = cardTeeth[0], where cardTeeth
    // preserves the insertion order from maxillaryTeeth (which mirrors the parse order here).
    const repTooth = teeth.length > 0 ? teeth[0] : null;

    for (const tn of teeth) {
      const key = `${arch}_${tn}`;
      if (productData?.id || productData) {
        toothProducts[key] = productData;
      }
      toothProductCards[key] = cardId;
    }

    // ── Resolve shade names from nested objects or flat fields ────────────
    // API returns: teeth_shade: { id, name, ... }, gum_shade: { id, name, ... }
    // Also support flat _name fallbacks for forward-compat.
    // Use empty string when the name field is null/undefined/empty — do not set shade keys for empty shades.
    // Resolve shades exactly like the read-only virtual slip (buildVirtualSlipVM): the
    // direct field, then a shade_guide advance_field, then the parsed product notes.
    const shadeFromNotes = parseSlipProductNotes(
      typeof apiProduct.notes === "string" ? apiProduct.notes : ""
    );
    const teethShadeName: string = firstNonEmptyString(
      apiProduct.teeth_shade?.name,
      apiProduct.teeth_shade_name,
      shadeFromSavedAdvanceFields(apiProduct, false),
      shadeFromNotes.teethShade
    );
    const gumShadeName: string = firstNonEmptyString(
      apiProduct.gum_shade?.name,
      apiProduct.gum_shade_name,
      shadeFromNotes.gumShade
    );
    const stumpShadeName: string = firstNonEmptyString(
      apiProduct.stump_shade?.name,
      apiProduct.stump_shade_name,
      shadeFromSavedAdvanceFields(apiProduct, true),
      shadeFromNotes.stumpShade
    );
    const gradeName: string =
      (apiProduct.grade?.name || apiProduct.grade_name || "").trim();

    // Validate the stage name against the product's stages array to prevent
    // incorrectly mapped fields (e.g. shade guide brand name appearing as stage).
    const rawStageName: string =
      (apiProduct.stage?.name || apiProduct.stage_name || "").trim();
    const productStages: Array<{ name: string }> = Array.isArray(apiProduct.product?.stages)
      ? apiProduct.product.stages
      : [];
    // If the product defines a stages list, only accept a stage that appears in it.
    // If the product has no stages list (unusual), accept the raw value as-is.
    const stageName: string =
      rawStageName && (productStages.length === 0 || productStages.some((s) => s.name === rawStageName))
        ? rawStageName
        : "";

    // ── Shade selections ───────────────────────────────────────────────────
    // Keys match the pattern used by useShadeSelection:
    // `${productId}_${arch}_${fieldType}` where productId for added products
    // is the tooth-based key like "prep_4" (for removables) or "fixed_4" (for fixed)
    if (repTooth !== null) {
      const productIdKey = isNonFixed ? `prep_${repTooth}` : `fixed_${repTooth}`;

      if (isNonFixed) {
        if (teethShadeName) {
          selectedShades[`${productIdKey}_${arch}_tooth_shade`] = teethShadeName;
        }
        if (gumShadeName) {
          selectedShades[`${productIdKey}_${arch}_gum_shade`] = gumShadeName;
        }
        if (stumpShadeName) {
          selectedShades[`${productIdKey}_${arch}_stump_shade`] = stumpShadeName;
        }
      } else {
        // Fixed restoration: the panels read shades per-product via
        // resolveFixedShadeProductId → `fixed_p_{productId}` (buildFixedShadeProductId).
        // Writing them under the legacy per-tooth `fixed_{tooth}` id left the edit-slip
        // preload invisible, so shades read empty and were re-prompted. Write the
        // product-scoped id the panels actually read. Gum shade lives in the
        // stump_shade slot for fixed products.
        const fixedShadeKey =
          productApiId != null && productApiId !== ""
            ? `fixed_p_${productApiId}`
            : productIdKey;

        const shadeFieldTypeFor = (name: string): "stump_shade" | "tooth_shade" => {
          const n = (name || "").toLowerCase();
          return n.includes("stump") || n.includes("gum") ? "stump_shade" : "tooth_shade";
        };

        // Named shade-guide fields — only write when that advance field actually has a
        // saved value. Do NOT seed named Body/Cervical/… fields from top-level
        // teeth_shade / gum_shade: those classic values belong on the removaables-style
        // Teeth Shade / Gum Shade fields (legacy keys below).
        for (const def of Array.isArray(apiProduct.product?.advance_fields)
          ? apiProduct.product.advance_fields.filter((f: any) => f?.field_type === "shade_guide")
          : []) {
          const savedValue = savedAdvanceFieldValueById[def.id];
          if (!savedValue) continue;
          selectedShades[
            `${fixedShadeKey}_${arch}_${shadeFieldTypeFor(def.name)}_${def.id}`
          ] = savedValue;
        }
        if (Array.isArray(apiProduct.advance_fields)) {
          for (const saved of apiProduct.advance_fields) {
            if (saved?.advance_field?.field_type !== "shade_guide") continue;
            const fieldId =
              saved.advance_field_id ?? saved.advance_field?.id ?? saved.field_id;
            const value = firstNonEmptyString(saved.teeth_shade?.name, saved.advance_field_value);
            if (!fieldId || !value) continue;
            selectedShades[
              `${fixedShadeKey}_${arch}_${shadeFieldTypeFor(saved.advance_field?.name)}_${fieldId}`
            ] = value;
          }
        }

        // Legacy (no advance-field id) keys — always written so classic Teeth Shade /
        // Gum Shade fields resolve like removaables. Gum shade uses the stump slot.
        const gumOrStump = gumShadeName || stumpShadeName;
        if (teethShadeName) {
          selectedShades[`${fixedShadeKey}_${arch}_tooth_shade`] = teethShadeName;
        }
        if (gumOrStump) {
          selectedShades[`${fixedShadeKey}_${arch}_stump_shade`] = gumOrStump;
        }
        // Insurance: also write the per-tooth legacy keys for every tooth so the value
        // resolves in the brief window before selectedProduct.id loads, when the panel's
        // fixedShadeProductId falls back to `fixed_{tooth}`. migrateFixedShadeProductId
        // then carries these onto the product-scoped id.
        for (const tn of teeth) {
          if (teethShadeName) {
            selectedShades[`fixed_${tn}_${arch}_tooth_shade`] = teethShadeName;
          }
          if (gumOrStump) {
            selectedShades[`fixed_${tn}_${arch}_stump_shade`] = gumOrStump;
          }
        }
      }

      // ── Stage selections ─────────────────────────────────────────────────
      if (stageName) {
        const stageKey = isNonFixed ? `${arch}_prep_${repTooth}` : `${arch}_fixed_${repTooth}`;
        selectedStages[stageKey] = stageName;
      }

      // ── Completed fields and field values ────────────────────────────────
      // For fixed restoration (read-only virtual slip), mark all chain steps as completed
      // so the progressive-disclosure gate (getVisibleStepCount) unlocks every field for display.
      // For removable, only mark steps that have actual data.
      const completed: string[] = [];
      const values: Record<string, string> = {};

      if (!isNonFixed) {
        // Fixed restoration: unlock the chain so fields render. Shade steps are only
        // marked complete when a real shade value exists — otherwise edit shows a green
        // empty Teeth/Gum box and treats the step as done.
        const FIXED_CHAIN = [
          "fixed_stage",
          "fixed_stump_shade",
          "fixed_shade_trio",
          "fixed_characterization",
          "fixed_contact_icons",
          "fixed_margin",
          "fixed_metal",
          "fixed_proximal_contact",
          "fixed_impression",
          "fixed_addons",
        ];
        const fixedStumpValue = gumShadeName || stumpShadeName;
        for (const step of FIXED_CHAIN) {
          if (step === "fixed_shade_trio" && !teethShadeName) continue;
          if (step === "fixed_stump_shade" && !fixedStumpValue) continue;
          completed.push(step);
        }
        // Fixed products can also carry a grade (shared "grade" step), shown before the
        // chain — preload it so the edit-slip grade field is pre-selected, not re-asked.
        if (gradeName) {
          completed.push("grade");
          values["grade"] = gradeName;
        }
        if (stageName) values["fixed_stage"] = stageName;
        // Gum shade lives in the fixed_stump_shade slot; fall back to stump when no gum.
        if (fixedStumpValue) {
          const shadeSource = gumShadeName ? apiProduct.gum_shade : apiProduct.stump_shade;
          values["fixed_stump_shade"] = JSON.stringify({
            gum_shade_id:
              shadeSource?.gum_shade_id ??
              shadeSource?.id ??
              apiProduct.gum_shade?.gum_shade_id ??
              apiProduct.gum_shade?.id ??
              apiProduct.stump_shade?.id ??
              null,
            brand_id:
              shadeSource?.brand?.id ??
              apiProduct.gum_shade?.brand?.id ??
              apiProduct.stump_shade?.brand?.id ??
              null,
            name: fixedStumpValue,
          });
        }
        // Classic Teeth Shade — removaables-style JSON so the field reads like teeth_shade.
        if (teethShadeName) {
          const teethSource = apiProduct.teeth_shade;
          values["fixed_shade_trio"] = JSON.stringify({
            teeth_shade_id:
              teethSource?.teeth_shade_id ?? teethSource?.id ?? null,
            brand_id: teethSource?.brand?.id ?? null,
            name: teethShadeName,
          });
        }
      } else {
        // Removable: mark only steps that have data
        if (gradeName) {
          completed.push("grade");
          values["grade"] = gradeName;
        }
        if (stageName) {
          completed.push("stage");
          values["stage"] = stageName;
        }
        if (teethShadeName) {
          completed.push("teeth_shade");
          values["teeth_shade"] = teethShadeName;
        }
        if (gumShadeName) {
          completed.push("gum_shade");
          values["gum_shade"] = gumShadeName;
        }
      }

      if (completed.length > 0) {
        // Write the completed steps + values for EVERY tooth in the product, not just the
        // first. The panels read the field value at their own representative tooth (min or
        // first-selected), which need not equal teeth[0] — keying only teeth[0] left the
        // value invisible (e.g. removable teeth shade read getFieldValue at repTn). Writing
        // all teeth makes the value resolve regardless of which rep tooth the panel picks.
        for (const tn of teeth) {
          const tKey = `${arch}_${tn}`;
          completedFields[tKey] = completed;
          fieldValues[tKey] = { ...(fieldValues[tKey] ?? {}), ...values };
        }
      }
    }

    // ── Impression selections (one list per jaw, shared across products) ───
    if (Array.isArray(apiProduct.impressions)) {
      for (const imp of apiProduct.impressions) {
        const code = imp.impression?.code ?? imp.code ?? String(imp.impression_id ?? "");
        const quantity = imp.quantity ?? 1;
        if (!code || quantity <= 0) continue;
        const name =
          imp.impression?.name ?? imp.name ?? code;
        const impression_id =
          imp.impression_id ?? imp.impression?.id ?? 0;
        upsertArchImpression(selectedImpressions, arch, {
          impression_id,
          code,
          name,
          qty: quantity,
        });
      }
    }

    // ── Advance field saved values ─────────────────────────────────────────
    // The slip product carries both:
    //  - apiProduct.advance_fields: saved values [{ advance_field_id, advance_field_value }]
    //  - apiProduct.product.advance_fields: field definitions [{ id, name, options, ... }]
    // We match saved values to field definitions by ID, then resolve which step key
    // (fixed_contact_icons, fixed_margin, etc.) owns each field using the same name-matchers
    // as getAdvanceFieldsForStep in FixedRestorationFields.tsx.
    if (
      !isNonFixed &&
      repTooth !== null &&
      Array.isArray(apiProduct.advance_fields) &&
      apiProduct.advance_fields.length > 0
    ) {
      const configuredAdvanceFields = Array.isArray(apiProduct.product?.advance_fields)
        ? apiProduct.product.advance_fields
        : [];
      const productFieldDefs: Array<{
        id: number;
        name: string;
        options?: Array<{ id: number; name: string }>;
      }> = [
        ...configuredAdvanceFields,
        ...apiProduct.advance_fields
          .map((saved: any) => saved?.advance_field)
          .filter(Boolean),
      ].filter(
        (def, index, defs) =>
          def?.id && defs.findIndex((candidate) => candidate.id === def.id) === index
      );

      // Reuse the field_id → saved value lookup built at the top of the loop.
      const savedByFieldId = savedAdvanceFieldValueById;

      // Step name-matchers — mirror getAdvanceFieldsForStep in FixedRestorationFields.tsx
      const STEP_MATCHERS: Array<[string, (n: string) => boolean]> = [
        [
          "fixed_characterization",
          (n) =>
            n.includes("characterization") ||
            n.includes("character") ||
            n.includes("intensity") ||
            n.includes("surface finish") ||
            n.includes("surface_finish"),
        ],
        ["fixed_contact_icons", (n) => n.includes("occlusal") || n.includes("pontic") || n.includes("embrasure") || (n.includes("proximal") && n.includes("contact") && !n.includes("mesial") && !n.includes("distal"))],
        ["fixed_proximal_contact", (n) => (n.includes("proximal") && n.includes("contact") && (n.includes("mesial") || n.includes("distal"))) || n.includes("functional guidance")],
        ["fixed_margin", (n) => n.includes("margin")],
        ["fixed_metal", (n) => n.includes("metal")],
      ];

      // Group saved values by step, building JSON objects in the same format as interactive use
      const stepAccumulators: Record<string, Record<string, { name: string; optionId: number }>> = {};

      for (const def of productFieldDefs) {
        const savedValue = savedByFieldId[def.id];
        if (!savedValue) continue;

        const fieldNameLower = (def.name || "").toLowerCase();
        const matchedStep = STEP_MATCHERS.find(([, matcher]) => matcher(fieldNameLower));
        if (!matchedStep) continue;

        const stepKey = matchedStep[0];

        // New storage: advance_field_value is the selected option id only.
        // Legacy: plain option name, or a multi-field JSON map blob.
        let optionId = 0;
        let optionName = "";

        const trimmed = String(savedValue).trim();
        if (/^\d+$/.test(trimmed)) {
          optionId = Number(trimmed);
          const matchedOption = def.options?.find((o) => Number(o.id) === optionId);
          optionName = matchedOption?.name ?? "";
        } else if (trimmed.startsWith("{")) {
          try {
            const parsed = JSON.parse(trimmed) as Record<string, unknown>;
            const own = parsed[String(def.id)] ?? parsed[def.id as unknown as string];
            if (own && typeof own === "object" && own !== null) {
              const entry = own as { name?: string; optionId?: number; option_id?: number };
              optionName = String(entry.name ?? "").trim();
              optionId = Number(entry.optionId ?? entry.option_id ?? 0);
            } else if (typeof parsed.name === "string") {
              optionName = parsed.name.trim();
              optionId = Number(
                (parsed as { optionId?: number; option_id?: number }).optionId ??
                  (parsed as { option_id?: number }).option_id ??
                  0,
              );
            }
          } catch {
            /* fall through */
          }
        } else {
          optionName = trimmed;
          const matchedOption = def.options?.find((o) => o.name === optionName);
          optionId = matchedOption?.id ?? 0;
        }

        if (!optionName && optionId > 0) {
          optionName = def.options?.find((o) => Number(o.id) === optionId)?.name ?? "";
        }
        if (!optionName) continue;

        if (!stepAccumulators[stepKey]) stepAccumulators[stepKey] = {};
        stepAccumulators[stepKey][def.id] = { name: optionName, optionId };
      }

      // Write accumulated step values into fieldValues and mark steps as completed
      for (const [stepKey, storedValues] of Object.entries(stepAccumulators)) {
        if (Object.keys(storedValues).length === 0) continue;
        for (const toothNumber of teeth) {
          const toothKey = `${arch}_${toothNumber}`;
          const existing = fieldValues[toothKey] ?? {};
          fieldValues[toothKey] = {
            ...existing,
            [stepKey]: JSON.stringify(storedValues),
          };
        }
      }
    }

    const implantDetails = buildImplantDetailsByTooth(apiProduct);
    Object.assign(
      arch === "maxillary"
        ? maxillaryImplantDetailsByTooth
        : mandibularImplantDetailsByTooth,
      implantDetails
    );
  }

  hydrateArchExtractionMapsFromSlipProducts(apiProducts, {
    maxillaryToothExtractionMap,
    mandibularToothExtractionMap,
    maxillaryClaspTeeth,
    mandibularClaspTeeth,
    maxillaryNoActiveBoxTeeth,
    mandibularNoActiveBoxTeeth,
  });

  return {
    maxillaryTeeth,
    mandibularTeeth,
    maxillaryRetentionTypes,
    mandibularRetentionTypes,
    toothProducts,
    toothProductCards,
    selectedShades,
    selectedStages,
    selectedImpressions,
    completedFields,
    fieldValues,
    maxillaryToothExtractionMap,
    mandibularToothExtractionMap,
    maxillaryClaspTeeth,
    mandibularClaspTeeth,
    maxillaryNoActiveBoxTeeth,
    mandibularNoActiveBoxTeeth,
    maxillaryImplantDetailsByTooth,
    mandibularImplantDetailsByTooth,
  };
}

/**
 * Determine the initialArch to pass to CaseDesignCenter based on which arches
 * have products in the API response.
 */
export function determineInitialArch(
  apiProducts: unknown[]
): "maxillary" | "mandibular" | "both" {
  if (!Array.isArray(apiProducts) || apiProducts.length === 0) return "both";

  const hasMaxillary = apiProducts.some((p: any) => archFromType(p?.type) === "maxillary");
  const hasMandibular = apiProducts.some((p: any) => archFromType(p?.type) === "mandibular");

  if (hasMaxillary && hasMandibular) return "both";
  if (hasMandibular) return "mandibular";
  return "maxillary";
}
