import type {
  SlipCreationMultipartFile,
  SlipCreationPayload,
  SlipCreationProduct,
  SlipCreationShadeDetail,
} from "@/services/slip-creation-service";
import type { ProductImplant } from "@/services/implant-api";
import type { Arch, SlipProductSnapshot } from "../types";
import { getPreferredLabTeethShade } from "@/lib/product-shade-preferences";
import { hasRetentionOptions, resolveStageIdFromSelection } from "./categoryHelpers";
import { buildProductNoteFromSnapshot } from "./caseNoteBuilder";
import { buildShadeSelectionKey, getShadeFieldType, getShadeGuideAdvanceFields } from "./shadeGuideAdvanceFields";
import { findVariationByTeethCount } from "./variationHelpers";
import {
  buildImplantAndAbutmentDetails,
  buildProductExtractions,
  buildRetentions,
  buildRetentionOptions,
  buildTeethSelection,
  buildToothChart,
  groupProductsIntoSlips,
  normalizeRush,
  partitionAdvanceFieldsForMultipart,
  prefetchImplantCatalogsForSnapshots,
  resolveMaterialId,
} from "./slipPayloadMappers";
import { formatSplintGroupsForApi } from "./splintHelpers";
import {
  buildSlipLevelNotes,
  clearProductNotesWhenUsingCaseSummary,
} from "./caseSummaryNotesPayload";
import { mergeDefaultToothChartIntoSlipPayloadMaps } from "@/lib/product-default-tooth-chart-slip-display";
import type { RetentionChartType } from "./retentionOptionChartType";

interface BuildCaseSubmissionPayloadParams {
  snapshots: SlipProductSnapshot[];
  role: string | null;
  customerId: number;
  completedLabId: number | null | undefined;
  completedDoctorId: number | null | undefined;
  patientName: string;
  gender?: string;
  age?: string;
  /** Lab customer id for implant prefetch (`/slip/product/implants`) */
  labCustomerId?: number;
  /** Case Summary Notes textarea content (auto-generated or user-edited). */
  caseSummaryNotes?: string;
}

function parseShadeDisplayName(raw: string): string {
  try {
    return JSON.parse(raw).name ?? raw;
  } catch {
    return raw;
  }
}

function parseRemovableTeethShadeField(raw: string): {
  teeth_shade_id: number;
  teeth_shade_brand_id: number;
  name: string;
} {
  if (!raw.trim()) {
    return { teeth_shade_id: 0, teeth_shade_brand_id: 0, name: "" };
  }
  try {
    const parsed = JSON.parse(raw) as {
      teeth_shade_id?: number;
      brand_id?: number;
      name?: string;
    };
    return {
      teeth_shade_id: Number(parsed.teeth_shade_id ?? 0),
      teeth_shade_brand_id: Number(parsed.brand_id ?? 0),
      name: String(parsed.name ?? "").trim(),
    };
  } catch {
    return { teeth_shade_id: 0, teeth_shade_brand_id: 0, name: raw.trim() };
  }
}

function parseGumShadeField(raw: string): {
  gum_shade_id: number;
  gum_shade_brand_id: number;
  name: string;
} {
  if (!raw.trim()) {
    return { gum_shade_id: 0, gum_shade_brand_id: 0, name: "" };
  }
  try {
    const parsed = JSON.parse(raw) as {
      gum_shade_id?: number;
      brand_id?: number;
      name?: string;
    };
    return {
      gum_shade_id: Number(parsed.gum_shade_id ?? 0),
      gum_shade_brand_id: Number(parsed.brand_id ?? 0),
      name: String(parsed.name ?? "").trim(),
    };
  } catch {
    return { gum_shade_id: 0, gum_shade_brand_id: 0, name: raw.trim() };
  }
}

function collectCardRepToothNumbers(snap: SlipProductSnapshot): number[] {
  const teeth = new Set<number>();
  if (snap.repToothNumber != null) teeth.add(snap.repToothNumber);
  snap.teethNumbers?.forEach((tn) => teeth.add(tn));
  snap.cardFieldTeeth?.forEach((tn) => teeth.add(tn));
  snap.allCardTeeth?.forEach((tn) => teeth.add(tn));
  return [...teeth];
}

