import type { ImplantDetailData } from "../components/ImplantDetailSection";
import type { Arch } from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import type { ImplantFieldKey, ImplantFieldSettings } from "@/lib/api/category-implant-settings";

/** Mirrors lib defaults so this helper stays testable without the API module graph. */
const DEFAULT_IMPLANT_FIELD_SETTINGS: ImplantFieldSettings = {
  implant_brand_system: "mandatory",
  implant_platform: "mandatory",
  implant_size: "hidden",
  implant_inclusion: "hidden",
  abutment: "mandatory",
  abutment_type: "hidden",
};

function isFieldVisible(
  settings: ImplantFieldSettings | undefined,
  key: ImplantFieldKey
): boolean {
  return (settings?.[key] ?? DEFAULT_IMPLANT_FIELD_SETTINGS[key]) !== "hidden";
}

/** Fixed steps after shades / implant detail — used to keep them visible when a new implant is added. */
export const POST_IMPLANT_FIXED_FIELD_STEPS = [
  "fixed_characterization",
  "fixed_contact_icons",
  "fixed_margin",
  "fixed_metal",
  "fixed_proximal_contact",
  "fixed_impression",
  "fixed_addons",
] as const;

/** Teeth in the group that use Implant retention, sorted ascending. */
export function getImplantTeethInGroup(
  toothNumbers: number[],
  retentionTypesMap: Record<number, string[]>
): number[] {
  return [...toothNumbers]
    .filter((n) => (retentionTypesMap[n] || []).includes("Implant"))
    .sort((a, b) => a - b);
}

export function isImplantDetailFilled(data: ImplantDetailData | undefined): boolean {
  if (!data) return false;
  if (data.labRecommendationRequested) {
    return true;
  }
  return !!(
    data.brand ||
    data.platform ||
    data.size ||
    data.abutmentType ||
    data.abutmentDetail ||
    data.implantId ||
    data.platformId ||
    data.sizeId ||
    data.abutmentId ||
    data.abutmentOptionId ||
    Object.values(data.dynamicFields ?? {}).some(Boolean)
  );
}

/** True when every visible implant field on the form has a value (or lab rec + photo). */
export function isImplantDetailFormComplete(
  data: ImplantDetailData | undefined,
  fieldSettings?: ImplantFieldSettings,
  hasAbutmentOptions = true,
  /** False when the selected abutment has no type/options for this category. */
  hasAbutmentTypeOptions = true
): boolean {
  if (!data) return false;
  if (data.labRecommendationRequested) {
    return !!(data.referencePhoto || data.referencePhotoUrl);
  }

  const show = (key: ImplantFieldKey) => isFieldVisible(fieldSettings, key);

  if (show("implant_brand_system")) {
    if (!(data.brand || data.implantId)) return false;
    // Match ImplantDetailSection: brand alone is incomplete until system/implant resolves.
    // Without this, Boxes can mark complete while Section still reports incomplete → #185 loop.
    if (!data.implantId && data.brand && !String(data.systemName ?? "").trim()) return false;
  }
  if (show("implant_platform") && !(data.platform || data.platformId)) return false;
  if (show("implant_size") && !(data.size || data.sizeId)) return false;
  if (show("implant_inclusion")) {
    const inclusion =
      data.inclusions?.trim() ||
      Object.values(data.dynamicFields ?? {}).find((value) => String(value ?? "").trim()) ||
      "";
    if (!String(inclusion).trim()) return false;
  }
  if (show("abutment") && hasAbutmentOptions && !(data.abutmentType || data.abutmentId)) {
    return false;
  }
  if (
    show("abutment_type") &&
    hasAbutmentOptions &&
    hasAbutmentTypeOptions &&
    !(data.abutmentDetail || data.abutmentOptionId)
  ) {
    return false;
  }
  return true;
}

export function isCompleteLabRecommendation(data: ImplantDetailData | undefined): boolean {
  return (
    !!data?.labRecommendationRequested &&
    !!(data.referencePhoto || data.referencePhotoUrl)
  );
}

/** Lab rec, complete flag, or a fully filled implant form unlocks impression / addons. */
export function isImplantDetailReadyForLaterFields(
  complete: boolean | undefined,
  data?: ImplantDetailData,
  fieldSettings?: ImplantFieldSettings,
  hasAbutmentOptions = true
): boolean {
  if (complete === true || !!data?.labRecommendationRequested) return true;
  // Fall back to form completeness even before settings finish loading so a
  // green implant box cannot strand the rest of the slip behind a stale flag.
  return isImplantDetailFormComplete(
    data,
    fieldSettings ?? DEFAULT_IMPLANT_FIELD_SETTINGS,
    hasAbutmentOptions
  );
}

