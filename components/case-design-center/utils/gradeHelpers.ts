import type { Arch, ProductApiData, ProductGrade, ProductGumShade } from "../types";

export function getActiveGrades(grades?: ProductGrade[]): ProductGrade[] {
  if (!grades || grades.length === 0) return [];
  return grades
    .filter((g) => g.status === "Active")
    .sort((a, b) => a.sequence - b.sequence);
}

/** True when the product supports grade selection (flags or grade list). */
export function productHasGrades(product?: ProductApiData | null): boolean {
  if (!product) return false;
  if (getActiveGrades(product.grades).length > 0) return true;
  if (product.has_grade === "Yes") return true;
  if (product.has_multiple_grades === "Yes") return true;
  return false;
}

/** Grades for UI: use product list, then optional donor (e.g. opposite arch). */
export function resolveProductGradesForDisplay(
  product?: ProductApiData | null,
  donor?: ProductApiData | null
): ProductGrade[] {
  const active = getActiveGrades(product?.grades);
  if (active.length > 0) return active;
  return getActiveGrades(donor?.grades);
}

/** First same-arch tooth product with the same API id (for gum/grade lists). */
export function findArchProductDonor(
  arch: Arch,
  productApiId: number | undefined,
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null | undefined,
  archTeeth: number[]
): ProductApiData | null {
  if (productApiId == null) return null;
  for (const tn of archTeeth) {
    const p = getToothProduct(arch, tn);
    if (p?.id === productApiId) return p;
  }
  return null;
}

/** First opposite-arch tooth product with the same API id (any enriched fields). */
export function findOppositeArchProductDonor(
  arch: Arch,
  productApiId: number | undefined,
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null | undefined,
  oppositeArchTeeth: number[]
): ProductApiData | null {
  if (productApiId == null) return null;
  const oppositeArch: Arch = arch === "maxillary" ? "mandibular" : "maxillary";
  for (const tn of oppositeArchTeeth) {
    const p = getToothProduct(oppositeArch, tn);
    if (p?.id === productApiId) return p;
  }
  return null;
}

/** First opposite-arch tooth product with the same API id and a non-empty grade list. */
export function findOppositeArchGradesDonor(
  arch: Arch,
  productApiId: number | undefined,
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null | undefined,
  oppositeArchTeeth: number[]
): ProductApiData | null {
  if (productApiId == null) return null;
  const oppositeArch: Arch = arch === "maxillary" ? "mandibular" : "maxillary";
  for (const tn of oppositeArchTeeth) {
    const p = getToothProduct(oppositeArch, tn);
    if (p?.id === productApiId && getActiveGrades(p.grades).length > 0) {
      return p;
    }
  }
  return null;
}

/** Stored value marks grade as intentionally skipped (no grades on product). */
export function isGradeFieldValueSkipped(gradeRaw: string): boolean {
  if (!gradeRaw?.trim()) return false;
  try {
    const p = JSON.parse(gradeRaw) as { skipped?: boolean };
    return p?.skipped === true;
  } catch {
    return false;
  }
}

/** Human-readable grade label; never returns raw JSON. */
export function parseGradeDisplayName(gradeRaw: string): string {
  if (!gradeRaw?.trim()) return "";
  try {
    const p = JSON.parse(gradeRaw) as { skipped?: boolean; name?: string };
    if (p?.skipped === true) return "";
    if (typeof p?.name === "string" && p.name.trim()) return p.name;
  } catch {
    /* plain string grade name */
  }
  return gradeRaw;
}

/**
 * Whether the grade field should show as filled (green).
 * Skipped values do not count as complete when the product supports grades.
 */
export function isGradeStepCompleteForDisplay(
  gradeRaw: string,
  isFieldCompleted: boolean,
  product?: ProductApiData | null
): boolean {
  if (isGradeFieldValueSkipped(gradeRaw)) {
    return isFieldCompleted && !productHasGrades(product);
  }
  const name = parseGradeDisplayName(gradeRaw);
  return isFieldCompleted && !!name.trim();
}

/** Fill missing grades / flags from a donor product (same API id). */
export function mergeProductGradesFromDonor(
  product: ProductApiData,
  donor?: ProductApiData | null
): ProductApiData {
  if (!donor || getActiveGrades(product.grades).length > 0) {
    return product;
  }
  const donorGrades = donor.grades;
  if (!donorGrades?.length) return product;
  return {
    ...product,
    grades: donorGrades,
    has_grade: product.has_grade ?? donor.has_grade,
    has_multiple_grades: product.has_multiple_grades ?? donor.has_multiple_grades,
  };
}