function resolveSelectedToothShadeName(
  snap: SlipProductSnapshot,
  arch: Arch
): string | undefined {
  for (const tn of collectCardRepToothNumbers(snap)) {
    const key = buildShadeSelectionKey(`prep_${tn}`, arch, "tooth_shade");
    const val = snap.selectedShades[key]?.trim();
    if (val) return val;
  }
  return undefined;
}

/** Resolve teeth shade IDs for removable products at submit time. */
function resolveRemovableTeethShadeIds(
  snap: SlipProductSnapshot,
  product: SlipProductSnapshot["productApiData"]
): { teeth_shade_id: number; teeth_shade_brand_id: number } | null {
  const parsed = parseRemovableTeethShadeField(snap.fieldValues["teeth_shade"] ?? "");
  let { teeth_shade_id, teeth_shade_brand_id, name } = parsed;

  if (teeth_shade_id <= 0 || teeth_shade_brand_id <= 0) {
    const snapArch: Arch = snap.type === "Upper" ? "maxillary" : "mandibular";
    const selectedName = resolveSelectedToothShadeName(snap, snapArch);
    if (selectedName) name = name || selectedName;
  }

  if (teeth_shade_id > 0 && teeth_shade_brand_id > 0) {
    return { teeth_shade_id, teeth_shade_brand_id };
  }

  if (name) {
    const fromCatalog = resolveTeethShadeSelection(product, name, snap.shadeGuide ?? "");
    if (fromCatalog) return fromCatalog;
  }

  const pref = getPreferredLabTeethShade(product);
  if (pref) {
    const preferredId = Number(pref.teeth_shade_id ?? pref.id ?? 0);
    const preferredBrandId = Number((pref.brand as { id?: number } | undefined)?.id ?? 0);
    if (preferredId > 0 && preferredBrandId > 0) {
      return { teeth_shade_id: preferredId, teeth_shade_brand_id: preferredBrandId };
    }
  }

  return null;
}

function resolveTeethShadeSelection(
  product: SlipProductSnapshot["productApiData"],
  shadeName: string,
  shadeGuideSystemName: string
): { teeth_shade_id: number; teeth_shade_brand_id: number } | null {
  if (!product?.teeth_shades?.length) return null;
  const normalizedShade = shadeName.trim().toLowerCase();
  if (!normalizedShade) return null;
  const normalizedGuide = shadeGuideSystemName.trim().toLowerCase();

  const exactGuideMatch = product.teeth_shades.find((row) => {
    const rowShade = (row.name ?? "").trim().toLowerCase();
    const rowGuide = (row.brand?.system_name ?? "").trim().toLowerCase();
    return rowShade === normalizedShade && rowGuide === normalizedGuide;
  });
  const fallbackMatch = product.teeth_shades.find(
    (row) => (row.name ?? "").trim().toLowerCase() === normalizedShade
  );
  const matched = exactGuideMatch ?? fallbackMatch;
  if (!matched) return null;
  const teeth_shade_id = Number(matched.teeth_shade_id ?? matched.id ?? 0);
  const teeth_shade_brand_id = Number(matched.brand?.id ?? 0);
  if (teeth_shade_id <= 0 || teeth_shade_brand_id <= 0) return null;
  return { teeth_shade_id, teeth_shade_brand_id };
}

function resolveStageId(
  product: SlipProductSnapshot["productApiData"],
  stageName: string | null,
  stageRaw?: string | null
): number | undefined {
  return resolveStageIdFromSelection(product, stageRaw, stageName);
}

function resolveGumShadeIds(
  snap: SlipProductSnapshot,
  product: SlipProductSnapshot["productApiData"]
): { gum_shade_id: number; gum_shade_brand_id: number } | null {
  const parsed = parseGumShadeField(snap.fieldValues["gum_shade"] ?? "");
  let { gum_shade_id, gum_shade_brand_id, name } = parsed;

  if (gum_shade_id > 0 && gum_shade_brand_id > 0) {
    return { gum_shade_id, gum_shade_brand_id };
  }

  if (name && product?.gum_shades?.length) {
    const matched = product.gum_shades.find(
      (s: { name?: string }) => (s.name ?? "").trim() === name
    );
    if (matched) {
      const id = Number(matched.gum_shade_id ?? matched.id ?? 0);
      const brandId = Number(matched.brand?.id ?? 0);
      if (id > 0 && brandId > 0) {
        return { gum_shade_id: id, gum_shade_brand_id: brandId };
      }
    }
  }

  return null;
}

