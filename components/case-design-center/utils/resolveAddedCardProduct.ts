import type { Arch, ProductApiData } from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";

type GetToothProduct = (arch: Arch, toothNumber: number) => ProductApiData | null | undefined;
type GetFieldValue = (arch: Arch, toothNumber: number, step: FieldStep) => string;

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

/** Removable steps whose progress should keep the field tooth stable when the chart changes. */
const REMOVABLE_PROGRESS_STEPS: FieldStep[] = [
  "stage",
  "grade",
  "impression",
  "teeth_shade",
  "gum_shade",
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
  const withProgress = sorted.find((tn) => {
    if (selectedStages?.[`${arch}_prep_${tn}`]?.trim()) return true;
    return REMOVABLE_PROGRESS_STEPS.some((step) => {
      return (
        isFieldCompleted(arch, tn, step) || !!getFieldValue(arch, tn, step)?.trim()
      );
    });
  });
  return withProgress ?? sorted[0];
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
