import type { Arch, ProductAdvanceField, ShadeFieldType } from "../types";

type ShadeGetter = (
  productId: string,
  arch: Arch,
  fieldType: ShadeFieldType,
  advanceFieldId?: number | null
) => string;

type ShadeProductFlags = {
  has_teeth_shade?: string | null;
  has_gum_shade?: string | null;
  has_advance_field?: string | boolean | null;
  advance_fields?: ProductAdvanceField[];
};

function isStumpLikeShadeField(field: Pick<ProductAdvanceField, "name">): boolean {
  const name = (field.name || "").toLowerCase();
  return name.includes("stump") || name.includes("gum");
}

function getShadeFieldType(field: Pick<ProductAdvanceField, "name">): ShadeFieldType {
  return isStumpLikeShadeField(field) ? "stump_shade" : "tooth_shade";
}

function getShadeGuideAdvanceFields(
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

function getFirstMissingShadeGuideField(
  advanceFields: ProductAdvanceField[] | undefined,
  productId: string,
  arch: Arch,
  getSelectedShade: ShadeGetter
): { id: number; name: string; fieldType: ShadeFieldType } | null {
  for (const field of getShadeGuideAdvanceFields(advanceFields)) {
    const fieldType = getShadeFieldType(field);
    if (!getSelectedShade(productId, arch, fieldType, field.id)) {
      return { id: field.id, name: field.name, fieldType };
    }
  }
  return null;
}

/** True when a stored shade field value is a real selection (not empty / sync placeholder). */
export function isStoredShadeValuePresent(raw: string | undefined | null): boolean {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return false;
  if (
    trimmed === "shade-sync" ||
    trimmed === "shade-sync-skip-stump" ||
    trimmed === "selected"
  ) {
    return false;
  }
  try {
    if (trimmed.startsWith("{")) {
      const parsed = JSON.parse(trimmed) as { name?: unknown };
      if (typeof parsed?.name === "string" && parsed.name.trim()) {
        const name = parsed.name.trim().toLowerCase();
        return (
          name !== "shade-sync" &&
          name !== "shade-sync-skip-stump" &&
          name !== "selected"
        );
      }
      return false;
    }
  } catch {
    /* plain string */
  }
  return true;
}

/**
 * Footer / readiness label for the first missing fixed shade.
 * Aligns with fixedCardGating: when has_teeth_shade / has_gum_shade are set,
 * classic Teeth/Gum completeness is enough — empty named shade_guide AFs must
 * not re-prompt on edit-slip after a classic shade was already saved.
 */
export function getMissingFixedShadeFieldLabel(
  product: ShadeProductFlags | null | undefined,
  shadeProductId: string,
  arch: Arch,
  getSelectedShade: ShadeGetter,
  options?: {
    toothShadeFieldDone?: boolean;
    stumpShadeFieldDone?: boolean;
  }
): string | null {
  const needsClassicToothShade = product?.has_teeth_shade === "Yes";
  const needsClassicGumShade = product?.has_gum_shade === "Yes";
  const hasClassicShadeFlags = needsClassicToothShade || needsClassicGumShade;

  const toothDone =
    !!getSelectedShade(shadeProductId, arch, "tooth_shade") ||
    !!options?.toothShadeFieldDone;
  const stumpDone =
    !!getSelectedShade(shadeProductId, arch, "stump_shade") ||
    !!options?.stumpShadeFieldDone;

  if (hasClassicShadeFlags) {
    if (needsClassicGumShade && !stumpDone) return "Stump Shade";
    if (needsClassicToothShade && !toothDone) return "Tooth Shade";
    return null;
  }

  const advanceFields =
    product?.has_advance_field === "No" ||
    product?.has_advance_field === false ||
    product?.has_advance_field === "no"
      ? []
      : product?.advance_fields;

  const missingNamedField = getFirstMissingShadeGuideField(
    advanceFields,
    shadeProductId,
    arch,
    getSelectedShade
  );
  if (missingNamedField) return missingNamedField.name;

  if (getShadeGuideAdvanceFields(advanceFields).length > 0) return null;

  const names = (advanceFields ?? []).map((f) => (f.name || "").toLowerCase());
  const hasLegacyStump = names.some(
    (n) => (n.includes("stump") || n.includes("gum")) && n.includes("shade")
  );
  const hasLegacyTooth = names.some(
    (n) =>
      (n.includes("teeth") ||
        (n.includes("tooth") && !n.includes("stump") && !n.includes("gum")) ||
        n.includes("cervical") ||
        n.includes("incisal") ||
        n.includes("body") ||
        n.includes("crown")) &&
      n.includes("shade")
  );

  if (hasLegacyStump && !stumpDone) return "Stump Shade";
  if (hasLegacyTooth && !toothDone) return "Tooth Shade";
  return null;
}