/** Gum shade list for UI — use product data, then optional donor (e.g. opposite arch). */
export function resolveGumShadesForDisplay(
  product?: ProductApiData | null,
  donor?: ProductApiData | null
): ProductGumShade[] {
  if (product?.gum_shades && product.gum_shades.length > 0) {
    return product.gum_shades;
  }
  return donor?.gum_shades ?? [];
}

/** Merge missing stages / stage flags from a donor product (same API id). */
export function mergeProductStagesFromDonor(
  product: ProductApiData,
  donor?: ProductApiData | null
): ProductApiData {
  if (!donor) return product;
  const hasStages = Array.isArray(product.stages) && product.stages.length > 0;
  const donorStages = donor.stages;
  if (hasStages || !Array.isArray(donorStages) || donorStages.length === 0) {
    return product;
  }
  return {
    ...product,
    stages: donorStages,
    has_stage: product.has_stage ?? donor.has_stage,
    is_single_stage: product.is_single_stage ?? donor.is_single_stage,
  };
}

/** Merge missing grades, stages, and gum_shades from a donor product (same API id). */
export function mergeEnrichedProductFromDonor(
  product: ProductApiData,
  donor?: ProductApiData | null
): ProductApiData {
  let next = mergeProductGradesFromDonor(product, donor);
  if (!donor) return next;
  next = mergeProductStagesFromDonor(next, donor);
  if ((next.gum_shades?.length ?? 0) === 0 && (donor.gum_shades?.length ?? 0) > 0) {
    next = { ...next, gum_shades: donor.gum_shades };
  }
  if (
    (!next.advance_fields || next.advance_fields.length === 0) &&
    (donor.advance_fields?.length ?? 0) > 0
  ) {
    next = { ...next, advance_fields: donor.advance_fields };
  }
  if (
    (!next.teeth_shades || next.teeth_shades.length === 0) &&
    (donor.teeth_shades?.length ?? 0) > 0
  ) {
    next = { ...next, teeth_shades: donor.teeth_shades };
  }
  if (next.has_teeth_shade == null && donor.has_teeth_shade != null) {
    next = { ...next, has_teeth_shade: donor.has_teeth_shade };
  }
  if (next.has_gum_shade == null && donor.has_gum_shade != null) {
    next = { ...next, has_gum_shade: donor.has_gum_shade };
  }
  return next;
}

const MAXILLARY_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const MANDIBULAR_TEETH = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

/**
 * Product snapshot for stage visibility — fills stages[] from opposite/same arch when
 * the local fetch omitted them (common when adding the same product on the second arch).
 */
export function resolveProductForStageField(
  product: ProductApiData | null | undefined,
  arch: Arch,
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null | undefined
): ProductApiData | null | undefined {
  if (!product) return product;
  const oppositeTeeth = arch === "maxillary" ? MANDIBULAR_TEETH : MAXILLARY_TEETH;
  const archTeeth = arch === "maxillary" ? MAXILLARY_TEETH : MANDIBULAR_TEETH;
  const donor =
    findOppositeArchProductDonor(arch, product.id, getToothProduct, oppositeTeeth) ??
    findArchProductDonor(arch, product.id, getToothProduct, archTeeth);
  if (!donor) return product;
  const stages = resolveProductStagesForDisplay(product, donor);
  const needsMerge =
    stages !== product.stages ||
    (product.has_stage == null && donor.has_stage != null) ||
    (product.is_single_stage == null && donor.is_single_stage != null);
  if (!needsMerge) return product;
  return {
    ...product,
    stages,
    has_stage: product.has_stage ?? donor.has_stage,
    is_single_stage: product.is_single_stage ?? donor.is_single_stage,
  };
}

/** Stage list for picker — product first, then opposite-arch donor (same API id). */
export function resolveProductStagesForDisplay(
  product?: ProductApiData | null,
  donor?: ProductApiData | null
): NonNullable<ProductApiData["stages"]> {
  if (product?.stages && product.stages.length > 0) return product.stages;
  return donor?.stages ?? [];
}
