import type { Arch, ProductApiData } from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import {
  archHasImpressionSelections,
  type SlipImpressionSelections,
} from "./impressionStorage.ts";

type GetToothProduct = (arch: Arch, toothNumber: number) => ProductApiData | null | undefined;
type GetFieldValue = (arch: Arch, toothNumber: number, step: FieldStep) => string;
type IsFieldCompleted = (arch: Arch, toothNumber: number, step: FieldStep) => boolean;

/** Wizard stub has extractions/retention_options; full library GET adds shades + advance_fields. */
export function isHydratedProductApiData(
  product: ProductApiData | null | undefined
): boolean {
  if (!product?.id) return false;
  if (Array.isArray(product.advance_fields) && product.advance_fields.length > 0) {
    return true;
  }
  if (Array.isArray(product.teeth_shades) && product.teeth_shades.length > 0) {
    return true;
  }
  return false;
}

/**
 * Removable steps whose progress should keep the field tooth stable when the chart changes.
 * Ordered like the progressive field chain (grade → stage → shades → impression → add-ons) —
 * earlier steps weigh more when ranking teeth in {@link resolveRemovableProgressTooth}.
 */
const REMOVABLE_PROGRESS_STEPS: FieldStep[] = [
  "grade",
  "stage",
  "teeth_shade",
  "gum_shade",
  "impression",
  "addons",
];

/** Tooth number used for field progress / shade keys on an added-product card. */
export function resolveAddedCardRepTooth(
  cardTeeth: readonly number[],
  cardId: number,
  getToothProduct: GetToothProduct,
  arch: Arch
): number {
  if (cardTeeth.length > 0) {
    const withProduct = cardTeeth.find((tn) => getToothProduct(arch, tn));
    return withProduct ?? Math.min(...cardTeeth);
  }
  return -cardId;
}

/**
 * Stable tooth for removable stage/grade/impression fields.
 * Keeps the tooth that already has progress when a lower-numbered tooth joins the card
 * (add-new-stage / edit-slip tooth-chart edits must not orphan saved stage).
 *
 * Teeth are ranked by how far along the field chain they are (earlier steps weigh more),
 * lowest tooth number on ties. A full-denture card binds the whole arch while the slip only
 * preloads grade/stage/shade on its own teeth; the impression then lands on the lowest bound
 * tooth. That tooth must not win just because it sorts first — the chain is evaluated on the
 * returned tooth, so picking it would hide every field after Grade.
 */
export function resolveRemovableProgressTooth(
  cardTeeth: readonly number[],
  arch: Arch,
  cardId: number,
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean,
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string,
  selectedStages?: Record<string, string>
): number {
  const sorted = [...cardTeeth].sort((a, b) => a - b);
  if (sorted.length === 0) return -cardId;
  const lastIndex = REMOVABLE_PROGRESS_STEPS.length - 1;
  const progressScore = (tn: number): number =>
    REMOVABLE_PROGRESS_STEPS.reduce((score, step, i) => {
      const hasProgress =
        isFieldCompleted(arch, tn, step) ||
        !!getFieldValue(arch, tn, step)?.trim() ||
        (step === "stage" && !!selectedStages?.[`${arch}_prep_${tn}`]?.trim());
      return hasProgress ? score + 2 ** (lastIndex - i) : score;
    }, 0);

  let best = sorted[0];
  let bestScore = 0;
  for (const tn of sorted) {
    const score = progressScore(tn);
    if (score > bestScore) {
      best = tn;
      bestScore = score;
    }
  }
  return best;
}

/** First loaded product on any tooth in the card, else virtual slot (-cardId), else stub. */
export function resolveAddedCardProductData(
  arch: Arch,
  cardId: number,
  cardTeeth: readonly number[],
  getToothProduct: GetToothProduct,
  stubProduct: ProductApiData | null | undefined
): ProductApiData | null {
  for (const tn of cardTeeth) {
    const p = getToothProduct(arch, tn);
    if (p) return p;
  }
  return getToothProduct(arch, -cardId) ?? stubProduct ?? null;
}

/**
 * Read a field value from the card's representative tooth, virtual slot (-cardId),
 * or any tooth on the card — stage/grade may be stored on a different tooth than repTooth.
 */
