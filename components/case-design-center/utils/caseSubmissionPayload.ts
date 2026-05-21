import type { SlipCreationPayload, SlipCreationProduct } from "@/services/slip-creation-service";
import type { SlipProductSnapshot } from "../types";
import { hasRetentionOptions } from "./categoryHelpers";
import { buildShadeSelectionKey, getShadeFieldType, getShadeGuideAdvanceFields } from "./shadeGuideAdvanceFields";

interface BuildCaseSubmissionPayloadParams {
  snapshots: SlipProductSnapshot[];
  role: string | null;
  customerId: number;
  completedLabId: number | null | undefined;
  completedDoctorId: number | null | undefined;
  patientName: string;
  gender?: string;
  age?: string;
}

/** Build the case summary note string for a product snapshot (mirrors CaseSummaryNotes logic). */
function buildProductNote(
  snap: SlipProductSnapshot,
  product: Record<string, any> | null,
  stageName: string | null
): string {
  const productName = product?.name || "";
  const teethStr = snap.teethNumbers.length
    ? snap.teethNumbers.slice().sort((a, b) => a - b).join(", ")
    : "";

  const gradeRaw = snap.fieldValues["grade"] ?? "";
  let gradeName = gradeRaw;
  try {
    const p = JSON.parse(gradeRaw);
    if (p?.skipped === true) gradeName = "";
    else gradeName = p.name ?? gradeRaw;
  } catch {}

  const teethShadeRaw = snap.fieldValues["teeth_shade"] ?? "";
  let teethShade = teethShadeRaw;
  try { const p = JSON.parse(teethShadeRaw); teethShade = p.name ?? teethShadeRaw; } catch {}
  const gumShadeRaw = snap.fieldValues["gum_shade"] ?? "";
  let gumShadeName = gumShadeRaw;
  try { const p = JSON.parse(gumShadeRaw); gumShadeName = p.name ?? gumShadeRaw; } catch {}

  const fixedNotes = snap.fieldValues["fixed_notes"] ?? "";

  let note = productName
    ? `Please fabricate a${gradeName ? ` ${gradeName}` : ""} ${productName} for teeth #${teethStr}${stageName ? `, in the ${stageName} stage` : ""}.`
    : "";

  if (teethShade || gumShadeName) {
    note += ` Use${teethShade ? ` ${teethShade} denture teeth` : ""}${gumShadeName ? ` with ${gumShadeName} gingiva` : ""}.`;
  }
  if (fixedNotes) note += ` Notes: ${fixedNotes}.`;

  return note || undefined as any;
}

function parseShadeDisplayName(raw: string): string {
  try { return JSON.parse(raw).name ?? raw; } catch { return raw; }
}

