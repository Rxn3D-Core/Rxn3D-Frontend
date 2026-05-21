import type { Arch, ProductApiData } from "../types";
import {
  mirrorImpressionArch,
  type SlipImpressionSelections,
} from "./impressionStorage";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { FIXED_FIELD_STEPS, getRetentionFieldChain } from "../hooks/useToothFieldProgress";
import { resolveGroupStageToothNumber } from "./implantDetailHelpers";
import { buildFixedShadeProductId } from "./shadeGuideAdvanceFields";

export const FIXED_MIRROR_STEPS = new Set<string>(FIXED_FIELD_STEPS);

export function isFixedMirrorStep(step: string): boolean {
  return FIXED_MIRROR_STEPS.has(step);
}

/** Teeth on an arch that share the same product API id. */
export function findArchTeethForProductId(
  arch: Arch,
  productApiId: number,
  retentionTypes: Record<number, string[]>,
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null | undefined
): number[] {
  return Object.keys(retentionTypes)
    .map(Number)
    .filter((tn) => getToothProduct(arch, tn)?.id === productApiId)
    .sort((a, b) => a - b);
}

export function getOppositeArch(arch: Arch): Arch {
  return arch === "maxillary" ? "mandibular" : "maxillary";
}

export function resolveFixedGroupRepTooth(
  arch: Arch,
  toothNumbers: number[],
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null | undefined,
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean,
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string
): number | null {
  if (toothNumbers.length === 0) return null;
  const product = getToothProduct(arch, toothNumbers[0]);
  const fixedChain = getRetentionFieldChain(product?.advance_fields, product);
  return resolveGroupStageToothNumber(
    toothNumbers,
    arch,
    fixedChain,
    isFieldCompleted,
    getFieldValue
  );
}

export type FixedMirrorTarget = {
  targetArch: Arch;
  targetRepTooth: number;
  productApiId: number;
};

/** Resolve opposite-arch rep tooth when the same fixed product exists on both sides. */
export function resolveFixedMirrorTarget(
  sourceArch: Arch,
  sourceTooth: number,
  maxillaryRetentionTypes: Record<number, string[]>,
  mandibularRetentionTypes: Record<number, string[]>,
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null | undefined,
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean,
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string
): FixedMirrorTarget | null {
  const product = getToothProduct(sourceArch, sourceTooth);
  const productApiId = product?.id;
  if (productApiId == null) return null;

  const targetArch = getOppositeArch(sourceArch);
  const targetRetentionTypes =
    targetArch === "maxillary" ? maxillaryRetentionTypes : mandibularRetentionTypes;
  const targetTeeth = findArchTeethForProductId(
    targetArch,
    productApiId,
    targetRetentionTypes,
    getToothProduct
  );
  if (targetTeeth.length === 0) return null;

  const targetRepTooth = resolveFixedGroupRepTooth(
    targetArch,
    targetTeeth,
    getToothProduct,
    isFieldCompleted,
    getFieldValue
  );
  if (targetRepTooth == null) return null;

  return { targetArch, targetRepTooth, productApiId };
}

/** Copy selectedStages entry for fixed restoration across arches. */
export function mirrorFixedStageKey(
  sourceArch: Arch,
  sourceRepTooth: number,
  targetArch: Arch,
  targetRepTooth: number,
  selectedStages: Record<string, string>
): Record<string, string> | null {
  const sourceKey = `${sourceArch}_fixed_${sourceRepTooth}`;
  const targetKey = `${targetArch}_fixed_${targetRepTooth}`;
  const value = selectedStages[sourceKey];
  if (value == null || value === "") return null;
  if (selectedStages[targetKey]) return null;
  return { ...selectedStages, [targetKey]: value };
}

/** Copy arch-level impression list from one jaw to the other when target is empty. */
export function mirrorImpressionSelections(
  _impressionProductId: string,
  sourceArch: Arch,
  targetArch: Arch,
  selectedImpressions: SlipImpressionSelections
): SlipImpressionSelections | null {
  void _impressionProductId;
  return mirrorImpressionArch(selectedImpressions, sourceArch, targetArch);
}

/** Copy all shade keys for a fixed product from source arch to target arch. */
export function mirrorFixedShadeSelections(
  productApiId: number,
  sourceArch: Arch,
  targetArch: Arch,
  selectedShades: Record<string, string>
): Record<string, string> | null {
  const shadeId = buildFixedShadeProductId(productApiId);
  const sourcePrefix = `${shadeId}_${sourceArch}_`;
  let changed = false;
  const next = { ...selectedShades };
  for (const [key, shade] of Object.entries(selectedShades)) {
    if (!key.startsWith(sourcePrefix) || !shade) continue;
    const suffix = key.slice(sourcePrefix.length);
    const targetKey = `${shadeId}_${targetArch}_${suffix}`;
    if (!next[targetKey]) {
      next[targetKey] = shade;
      changed = true;
    }
  }
  return changed ? next : null;
}