export function resolveCardFieldValue(
  arch: Arch,
  cardId: number,
  cardTeeth: readonly number[],
  repTooth: number,
  step: FieldStep,
  getFieldValue: GetFieldValue
): string {
  const virtualTooth = cardId === 0 ? -0 : -cardId;
  const ordered: number[] = [repTooth, virtualTooth, ...cardTeeth];
  const seen = new Set<string>();
  for (const tn of ordered) {
    const sig = Object.is(tn, -0) ? "-0" : String(tn);
    if (seen.has(sig)) continue;
    seen.add(sig);
    const val = getFieldValue(arch, tn, step)?.trim();
    if (val) return val;
  }
  return "";
}

/**
 * Impression text ("No Impression" / "1x PVS, …") for a removable card.
 * The impression is saved on one tooth of the card, which is not always the field tooth
 * (full dentures bind the whole arch). Only teeth whose impression step is completed count —
 * un-completing a tooth keeps its old text, which must not resurface.
 */
export function resolveCardImpressionText(
  arch: Arch,
  cardId: number,
  cardTeeth: readonly number[],
  repTooth: number,
  isFieldCompleted: IsFieldCompleted,
  getFieldValue: GetFieldValue
): string {
  const virtualTooth = cardId === 0 ? -0 : -cardId;
  for (const tn of [repTooth, virtualTooth, ...cardTeeth]) {
    if (!isFieldCompleted(arch, tn, "impression")) continue;
    const val = getFieldValue(arch, tn, "impression")?.trim();
    if (val) return val;
  }
  return "";
}

/**
 * Whether a removable card step is done — checks rep tooth, virtual slot, any card tooth,
 * selectedStages, and arch impression selections. Add-new-stage writes stage/impression
 * onto one tooth while the chart rep tooth can differ after Done.
 */
export function isRemovableCardStepComplete(params: {
  arch: Arch;
  cardId: number;
  cardTeeth: readonly number[];
  repTooth: number;
  step: FieldStep;
  isFieldCompleted: IsFieldCompleted;
  getFieldValue: GetFieldValue;
  selectedStages?: Record<string, string>;
  selectedImpressions?: SlipImpressionSelections;
}): boolean {
  const {
    arch,
    cardId,
    cardTeeth,
    repTooth,
    step,
    isFieldCompleted,
    getFieldValue,
    selectedStages,
    selectedImpressions,
  } = params;

  const virtualTooth = cardId === 0 ? -0 : -cardId;
  if (isFieldCompleted(arch, repTooth, step)) return true;
  if (isFieldCompleted(arch, virtualTooth, step)) return true;
  if (cardTeeth.some((tn) => isFieldCompleted(arch, tn, step))) return true;

  if (step === "stage" && selectedStages) {
    if (selectedStages[`${arch}_prep_${repTooth}`]?.trim()) return true;
    if (selectedStages[`${arch}_prep_${virtualTooth}`]?.trim()) return true;
    if (cardTeeth.some((tn) => selectedStages[`${arch}_prep_${tn}`]?.trim())) return true;
  }

  if (step === "impression" && selectedImpressions && archHasImpressionSelections(selectedImpressions, arch)) {
    return true;
  }

  const raw = resolveCardFieldValue(arch, cardId, cardTeeth, repTooth, step, getFieldValue);
  return !!raw.trim();
}

/**
 * Progressive visibility for a removable card chain. Steps that already have a value
 * stay visible even when an earlier empty step would otherwise hide them.
 */
export function isRemovableCardFieldVisible(params: {
  step: string;
  chain: readonly string[];
  isStepComplete: (step: FieldStep) => boolean;
  stepHasValue?: boolean;
}): boolean {
  const { step, chain, isStepComplete, stepHasValue } = params;
  const stepIndex = chain.indexOf(step);
  if (stepIndex === -1) return false;
  if (stepHasValue) return true;

  let count = 0;
  for (const s of chain) {
    if (isStepComplete(s as FieldStep)) count++;
    else break;
  }
  return stepIndex < Math.min(count + 1, chain.length);
}