/**
 * Placeholder field values written by the fixed shade sync effects — these are not
 * real shade names, so a resolver must ignore them and fall back to the shade map.
 */
const FIXED_SHADE_PLACEHOLDER_NAMES = new Set([
  "shade-sync",
  "shade-sync-skip-stump",
  "selected",
]);

function stripFixedShadePlaceholder(name: string): string {
  return FIXED_SHADE_PLACEHOLDER_NAMES.has(name.trim().toLowerCase()) ? "" : name;
}

/**
 * Resolve a fixed product's picked shade NAME from the shade-selection map, mirroring the
 * panels' display source (`getSelectedShade(fixedShadeProductId, arch, fieldType)`), with a
 * legacy per-tooth `fixed_{tooth}` fallback for the brief window before the product-scoped id
 * loads (see migrateFixedShadeProductId).
 */
function resolveFixedSelectedShadeName(
  snap: SlipProductSnapshot,
  arch: Arch,
  fixedShadeProductId: string,
  fieldType: "tooth_shade" | "stump_shade"
): string | undefined {
  const primary =
    snap.selectedShades[buildShadeSelectionKey(fixedShadeProductId, arch, fieldType)]?.trim();
  if (primary) return primary;
  for (const tn of collectCardRepToothNumbers(snap)) {
    const val = snap.selectedShades[buildShadeSelectionKey(`fixed_${tn}`, arch, fieldType)]?.trim();
    if (val) return val;
  }
  return undefined;
}

/**
 * Fixed restoration classic Teeth Shade (has_teeth_shade / fixed_shade_trio). The field value
 * carries the resolved ids on edit/add-stage preload; on fresh create only the shade NAME is in
 * the shade-selection map, so fall back to resolving it against the product's teeth_shades catalog.
 * Returns null for named shade_guide products (classic keys unset) so nothing duplicate is emitted.
 */
function resolveFixedTeethShadeIds(
  snap: SlipProductSnapshot,
  product: SlipProductSnapshot["productApiData"],
  arch: Arch,
  fixedShadeProductId: string
): { teeth_shade_id: number; teeth_shade_brand_id: number } | null {
  const parsed = parseRemovableTeethShadeField(snap.fieldValues["fixed_shade_trio"] ?? "");
  if (parsed.teeth_shade_id > 0 && parsed.teeth_shade_brand_id > 0) {
    return {
      teeth_shade_id: parsed.teeth_shade_id,
      teeth_shade_brand_id: parsed.teeth_shade_brand_id,
    };
  }
  const name =
    stripFixedShadePlaceholder(parsed.name) ||
    resolveFixedSelectedShadeName(snap, arch, fixedShadeProductId, "tooth_shade");
  if (name) {
    const fromCatalog = resolveTeethShadeSelection(product, name, snap.shadeGuide ?? "");
    if (fromCatalog) return fromCatalog;
  }
  return null;
}

/**
 * Fixed restoration classic Gum Shade (has_gum_shade). Fixed products keep the gum pick in the
 * `fixed_stump_shade` field value as JSON `{ gum_shade_id, brand_id, name }`; when only the name
 * is present, resolve it against the product's gum_shades catalog.
 */
function resolveFixedGumShadeIds(
  snap: SlipProductSnapshot,
  product: SlipProductSnapshot["productApiData"],
  arch: Arch,
  fixedShadeProductId: string
): { gum_shade_id: number; gum_shade_brand_id: number } | null {
  const parsed = parseGumShadeField(snap.fieldValues["fixed_stump_shade"] ?? "");
  if (parsed.gum_shade_id > 0 && parsed.gum_shade_brand_id > 0) {
    return { gum_shade_id: parsed.gum_shade_id, gum_shade_brand_id: parsed.gum_shade_brand_id };
  }
  const name =
    stripFixedShadePlaceholder(parsed.name) ||
    resolveFixedSelectedShadeName(snap, arch, fixedShadeProductId, "stump_shade");
  if (name && product?.gum_shades?.length) {
    const matched = product.gum_shades.find(
      (s: { name?: string }) => (s.name ?? "").trim() === name
    );
    if (matched) {
      const id = Number(matched.gum_shade_id ?? matched.id ?? 0);
      const brandId = Number(matched.brand?.id ?? 0);
      if (id > 0 && brandId > 0) {
        return { gum_shade_id: id, gum_shade_brand_id: brandId };
      }
    }
  }
  return null;
}

