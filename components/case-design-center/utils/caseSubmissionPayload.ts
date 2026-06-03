import type {
  SlipCreationMultipartFile,
  SlipCreationPayload,
  SlipCreationProduct,
  SlipCreationShadeDetail,
} from "@/services/slip-creation-service";
import type { ProductImplant } from "@/services/implant-api";
import type { Arch, SlipProductSnapshot } from "../types";
import { getPreferredLabTeethShade } from "@/lib/product-shade-preferences";
import { hasRetentionOptions } from "./categoryHelpers";
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
  normalizeRush,
  partitionAdvanceFieldsForMultipart,
  prefetchImplantCatalogsForSnapshots,
  resolveMaterialId,
} from "./slipPayloadMappers";

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

/** Resolve teeth shade IDs for removable products at submit time. */
function resolveRemovableTeethShadeIds(
  snap: SlipProductSnapshot,
  product: SlipProductSnapshot["productApiData"]
): { teeth_shade_id: number; teeth_shade_brand_id: number } | null {
  const parsed = parseRemovableTeethShadeField(snap.fieldValues["teeth_shade"] ?? "");
  let { teeth_shade_id, teeth_shade_brand_id, name } = parsed;

  if (teeth_shade_id <= 0 || teeth_shade_brand_id <= 0) {
    const snapArch: Arch = snap.type === "Upper" ? "maxillary" : "mandibular";
    const selectedName = snap.selectedShades[
      buildShadeSelectionKey(`prep_${snap.repToothNumber}`, snapArch, "tooth_shade")
    ];
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
  stageName: string | null
): number | undefined {
  if (!product || product.has_stage === "No" || product.is_single_stage === "Yes") {
    return undefined;
  }
  if (!stageName) return undefined;
  const stageObj = product.stages?.find((s: { name?: string }) => s.name === stageName);
  const stage_id = stageObj?.stage_id ?? 0;
  return stage_id > 0 ? stage_id : undefined;
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
  const stage_id = resolveStageId(product, snap.stageName);

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

  const cardTeeth =
    snap.allCardTeeth && snap.allCardTeeth.length > 0
      ? snap.allCardTeeth
      : snap.checkedTeeth && snap.checkedTeeth.length > 0
        ? snap.checkedTeeth
        : snap.teethNumbers;

  const retentionTypesByTooth = snap.retentionTypesByTooth ?? {};
  const toothExtractionMap = snap.toothExtractionMap ?? {};
  const claspTeeth = snap.claspTeeth ?? [];

  const extractions = buildProductExtractions(
    product,
    toothExtractionMap,
    claspTeeth,
    cardTeeth
  );
  const retention_options = buildRetentionOptions(
    product,
    retentionTypesByTooth,
    cardTeeth
  );
  const retentions = buildRetentions(
    product,
    snap.fieldValues,
    retentionTypesByTooth,
    cardTeeth
  );
  const material_id = resolveMaterialId(product, snap.fieldValues);
  const variation_id = resolveVariationId(product, cardTeeth.length);
  const rush = normalizeRush(snap.rush);

  const teeth_selection = buildTeethSelection(
    product,
    retentionTypesByTooth,
    toothExtractionMap,
    claspTeeth,
    cardTeeth
  );
  const tooth_chart = buildToothChart(
    product,
    snap.fieldValues,
    retentionTypesByTooth,
    toothExtractionMap,
    claspTeeth,
    cardTeeth,
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
    ...(rush ? { rush } : {}),
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

    return {
      ...sharedProductFields,
      ...(grade_id ? { grade_id } : {}),
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

  const gumShadeStr = snap.fieldValues["gum_shade"] ?? "";
  let gum_shade_id = 0;
  let gum_shade_brand_id = 0;
  if (gumShadeStr) {
    try {
      const parsed = JSON.parse(gumShadeStr);
      gum_shade_id = parsed.gum_shade_id ?? 0;
      gum_shade_brand_id = parsed.brand_id ?? 0;
    } catch {
      const matchedGumShade = product?.gum_shades?.find(
        (s: { name?: string }) => s.name === gumShadeStr
      );
      if (matchedGumShade) {
        gum_shade_id = matchedGumShade.gum_shade_id ?? matchedGumShade.id;
        gum_shade_brand_id = matchedGumShade.brand?.id ?? 0;
      }
    }
  }

  return {
    ...sharedProductFields,
    ...(grade_id ? { grade_id } : {}),
    ...(teethShadeIds ? { ...teethShadeIds } : {}),
    ...(gum_shade_id ? { gum_shade_id, gum_shade_brand_id } : {}),
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

  const multipartFiles: SlipCreationMultipartFile[] = [];
  products.forEach((product, productIndex) => {
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

  if (process.env.NODE_ENV === "development") {
    console.debug("[case-design-center] slip/create payload", {
      case: { lab_id: labId, office_id: officeId },
      products,
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
      slips: [
        {
          status: "In Progress",
          products,
          notes: products
            .map((p) => p.notes)
            .filter((note): note is string => Boolean(note))
            .map((note) => ({ note })),
        },
      ],
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
  const labId = params.role === "lab_admin" ? params.customerId : params.completedLabId ?? 0;
  const officeId =
    params.role === "lab_admin" ? params.completedLabId ?? 0 : params.customerId;

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
    slips: [
      {
        status: "In Progress",
        products,
        notes: products
          .map((p) => p.notes)
          .filter((note): note is string => Boolean(note))
          .map((note) => ({ note })),
      },
    ],
  };
}
