import type { Arch, ProductAdvanceField, ProductApiData, ShadeFieldType } from "../types";
import {
  CLASSICAL_FALLBACK_SHADES,
  type ShadeGuideDisplayShade,
} from "@/components/tooth-shade-guide-layout";

/** Stable shade storage key per product (not per tooth). */
export function buildFixedShadeProductId(productApiId: number | string): string {
  return `fixed_p_${productApiId}`;
}

export function isFixedProductShadeStorageId(productId: string): boolean {
  return productId.startsWith("fixed_p_") || /^fixed_\d+$/.test(productId);
}

/** Stable per-product shade id; falls back to legacy per-tooth id when product id is unknown. */
export function resolveFixedShadeProductId(
  productApiId: number | string | undefined | null,
  fallbackToothNumber: number
): string {
  if (productApiId != null && productApiId !== "") {
    return buildFixedShadeProductId(productApiId);
  }
  return `fixed_${fallbackToothNumber}`;
}

export function buildShadeSummaryLine(
  advanceFields: ProductAdvanceField[] | undefined,
  productShadeId: string,
  arch: Arch,
  getSelectedShade: (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => string
): string {
  const named = getShadeGuideAdvanceFields(advanceFields);
  const parts: string[] = [];
  if (named.length > 0) {
    for (const field of named) {
      const fieldType = getShadeFieldType(field);
      const value = getSelectedShade(productShadeId, arch, fieldType, field.id);
      if (value) parts.push(value);
    }
  } else {
    const stump = getSelectedShade(productShadeId, arch, "stump_shade");
    const tooth = getSelectedShade(productShadeId, arch, "tooth_shade");
    if (stump) parts.push(stump);
    if (tooth) parts.push(tooth);
  }
  return parts.join(" · ");
}

export function areFixedProductShadesComplete(
  advanceFields: ProductAdvanceField[] | undefined,
  productShadeId: string,
  arch: Arch,
  getSelectedShade: (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => string,
  options: { needsStumpShade: boolean; needsToothShade: boolean }
): boolean {
  const named = getShadeGuideAdvanceFields(advanceFields);
  if (named.length > 0) {
    return getFirstMissingShadeGuideField(advanceFields, productShadeId, arch, getSelectedShade) == null;
  }
  if (options.needsStumpShade && !getSelectedShade(productShadeId, arch, "stump_shade")) {
    return false;
  }
  if (options.needsToothShade && !getSelectedShade(productShadeId, arch, "tooth_shade")) {
    return false;
  }
  return true;
}

export function getShadeGuideAdvanceFields(
  advanceFields?: ProductAdvanceField[]
): ProductAdvanceField[] {
  if (!advanceFields || advanceFields.length === 0) return [];

  return advanceFields
    .filter(
      (field) =>
        field.field_type === "shade_guide" &&
        (!field.status || field.status === "Active") &&
        (!field.link_status || field.link_status === "Active")
    )
    .sort(
      (a, b) =>
        (a.link_sequence ?? a.sequence ?? 0) - (b.link_sequence ?? b.sequence ?? 0)
    );
}

export function isStumpLikeShadeField(field: Pick<ProductAdvanceField, "name">): boolean {
  const name = (field.name || "").toLowerCase();
  return name.includes("stump") || name.includes("gum");
}

export function getShadeFieldType(field: Pick<ProductAdvanceField, "name">): ShadeFieldType {
  return isStumpLikeShadeField(field) ? "stump_shade" : "tooth_shade";
}

export function buildShadeSelectionKey(
  productId: string,
  arch: Arch,
  fieldType: ShadeFieldType,
  advanceFieldId?: number | null
): string {
  return advanceFieldId != null
    ? `${productId}_${arch}_${fieldType}_${advanceFieldId}`
    : `${productId}_${arch}_${fieldType}`;
}

/** First-time flow: filled shades + the next empty field only. When all filled, returns every field. */
export function getSequentialVisibleShadeFields(
  fields: ProductAdvanceField[],
  productId: string,
  arch: Arch,
  getSelectedShade: (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => string
): ProductAdvanceField[] {
  if (fields.length === 0) return [];

  const allComplete = fields.every((field) => {
    const fieldType = getShadeFieldType(field);
    return !!getSelectedShade(productId, arch, fieldType, field.id);
  });
  if (allComplete) return fields;

  const visible: ProductAdvanceField[] = [];
  for (const field of fields) {
    const fieldType = getShadeFieldType(field);
    if (getSelectedShade(productId, arch, fieldType, field.id)) {
      visible.push(field);
    } else {
      visible.push(field);
      break;
    }
  }
  return visible;
}

export function shouldUseAccordionOnlyFixedShades(
  advanceFields?: ProductAdvanceField[]
): boolean {
  return getShadeGuideAdvanceFields(advanceFields).length > 0;
}

/** Sequence: filled + next empty; edit: only the field being changed; otherwise all fields. */
export function getDisplayedShadeGuideFields(
  fields: ProductAdvanceField[],
  productId: string,
  arch: Arch,
  getSelectedShade: (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => string,
  options?: { editActiveFieldId?: number | null }
): ProductAdvanceField[] {
  if (fields.length === 0) return [];
  if (options?.editActiveFieldId != null) {
    const active = fields.find((field) => field.id === options.editActiveFieldId);
    return active ? [active] : [];
  }
  return getSequentialVisibleShadeFields(fields, productId, arch, getSelectedShade);
}

export function getFirstMissingShadeGuideField(
  advanceFields: ProductAdvanceField[] | undefined,
  productId: string,
  arch: Arch,
  getSelectedShade: (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType,
    advanceFieldId?: number | null
  ) => string
): { id: number; name: string; fieldType: ShadeFieldType } | null {
  const fields = getShadeGuideAdvanceFields(advanceFields);
  for (const field of fields) {
    const fieldType = getShadeFieldType(field);
    if (!getSelectedShade(productId, arch, fieldType, field.id)) {
      return { id: field.id, name: field.name, fieldType };
    }
  }
  return null;
}

export function getShadeGuideOptionsFromProduct(
  product: ProductApiData | null | undefined
): string[] {
  const teethShades = product?.teeth_shades;
  if (!teethShades?.length) return [];

  const systemNames: string[] = [];
  const seen = new Set<string>();
  for (const shade of teethShades) {
    const systemName = shade.brand?.system_name;
    if (systemName && !seen.has(systemName)) {
      seen.add(systemName);
      systemNames.push(systemName);
    }
  }
  return systemNames;
}

function normalizeGuideName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function mapRawShadeEntry(entry: Record<string, unknown>): ShadeGuideDisplayShade | null {
  const name = String(entry.name ?? entry.shade_name ?? "").trim();
  if (!name) return null;

  return {
    name,
    color_code_incisal: (entry.color_code_incisal ?? entry.color_code_top) as string | undefined,
    color_code_body: (entry.color_code_body ?? entry.color_code_middle) as string | undefined,
    color_code_cervical: (entry.color_code_cervical ?? entry.color_code_bottom) as string | undefined,
  };
}

/** Shades for the SVG picker: filtered by selected guide system_name, sorted by sequence. */
export function getTeethShadesForSelectedGuide(
  product: ProductApiData | null | undefined,
  selectedGuideSystemName: string
): ShadeGuideDisplayShade[] {
  const teethShades = product?.teeth_shades;
  if (!teethShades?.length || !selectedGuideSystemName) {
    return CLASSICAL_FALLBACK_SHADES;
  }

  const targetGuide = normalizeGuideName(selectedGuideSystemName);
  const collected: Array<ShadeGuideDisplayShade & { sequence: number }> = [];

  for (const raw of teethShades as Array<Record<string, unknown>>) {
    const nestedShades = raw.shades as Array<Record<string, unknown>> | undefined;
    const brandSystemName =
      (raw.brand as { system_name?: string } | undefined)?.system_name ??
      (raw.system_name as string | undefined);

    if (Array.isArray(nestedShades) && nestedShades.length > 0) {
      if (normalizeGuideName(brandSystemName) !== targetGuide) continue;
      for (const nested of nestedShades) {
        const mapped = mapRawShadeEntry(nested);
        if (mapped) {
          collected.push({
            ...mapped,
            sequence: Number(nested.sequence ?? nestedShadeSequence(nested) ?? 0),
          });
        }
      }
      continue;
    }

    if (normalizeGuideName(brandSystemName) !== targetGuide) continue;
    const mapped = mapRawShadeEntry(raw);
    if (mapped) {
      collected.push({
        ...mapped,
        sequence: Number(raw.sequence ?? 0),
      });
    }
  }

  if (collected.length === 0) {
    return CLASSICAL_FALLBACK_SHADES;
  }

  return collected
    .sort((a, b) => a.sequence - b.sequence || a.name.localeCompare(b.name))
    .map(({ sequence: _sequence, ...shade }) => shade);
}

function nestedShadeSequence(entry: Record<string, unknown>): number | undefined {
  const value = entry.sequence;
  return typeof value === "number" ? value : undefined;
}

export function getDefaultShadeGuideFromProduct(
  product: ProductApiData | null | undefined
): string | null {
  const teethShades = product?.teeth_shades;
  if (!teethShades?.length) return null;
  const defaultShade = teethShades.find(
    (s) => String(s.brand?.default ?? "").trim().toLowerCase() === "yes"
  );
  return defaultShade?.brand?.system_name ?? null;
}

/** Resolve product API data for fixed_p_{id}, fixed_{tooth}, or prep_{tooth} shade storage ids. */
export function resolveProductForShadeStorageId(
  productId: string,
  arch: Arch,
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null,
  options?: {
    storageToothNumber?: number | null;
    archToothNumbers?: number[];
  }
): ProductApiData | null {
  if (!productId) return null;

  const fixedProductMatch = productId.match(/^fixed_p_(\d+)$/);
  if (fixedProductMatch) {
    const apiId = Number(fixedProductMatch[1]);
    const storageTooth = options?.storageToothNumber;
    if (storageTooth != null) {
      const fromStorage = getToothProduct(arch, storageTooth);
      if (fromStorage?.id === apiId) return fromStorage;
    }
    for (const toothNumber of options?.archToothNumbers ?? []) {
      const candidate = getToothProduct(arch, toothNumber);
      if (candidate?.id === apiId) return candidate;
    }
    return null;
  }

  const fixedLegacyMatch = productId.match(/^fixed_(\d+)$/);
  if (fixedLegacyMatch) {
    return getToothProduct(arch, parseInt(fixedLegacyMatch[1], 10));
  }

  const prepMatch = productId.match(/^prep_(-?\d+)$/);
  if (prepMatch) {
    return getToothProduct(arch, parseInt(prepMatch[1], 10));
  }

  return null;
}