export function cloneImplantDetailData(data: ImplantDetailData): ImplantDetailData {
  return {
    ...data,
    dynamicFields: { ...(data.dynamicFields ?? {}) },
  };
}

/** True when mirroring can skip — avoids recloning lab-rec photos every effect (React #185). */
export function isSameImplantDetailData(
  a: ImplantDetailData | undefined,
  b: ImplantDetailData | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.labRecommendationRequested === b.labRecommendationRequested &&
    a.referencePhoto === b.referencePhoto &&
    a.referencePhotoUrl === b.referencePhotoUrl &&
    a.brand === b.brand &&
    a.systemName === b.systemName &&
    a.platform === b.platform &&
    a.size === b.size &&
    a.inclusions === b.inclusions &&
    a.inclusionQty === b.inclusionQty &&
    a.abutmentType === b.abutmentType &&
    a.abutmentDetail === b.abutmentDetail &&
    a.implantId === b.implantId &&
    a.platformId === b.platformId &&
    a.sizeId === b.sizeId &&
    a.abutmentId === b.abutmentId &&
    a.abutmentOptionId === b.abutmentOptionId &&
    JSON.stringify(a.dynamicFields ?? {}) === JSON.stringify(b.dynamicFields ?? {})
  );
}

export function areAllImplantDetailsComplete(
  implantTeeth: number[],
  completeByTooth: Record<number, boolean>,
  detailByTooth?: Record<number, ImplantDetailData>,
  _fieldSettings?: ImplantFieldSettings,
  _hasAbutmentOptions = true
): boolean {
  if (implantTeeth.length === 0) return true;
  // Same unlock as before these category-settings changes:
  // complete flag OR any filled implant row (or lab recommendation).
  return implantTeeth.every(
    (tn) =>
      completeByTooth[tn] === true || isImplantDetailFilled(detailByTooth?.[tn])
  );
}

/** Completed implant boxes plus the next incomplete tooth (one active step at a time). */
export function getSequentialVisibleImplantTeeth(
  implantTeeth: number[],
  completeByTooth: Record<number, boolean>
): number[] {
  if (implantTeeth.length === 0) return [];
  const visible: number[] = [];
  for (const tn of implantTeeth) {
    visible.push(tn);
    if (completeByTooth[tn] !== true) break;
  }
  return visible;
}

/**
 * Tooth to copy implant details from: earliest completed, else earliest with data,
 * else first in the sorted group. Not always the lowest tooth number.
 */
export function getImplantMirrorSourceTooth(
  implantTeeth: number[],
  completeByTooth: Record<number, boolean>,
  detailByTooth: Record<number, ImplantDetailData>
): number | undefined {
  if (implantTeeth.length === 0) return undefined;
  const completed = implantTeeth.find((tn) => completeByTooth[tn] === true);
  if (completed != null) return completed;
  const filled = implantTeeth.find((tn) => isImplantDetailFilled(detailByTooth[tn]));
  if (filled != null) return filled;
  return implantTeeth[0];
}

/** True when impression, addons, or any post-implant advance field already has progress. */
export function hasPostImplantFixedFieldProgress(
  arch: Arch,
  toothNumber: number,
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean,
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string
): boolean {
  return POST_IMPLANT_FIXED_FIELD_STEPS.some((step) => {
    const fieldStep = step as FieldStep;
    return (
      isFieldCompleted(arch, toothNumber, fieldStep) ||
      !!getFieldValue(arch, toothNumber, fieldStep)?.trim()
    );
  });
}

/**
 * Stable tooth key for grouped fixed-restoration field progress.
 * Keeps the tooth that already has progress when a lower-numbered tooth joins the group.
 */
export function resolveGroupStageToothNumber(
  toothNumbers: number[],
  arch: Arch,
  fixedChain: readonly string[],
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean,
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string
): number {
  const sorted = [...toothNumbers].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const withProgress = sorted.find((tn) =>
    fixedChain.some((step) => {
      const fieldStep = step as FieldStep;
      return (
        isFieldCompleted(arch, tn, fieldStep) ||
        !!getFieldValue(arch, tn, fieldStep)?.trim()
      );
    })
  );
  return withProgress ?? sorted[0];
}