export function snapshotToProduct(snap: SlipProductSnapshot): SlipCreationProduct {
  const product = snap.productApiData;
  const isFixed = hasRetentionOptions(product);

  const stageName = snap.stageName ?? snap.fieldValues["stage"] ?? snap.fieldValues["fixed_stage"] ?? null;
  const stageObj = product?.stages?.find((s: any) => s.name === stageName);
  const stage_id = stageObj?.stage_id ?? 0;

  const impressions = Object.entries(snap.impressions)
    .filter(([, qty]) => qty > 0)
    .map(([code, qty]) => {
      const imp = product?.impressions?.find((i: any) => i.code === code);
      return { impression_id: imp?.impression_id ?? imp?.id ?? 0, quantity: qty };
    })
    .filter((i) => i.impression_id > 0);

  const snapArch = snap.type === "Upper" ? "maxillary" : "mandibular";
  const addonKey = `${snapArch}_${snap.repToothNumber}`;
  const addonItems = snap.selectedAddonsByTooth?.[addonKey] ?? [];
  const addons = addonItems
    .filter((a) => a.qty > 0)
    .map((a) => ({ addon_id: a.addon_id, quantity: a.qty }));

  if (isFixed) {
    const advance_fields: Array<{ teeth_number: number | null; advance_field_id: number; advance_field_value: string }> = [];
    const fixedShadeProductId = product?.id
      ? `fixed_p_${product.id}`
      : `fixed_${snap.repToothNumber}`;
    const shadeGuideFields = getShadeGuideAdvanceFields(product?.advance_fields);

    if (shadeGuideFields.length > 0) {
      for (const field of shadeGuideFields) {
        const fieldType = getShadeFieldType(field);
        const selectedShade = snap.selectedShades[
          buildShadeSelectionKey(fixedShadeProductId, snapArch as "maxillary" | "mandibular", fieldType, field.id)
        ];
        if (!selectedShade) continue;
        advance_fields.push({
          teeth_number: null,
          advance_field_id: field.id,
          advance_field_value: selectedShade,
        });
      }
    }

    const advanceFieldKeys: Array<[string, (n: string) => boolean, boolean]> = [
      ["fixed_characterization", (n) => n.includes("characterization"), false],
      ["fixed_contact_icons", (n) => n.includes("occlusal") || n.includes("pontic") || n.includes("embrasure"), false],
      ["fixed_margin", (n) => n.includes("margin"), false],
      ["fixed_metal", (n) => n.includes("metal"), false],
      ["fixed_proximal_contact", (n) => n.includes("proximal") && n.includes("contact"), false],
      ["fixed_notes", (n) => n.includes("note") || n.includes("additional"), false],
    ];

    for (const [key, matcher, isShadeJson] of advanceFieldKeys) {
      const raw = snap.fieldValues[key];
      if (!raw) continue;
      const advField = product?.advance_fields?.find((af: any) => {
        if (shadeGuideFields.length > 0 && af.field_type === "shade_guide") return false;
        return matcher((af.name ?? "").toLowerCase());
      });
      if (!advField) continue;
      const value = isShadeJson ? parseShadeDisplayName(raw) : raw;
      advance_fields.push({ teeth_number: null, advance_field_id: advField.id, advance_field_value: value });
    }

    const implantLibraryField = product?.advance_fields?.find(
      (af: any) => (af.field_type ?? "").toLowerCase() === "implant_library"
    );
    if (implantLibraryField && snap.implantDetailByTooth) {
      for (const [toothKey, implantDetail] of Object.entries(snap.implantDetailByTooth)) {
        if (!implantDetail || !(implantDetail.brand || implantDetail.platform || implantDetail.size)) {
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

    return {
      type: snap.type as "Upper" | "Lower",
      category_id: product?.subcategory?.category_id ?? 0,
      product_id: snap.productId,
      subcategory_id: product?.subcategory?.id ?? 0,
      ...(product?.is_single_stage !== "Yes" ? { stage_id } : {}),
      teeth_selection: (snap.checkedTeeth && snap.checkedTeeth.length > 0 ? snap.checkedTeeth : snap.teethNumbers).join(","),
      status: "In Progress",
      notes: buildProductNote(snap, product, stageName),
      ...(impressions.length > 0 ? { impressions } : {}),
      ...(addons.length > 0 ? { addons } : {}),
      ...(advance_fields.length > 0 ? { advance_fields } : {}),
      ...(snap.oppositeExtractions && snap.oppositeExtractions.length > 0
        ? { opposite_extractions: snap.oppositeExtractions }
        : {}),
      ...(snap.rush?.is_rush
        ? { rush: { is_rush: true, requested_rush_date: snap.rush.requested_rush_date ?? "" } }
        : {}),
    } as SlipCreationProduct;
  }

  const gradeRaw = snap.fieldValues["grade"] ?? "";
  let grade_id = 0;
  if (gradeRaw) {
    try { grade_id = JSON.parse(gradeRaw).grade_id ?? 0; }
    catch { grade_id = product?.grades?.find((g: any) => g.name === gradeRaw)?.grade_id ?? 0; }
  }

  const teethShadeRaw = snap.fieldValues["teeth_shade"] ?? "";
  let teeth_shade_id = 0;
  let teeth_shade_brand_id = 0;
  if (teethShadeRaw) {
    try {
      const parsed = JSON.parse(teethShadeRaw);
      teeth_shade_id = parsed.teeth_shade_id ?? 0;
      teeth_shade_brand_id = parsed.brand_id ?? 0;
    } catch {}
  }

  const gumShadeStr = snap.fieldValues["gum_shade"] ?? "";
  let gum_shade_id = 0;
  let gum_shade_brand_id = 0;
  if (gumShadeStr) {
    try {
      const parsed = JSON.parse(gumShadeStr);
      gum_shade_id = parsed.gum_shade_id ?? 0;
      gum_shade_brand_id = parsed.brand_id ?? 0;
    } catch {
      const matchedGumShade = product?.gum_shades?.find((s: any) => s.name === gumShadeStr);
      if (matchedGumShade) {
        gum_shade_id = matchedGumShade.gum_shade_id ?? matchedGumShade.id;
        gum_shade_brand_id = matchedGumShade.brand?.id ?? 0;
      }
    }
  }

  return {
    type: snap.type as "Upper" | "Lower",
    category_id: product?.subcategory?.category_id ?? 0,
    product_id: snap.productId,
    subcategory_id: product?.subcategory?.id ?? 0,
    ...(product?.is_single_stage !== "Yes" ? { stage_id } : {}),
    ...(grade_id ? { grade_id } : {}),
    teeth_selection: (snap.checkedTeeth && snap.checkedTeeth.length > 0 ? snap.checkedTeeth : snap.teethNumbers).join(","),
    ...(teeth_shade_id ? { teeth_shade_id, teeth_shade_brand_id } : {}),
    ...(gum_shade_id ? { gum_shade_id, gum_shade_brand_id } : {}),
    status: "In Progress",
    notes: buildProductNote(snap, product, stageName),
    ...(impressions.length > 0 ? { impressions } : {}),
    ...(addons.length > 0 ? { addons } : {}),
    ...(snap.oppositeExtractions && snap.oppositeExtractions.length > 0
      ? { opposite_extractions: snap.oppositeExtractions }
      : {}),
    ...(snap.rush?.is_rush
      ? { rush: { is_rush: true, requested_rush_date: snap.rush.requested_rush_date ?? "" } }
      : {}),
  } as SlipCreationProduct;
}

export function buildCaseSubmissionPayload({
  snapshots,
  role,
  customerId,
  completedLabId,
  completedDoctorId,
  patientName,
  gender,
  age,
}: BuildCaseSubmissionPayloadParams): SlipCreationPayload {
  const filteredSnapshots = snapshots.filter((s) => s.teethNumbers.length > 0 || s.productId > 0);
  const products = filteredSnapshots.map(snapshotToProduct);

  const labId = role === "lab_admin" ? customerId : completedLabId ?? 0;
  const officeId = role === "lab_admin" ? completedLabId ?? 0 : customerId;

  return {
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
          .map((product) => product.notes)
          .filter((note): note is string => Boolean(note))
          .map((note) => ({ note })),
      },
    ],
  };
}
