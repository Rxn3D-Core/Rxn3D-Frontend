/**
 * Transforms the API response from GET /v1/slip/slip/{slipId}/details
 * into the props and state shape required by CaseDesignCenter in read-only mode.
 *
 * Used by the read-only virtual slip page and by add-new-stage / edit-slip
 * preload (`preloadInitialSlipState` → CaseDesignCenter).
 */

import type { AddedProduct, VirtualSlipInitialState } from "@/components/case-design-center/types";
import type { Arch, RetentionType } from "@/components/case-design-center/types";
import {
  emptyImpressionSelections,
  type ArchImpressionEntry,
  type SlipImpressionSelections,
} from "@/components/case-design-center/utils/impressionStorage";
import {
  buildGroupedExtractionsChartDisplay,
  mergeArchExtractionDisplays,
  mergePreloadExtractionDisplaysForArch,
  overlayPreloadExtractionsOnChartDisplay,
  slipProductExtractionCatalog,
} from "@/lib/virtual-slip-extraction-display";
import { isTimExtractionRow } from "@/components/case-design-center/utils/extractionHelpers";

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
 * Resolve a slip product's selected teeth from the slip-details payload, matching
 * the read-only virtual slip view model: teeth_selection (string OR array), then a
 * `teeth` fallback. Preserves source order and de-dupes.
 */
export function parseProductTeeth(apiProduct: any): number[] {
  const teeth = parseTeethValue(apiProduct?.teeth_selection ?? apiProduct?.teeth);
  return [...new Set(teeth)];
}

/**
 * Determine the arch of a product based on its `type` field.
 * "Upper" → "maxillary", "Lower" → "mandibular"
 */
function archFromType(type: string | null | undefined): "maxillary" | "mandibular" {
  return type?.toLowerCase() === "lower" ? "mandibular" : "maxillary";
}