function resolveVariationId(
  product: SlipProductSnapshot["productApiData"],
  selectedTeethCount: number
): number | undefined {
  if (!product || selectedTeethCount <= 0) return undefined;
  const hasVariationEnabled =
    product.has_variation === true ||
    product.has_variation === "Yes" ||
    product.has_variation === "yes";
  if (!hasVariationEnabled) return undefined;

  const matchedVariation = findVariationByTeethCount(
    product.variations ?? [],
    selectedTeethCount
  );
  const variationId = Number(matchedVariation?.id ?? 0);
  return variationId > 0 ? variationId : undefined;
}

export function snapshotToProduct(
  snap: SlipProductSnapshot,
  implantCatalog?: ProductImplant[]
): SlipCreationProduct {
  const product = snap.productApiData;
  const isFixed = hasRetentionOptions(product);
  const stageRaw = snap.fieldValues["stage"] ?? snap.fieldValues["fixed_stage"] ?? null;
  const stage_id =
    snap.stageId && snap.stageId > 0
      ? snap.stageId
      : resolveStageId(product, snap.stageName, stageRaw);

  const mapImpressionEntries = (byCode: Record<string, number> | undefined) =>
    Object.entries(byCode ?? {})
      .filter(([, qty]) => qty > 0)
      .map(([code, qty]) => {
        const imp = product?.impressions?.find((i: { code?: string }) => i.code === code);
        return { impression_id: imp?.impression_id ?? imp?.id ?? 0, quantity: qty };
      })
      .filter((i) => i.impression_id > 0);

  const impressions = mapImpressionEntries(snap.impressions);
  const opposite_impressions = mapImpressionEntries(snap.oppositeImpressions);

  const snapArch = snap.type === "Upper" ? "maxillary" : "mandibular";
  const addonKey = `${snapArch}_${snap.repToothNumber}`;
  const addonItems = snap.selectedAddonsByTooth?.[addonKey] ?? [];
  const addons = addonItems
    .filter((a) => a.qty > 0)
    .map((a) => ({ addon_id: a.addon_id, quantity: a.qty }));

  const productTeeth = [...snap.teethNumbers].sort((a, b) => a - b);
  const extractionScopeTeeth =
    snap.allCardTeeth && snap.allCardTeeth.length > 0
      ? [...snap.allCardTeeth].sort((a, b) => a - b)
      : productTeeth;

  const mergedChartMaps = mergeDefaultToothChartIntoSlipPayloadMaps(
    product,
    snapArch,
    {
      retentionTypesByTooth: (snap.retentionTypesByTooth ?? {}) as Record<
        number,
        RetentionChartType[]
      >,
      toothExtractionMap: snap.toothExtractionMap ?? {},
      claspTeeth: snap.claspTeeth ?? [],
      teeth: [...new Set([...productTeeth, ...extractionScopeTeeth])],
    },
  );
  const retentionTypesByTooth = mergedChartMaps.retentionTypesByTooth;
  const toothExtractionMap = mergedChartMaps.toothExtractionMap;
  const claspTeeth = mergedChartMaps.claspTeeth;

  const extractions = buildProductExtractions(
    product,
    toothExtractionMap,
    claspTeeth,
    extractionScopeTeeth
  );
  const retention_options = buildRetentionOptions(
    product,
    retentionTypesByTooth,
    extractionScopeTeeth
  );
  const retentions = buildRetentions(
    product,
    snap.fieldValues,
    retentionTypesByTooth,
    extractionScopeTeeth
  );
  const material_id = resolveMaterialId(product, snap.fieldValues);
  const variation_id = resolveVariationId(product, productTeeth.length);
  const rush = normalizeRush(snap.rush);
  // Splinting is retention-driven (auto Rule S1 + manual): emit whenever the panel
  // produced effective splint links, or the catalog product is flagged splinted.
  const splinted_teeth = snap.splintLinks?.length
    ? formatSplintGroupsForApi(productTeeth, snap.splintLinks)
    : [];
  const isSplintedProduct =
    product?.is_splinted === "Yes" || splinted_teeth.length > 0;
  const wing_teeth = snap.wingTeeth ?? "";

  const teeth_selection = buildTeethSelection(
    product,
    retentionTypesByTooth,
    toothExtractionMap,
    claspTeeth,
    productTeeth
  );
  const tooth_chart = buildToothChart(
    product,
    snap.fieldValues,
    retentionTypesByTooth,
    toothExtractionMap,
    claspTeeth,
    extractionScopeTeeth,
    snap.oppositeExtractions
  );

  const sharedProductFields = {
    type: snap.type as "Upper" | "Lower",
    category_id: product?.subcategory?.category_id ?? 0,
    product_id: snap.productId,
    subcategory_id: product?.subcategory?.id ?? 0,
    ...(stage_id !== undefined ? { stage_id } : {}),
    ...(teeth_selection.length > 0 ? { teeth_selection } : {}),
    status: "In Progress" as const,
    notes: buildProductNoteFromSnapshot(snap) || undefined,
    ...(impressions.length > 0 ? { impressions } : {}),
    ...(opposite_impressions.length > 0 ? { opposite_impressions } : {}),
    ...(addons.length > 0 ? { addons } : {}),
    ...(extractions.length > 0 ? { extractions } : {}),
    ...(retention_options.length > 0 ? { retention_options } : {}),
    ...(retentions.length > 0 ? { retentions } : {}),
    ...(material_id ? { material_id } : {}),
    ...(variation_id ? { variation_id } : {}),
    ...(snap.oppositeExtractions && snap.oppositeExtractions.length > 0
      ? { opposite_extractions: snap.oppositeExtractions }
      : {}),
    ...(tooth_chart.length > 0 ? { tooth_chart } : {}),
    rush,
    ...(isSplintedProduct ? { is_splinted: "Yes" as const } : {}),
    ...(splinted_teeth.length > 0 ? { splinted_teeth } : {}),
    ...(wing_teeth.length > 0 ? { wing_teeth } : {}),
  };

  if (isFixed) {
    const advance_fields: SlipCreationProduct["advance_fields"] = [];
    const shade_details: SlipCreationShadeDetail[] = [];
    const fixedShadeProductId = product?.id
      ? `fixed_p_${product.id}`
      : `fixed_${snap.repToothNumber}`;
    const shadeGuideFields = getShadeGuideAdvanceFields(product?.advance_fields);

    if (shadeGuideFields.length > 0) {
      for (const field of shadeGuideFields) {
        const fieldType = getShadeFieldType(field);
        const selectedShade =
          snap.selectedShades[
            buildShadeSelectionKey(
              fixedShadeProductId,
              snapArch as "maxillary" | "mandibular",
              fieldType,
              field.id
            )
          ];
        if (!selectedShade) continue;
        const shadeSelection = resolveTeethShadeSelection(
          product,
          selectedShade,
          snap.shadeGuide ?? ""
        );
        if (shadeSelection) {
          shade_details.push({
            advance_field_id: field.id,
            teeth_shade_brand_id: shadeSelection.teeth_shade_brand_id,
            teeth_shade_id: shadeSelection.teeth_shade_id,
          });
        }
        advance_fields.push({
          teeth_number: null,
          advance_field_id: field.id,
          advance_field_value: selectedShade,
        });
      }
    }

    const advanceFieldKeys: Array<[string, (n: string) => boolean, boolean]> = [
      ["fixed_characterization", (n) => n.includes("characterization"), false],
      [
        "fixed_contact_icons",
        (n) => n.includes("occlusal") || n.includes("pontic") || n.includes("embrasure"),
        false,
      ],
      ["fixed_margin", (n) => n.includes("margin"), false],
      ["fixed_metal", (n) => n.includes("metal"), false],
      ["fixed_proximal_contact", (n) => n.includes("proximal") && n.includes("contact"), false],
      ["fixed_notes", (n) => n.includes("note") || n.includes("additional"), false],
      ["fixed_retention_type", (n) => n.includes("retention"), false],
    ];

    for (const [key, matcher, isShadeJson] of advanceFieldKeys) {
      const raw = snap.fieldValues[key];
      if (!raw) continue;
      const advField = product?.advance_fields?.find((af: { name?: string; field_type?: string }) => {
        if (shadeGuideFields.length > 0 && af.field_type === "shade_guide") return false;
        return matcher((af.name ?? "").toLowerCase());
      });
      if (!advField) continue;
      const value = isShadeJson ? parseShadeDisplayName(raw) : raw;
      advance_fields.push({
        teeth_number: null,
        advance_field_id: advField.id,
        advance_field_value: value,
      });
    }

    if (snap.advanceFieldFiles) {
      for (const [stepKey, file] of Object.entries(snap.advanceFieldFiles)) {
        const advField = product?.advance_fields?.find(
          (af: { name?: string; field_type?: string }) =>
            (af.field_type ?? "").toLowerCase() === "file" ||
            (af.name ?? "").toLowerCase().includes(stepKey.replace("fixed_", ""))
        );
        if (!advField) continue;
        advance_fields.push({
          teeth_number: null,
          advance_field_id: advField.id,
          file,
        });
      }
    }

    const implantLibraryField = product?.advance_fields?.find(
      (af: { field_type?: string }) => (af.field_type ?? "").toLowerCase() === "implant_library"
    );
    if (implantLibraryField && snap.implantDetailByTooth) {
      for (const [toothKey, implantDetail] of Object.entries(snap.implantDetailByTooth)) {
        if (
          !implantDetail ||
          !(implantDetail.brand || implantDetail.platform || implantDetail.size)
        ) {
          continue;
        }
        advance_fields.push({
          teeth_number: Number(toothKey),
          advance_field_id: implantLibraryField.id,
          advance_field_value: JSON.stringify({
            brand: implantDetail.brand || null,
            system_name: implantDetail.systemName || null,
            platform: implantDetail.platform || null,
            size: implantDetail.size || null,
            inclusions: implantDetail.inclusions || null,
            abutment_type: implantDetail.abutmentType || null,
            abutment_detail: implantDetail.abutmentDetail || null,
          }),
        });
      }
    }

    const { implant_details, abutment_details } = buildImplantAndAbutmentDetails(
      product,
      snap.implantDetailByTooth,
      implantCatalog
    );

    const gradeRaw = snap.fieldValues["grade"] ?? "";
    let grade_id: number | undefined;
    if (gradeRaw) {
      try {
        const parsed = JSON.parse(gradeRaw);
        const id = Number(parsed.grade_id ?? 0);
        if (id > 0) grade_id = id;
      } catch {
        const id =
          product?.grades?.find((g: { name?: string; grade_id?: number }) => g.name === gradeRaw)
            ?.grade_id ?? 0;
        if (id > 0) grade_id = id;
      }
    }

    // Classic Teeth Shade / Gum Shade (has_teeth_shade / has_gum_shade) — emitted the same
    // way as removables so fixed products persist the picked shades. Named shade_guide fields
    // stay in shade_details/advance_fields above; these resolvers return null for those.
    const teethShadeIds = resolveFixedTeethShadeIds(snap, product, snapArch, fixedShadeProductId);
    const gumShadeIds = resolveFixedGumShadeIds(snap, product, snapArch, fixedShadeProductId);

    return {
      ...sharedProductFields,
      ...(grade_id ? { grade_id } : {}),
      ...(teethShadeIds ? { ...teethShadeIds } : {}),
      ...(gumShadeIds ? { ...gumShadeIds } : {}),
      ...(shade_details.length > 0 ? { shade_details } : {}),
      ...(advance_fields.length > 0 ? { advance_fields } : {}),
      ...(implant_details.length > 0 ? { implant_details } : {}),
      ...(abutment_details.length > 0 ? { abutment_details } : {}),
    } as SlipCreationProduct;
  }

  const gradeRaw = snap.fieldValues["grade"] ?? "";
  let grade_id: number | undefined;
  if (gradeRaw) {
    try {
      const id = Number(JSON.parse(gradeRaw).grade_id ?? 0);
      if (id > 0) grade_id = id;
    } catch {
      const id =
        product?.grades?.find((g: { name?: string; grade_id?: number }) => g.name === gradeRaw)
          ?.grade_id ?? 0;
      if (id > 0) grade_id = id;
    }
  }

  const teethShadeIds = resolveRemovableTeethShadeIds(snap, product);
  const gumShadeIds = resolveGumShadeIds(snap, product);

  return {
    ...sharedProductFields,
    ...(grade_id ? { grade_id } : {}),
    ...(teethShadeIds ? { ...teethShadeIds } : {}),
    ...(gumShadeIds ? { ...gumShadeIds } : {}),
  } as SlipCreationProduct;
}

