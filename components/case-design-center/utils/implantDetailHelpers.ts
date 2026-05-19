import type { ImplantDetailData } from "../components/ImplantDetailSection";

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