function isRemovableApiProduct(apiProduct: any): boolean {
  const categoryName: string =
    apiProduct?.category?.name ??
    apiProduct?.product?.subcategory?.category?.name ??
    apiProduct?.product?.category_name ??
    "";
  return categoryName.toLowerCase().includes("removable");
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
      if (!isRemovableApiProduct(apiProduct)) continue;
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

  for (let i = 0; i < apiProducts.length; i++) {
    const apiProduct: any = apiProducts[i];
    const cardId = i + 1; // 0 reserved for initial product
    const arch = archFromType(apiProduct.type);
    const productData = withSlipExtractionCatalog(
      apiProduct,
      apiProduct.product ?? { id: apiProduct.product_id ?? 0 },
    );
    const teeth = parseProductTeeth(apiProduct);

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
    const categoryName: string =
      apiProduct.category?.name ??
      productData?.subcategory?.category?.name ??
      productData?.category_name ??
      "";
    const isRemovable = categoryName.toLowerCase().includes("removable");

    if (!isRemovable) {
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

      for (const tn of teeth) {
        // Use API-provided retentions if available, otherwise default to Prep
        retentionTypesMap[tn] = retentionsByTooth[tn] ?? ["Prep"];
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
    const teethShadeName: string =
      (apiProduct.teeth_shade?.name || apiProduct.teeth_shade_name || "").trim();
    const gumShadeName: string =
      (apiProduct.gum_shade?.name || apiProduct.gum_shade_name || "").trim();
    const stumpShadeName: string =
      (apiProduct.stump_shade?.name || apiProduct.stump_shade_name || "").trim();
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
      const productIdKey = isRemovable ? `prep_${repTooth}` : `fixed_${repTooth}`;

      if (teethShadeName) {
        selectedShades[`${productIdKey}_${arch}_tooth_shade`] = teethShadeName;
      }
      if (gumShadeName) {
        selectedShades[`${productIdKey}_${arch}_gum_shade`] = gumShadeName;
      }
      if (stumpShadeName) {
        selectedShades[`${productIdKey}_${arch}_stump_shade`] = stumpShadeName;
      }

      // ── Stage selections ─────────────────────────────────────────────────
      if (stageName) {
        const stageKey = isRemovable ? `${arch}_prep_${repTooth}` : `${arch}_fixed_${repTooth}`;
        selectedStages[stageKey] = stageName;
      }

      // ── Completed fields and field values ────────────────────────────────
      // For fixed restoration (read-only virtual slip), mark all chain steps as completed
      // so the progressive-disclosure gate (getVisibleStepCount) unlocks every field for display.
      // For removable, only mark steps that have actual data.
      const toothKey = `${arch}_${repTooth}`;
      const completed: string[] = [];
      const values: Record<string, string> = {};

      if (!isRemovable) {
        // Fixed restoration: unlock the entire chain so all fields render in read-only mode.
        // Values are populated only where data exists; steps without data still show as empty.
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
        for (const step of FIXED_CHAIN) {
          completed.push(step);
        }
        if (stageName) values["fixed_stage"] = stageName;
        if (stumpShadeName) values["fixed_stump_shade"] = stumpShadeName;
        if (teethShadeName) values["fixed_shade_trio"] = teethShadeName;
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
        completedFields[toothKey] = completed;
        fieldValues[toothKey] = values;
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
    if (!isRemovable && repTooth !== null &&
        Array.isArray(apiProduct.advance_fields) && apiProduct.advance_fields.length > 0 &&
        Array.isArray(apiProduct.product?.advance_fields)) {
      const productFieldDefs: Array<{ id: number; name: string; options?: Array<{ id: number; name: string }> }> =
        apiProduct.product.advance_fields;

      // Build a lookup: field_id → { name, savedValue, optionId }
      const savedByFieldId: Record<number, string> = {};
      for (const saved of apiProduct.advance_fields) {
        const fieldId = saved.advance_field_id ?? saved.id;
        const value = saved.advance_field_value ?? saved.value ?? "";
        if (fieldId && value) {
          savedByFieldId[fieldId] = value;
        }
      }

      // Step name-matchers — mirror getAdvanceFieldsForStep in FixedRestorationFields.tsx
      const STEP_MATCHERS: Array<[string, (n: string) => boolean]> = [
        ["fixed_contact_icons", (n) => n.includes("occlusal") || n.includes("pontic") || n.includes("embrasure") || (n.includes("proximal") && n.includes("contact") && !n.includes("mesial") && !n.includes("distal"))],
        ["fixed_proximal_contact", (n) => (n.includes("proximal") && n.includes("contact") && (n.includes("mesial") || n.includes("distal"))) || n.includes("functional guidance")],
        ["fixed_margin", (n) => n.includes("margin")],
        ["fixed_metal", (n) => n.includes("metal")],
      ];

      const toothKey = `${arch}_${repTooth}`;

      // Group saved values by step, building JSON objects in the same format as interactive use
      const stepAccumulators: Record<string, Record<string, { name: string; optionId: number }>> = {};

      for (const def of productFieldDefs) {
        const savedValue = savedByFieldId[def.id];
        if (!savedValue) continue;

        const fieldNameLower = (def.name || "").toLowerCase();
        const matchedStep = STEP_MATCHERS.find(([, matcher]) => matcher(fieldNameLower));
        if (!matchedStep) continue;

        const stepKey = matchedStep[0];
        // Resolve optionId from the field definition options
        const matchedOption = def.options?.find((o) => o.name === savedValue);
        const optionId = matchedOption?.id ?? 0;

        if (!stepAccumulators[stepKey]) stepAccumulators[stepKey] = {};
        stepAccumulators[stepKey][def.id] = { name: savedValue, optionId };
      }

      // Write accumulated step values into fieldValues and mark steps as completed
      for (const [stepKey, storedValues] of Object.entries(stepAccumulators)) {
        if (Object.keys(storedValues).length === 0) continue;
        const existing = fieldValues[toothKey] ?? {};
        fieldValues[toothKey] = { ...existing, [stepKey]: JSON.stringify(storedValues) };
        // completedFields for this tooth is already the full FIXED_CHAIN array (set above)
        // so no additional push is needed
      }
    }
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
