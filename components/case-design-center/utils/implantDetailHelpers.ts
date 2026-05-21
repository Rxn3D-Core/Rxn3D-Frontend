import type { ImplantDetailData } from "../components/ImplantDetailSection";
import type { Arch } from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";

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
  return !!(
    data.brand ||
    data.platform ||
    data.size ||
    data.abutmentType ||
    data.abutmentDetail ||
    Object.values(data.dynamicFields ?? {}).some(Boolean)
  );
}

export function cloneImplantDetailData(data: ImplantDetailData): ImplantDetailData {
  return {
    ...data,
    dynamicFields: { ...(data.dynamicFields ?? {}) },
  };
}

export function areAllImplantDetailsComplete(
  implantTeeth: number[],
  completeByTooth: Record<number, boolean>
): boolean {
  if (implantTeeth.length === 0) return true;
  return implantTeeth.every((tn) => completeByTooth[tn] === true);
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
