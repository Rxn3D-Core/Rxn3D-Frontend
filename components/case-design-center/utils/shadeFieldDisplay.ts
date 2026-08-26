/**
 * Display helpers for Teeth shade / Gum Shade field labels (removable + fixed).
 * Prefer brand.system_name (shade guide), never brand.name.
 */

export type ShadeCatalogRow = {
  id?: number;
  teeth_shade_id?: number;
  gum_shade_id?: number;
  name: string;
  brand?: {
    id?: number;
    name?: string;
    system_name?: string | null;
  } | null;
  color_code_middle?: string | null;
};

function parseShadeSelection(raw: string | undefined | null): {
  shadeId: number;
  brandId: number;
  name: string;
} {
  if (!raw?.trim()) return { shadeId: 0, brandId: 0, name: "" };
  try {
    const parsed = JSON.parse(raw) as {
      teeth_shade_id?: number;
      gum_shade_id?: number;
      brand_id?: number;
      name?: string;
    };
    return {
      shadeId: Number(parsed.teeth_shade_id ?? parsed.gum_shade_id ?? 0),
      brandId: Number(parsed.brand_id ?? 0),
      name: String(parsed.name ?? "").trim(),
    };
  } catch {
    return { shadeId: 0, brandId: 0, name: raw.trim() };
  }
}

/** Title-case system names that arrive as snake_case (e.g. vita_classical → Vita Classical). */
export function formatShadeSystemName(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function findShadeCatalogMatch(
  raw: string | undefined | null,
  shades: ShadeCatalogRow[] | undefined | null
): ShadeCatalogRow | null {
  if (!raw?.trim() || !shades?.length) return null;
  const parsed = parseShadeSelection(raw);
  const name = parsed.name;
  if (!name) return null;

  return (
    shades.find((row) => {
      const rowShadeId = Number(row.teeth_shade_id ?? row.gum_shade_id ?? row.id ?? 0);
      const rowBrandId = Number(row.brand?.id ?? 0);
      if (parsed.shadeId > 0 && rowShadeId === parsed.shadeId) return true;
      if (parsed.brandId > 0 && rowBrandId === parsed.brandId && row.name === name) return true;
      return row.name === name;
    }) ?? null
  );
}

/**
 * Field label: "Vita Classical - C3" when system_name is known; otherwise just the shade name.
 * Uses brand.system_name only (not brand.name). Pair with CSS truncate (`min-w-0 flex-1 truncate`)
 * so long system names ellipsize inside the field.
 */
export function formatShadeFieldLabel(
  raw: string | undefined | null,
  shades?: ShadeCatalogRow[] | null,
  fallbackSystemName?: string | null
): string {
  const parsed = parseShadeSelection(raw);
  const name = parsed.name;
  if (!name) return "";

  const match = findShadeCatalogMatch(raw, shades);
  const systemRaw =
    match?.brand?.system_name?.trim() ||
    fallbackSystemName?.trim() ||
    "";
  if (!systemRaw) return name;

  return `${formatShadeSystemName(systemRaw)} - ${name}`;
}

/** @deprecated Use formatShadeFieldLabel — kept for existing removable call sites. */
export const formatRemovableShadeFieldLabel = formatShadeFieldLabel;

/** Tailwind classes for shade labels inside flex field rows (ellipsis when too long). */
export const SHADE_FIELD_LABEL_CLASS =
  "text-[14px] sm:text-lg text-[#000000] truncate min-w-0 flex-1";