export interface BuildCaseSubmissionResult {
  payload: SlipCreationPayload;
  multipartFiles: SlipCreationMultipartFile[];
}

export async function buildCaseSubmissionPayloadAsync(
  params: BuildCaseSubmissionPayloadParams
): Promise<BuildCaseSubmissionResult> {
  const {
    snapshots,
    role,
    customerId,
    completedLabId,
    completedDoctorId,
    patientName,
    gender,
    age,
    labCustomerId,
    caseSummaryNotes,
  } = params;

  const filteredSnapshots = snapshots.filter(
    (s) => s.teethNumbers.length > 0 || s.productId > 0
  );

  const implantCustomerId =
    labCustomerId ??
    (role === "lab_admin" ? customerId : completedLabId ?? customerId);
  const implantCatalogs = await prefetchImplantCatalogsForSnapshots(
    filteredSnapshots,
    implantCustomerId
  );

  const products = filteredSnapshots.map((snap) =>
    snapshotToProduct(snap, implantCatalogs.get(snap.productId))
  );

  const slipProductGroups = groupProductsIntoSlips(products);
  const totalSlips = slipProductGroups.length;
  const orderedProducts = slipProductGroups.flat();
  clearProductNotesWhenUsingCaseSummary(orderedProducts, caseSummaryNotes, totalSlips);

  const multipartFiles: SlipCreationMultipartFile[] = [];
  orderedProducts.forEach((product, productIndex) => {
    const { jsonFields, fileSlots } = partitionAdvanceFieldsForMultipart(
      product.advance_fields,
      0,
      productIndex
    );
    if (fileSlots.length > 0) {
      product.advance_fields = jsonFields;
      multipartFiles.push(
        ...fileSlots.map((s) => ({ formKey: s.formKey, file: s.file }))
      );
    }
  });

  const labId = role === "lab_admin" ? customerId : completedLabId ?? 0;
  const officeId = role === "lab_admin" ? completedLabId ?? 0 : customerId;

  const slips = slipProductGroups.map((slipProducts, slipIndex) => ({
    status: "In Progress" as const,
    products: slipProducts,
    notes: buildSlipLevelNotes(slipProducts, caseSummaryNotes, slipIndex, totalSlips),
  }));

  if (process.env.NODE_ENV === "development") {
    console.debug("[case-design-center] slip/create payload", {
      case: { lab_id: labId, office_id: officeId },
      slips,
      multipartFileKeys: multipartFiles.map((f) => f.formKey),
    });
  }

  return {
    payload: {
      case: {
        lab_id: labId,
        office_id: officeId,
        doctor: completedDoctorId ?? 0,
        patient_name: patientName,
        ...(gender ? { gender } : {}),
        ...(age ? { age: Number(age) } : {}),
        case_status: "In Progress",
      },
      slips,
    },
    multipartFiles,
  };
}

