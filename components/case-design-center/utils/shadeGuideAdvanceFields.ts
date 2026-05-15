import type { Arch, ProductAdvanceField, ShadeFieldType } from "../types";

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