/** @deprecated Use buildCaseSubmissionPayloadAsync for implant prefetch and multipart files */
export function buildCaseSubmissionPayload(
  params: BuildCaseSubmissionPayloadParams
): SlipCreationPayload {
  const filteredSnapshots = params.snapshots.filter(
    (s) => s.teethNumbers.length > 0 || s.productId > 0
  );
  const products = filteredSnapshots.map((snap) => snapshotToProduct(snap));
  const slipProductGroups = groupProductsIntoSlips(products);
  const totalSlips = slipProductGroups.length;
  const labId = params.role === "lab_admin" ? params.customerId : params.completedLabId ?? 0;
  const officeId =
    params.role === "lab_admin" ? params.completedLabId ?? 0 : params.customerId;
  const orderedProducts = slipProductGroups.flat();
  clearProductNotesWhenUsingCaseSummary(orderedProducts, params.caseSummaryNotes, totalSlips);

  return {
    case: {
      lab_id: labId,
      office_id: officeId,
      doctor: params.completedDoctorId ?? 0,
      patient_name: params.patientName,
      ...(params.gender ? { gender: params.gender } : {}),
      ...(params.age ? { age: Number(params.age) } : {}),
      case_status: "In Progress",
    },
    slips: slipProductGroups.map((slipProducts, slipIndex) => ({
      status: "In Progress",
      products: slipProducts,
      notes: buildSlipLevelNotes(slipProducts, params.caseSummaryNotes, slipIndex, totalSlips),
    })),
  };
}
