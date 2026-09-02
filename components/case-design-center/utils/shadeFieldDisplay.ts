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
  color_code_top?: string | null;
  color_code_bottom?: string | null;
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

/** Candidate shade names for catalog lookup (handles formatted labels like "Vita Classical - B2"). */
function shadeNameCandidates(raw: string | undefined | null): string[] {
  const parsed = parseShadeSelection(raw);
  const name = parsed.name;
  if (!name) return [];

  const candidates = [name];
  const dashIdx = name.lastIndexOf(" - ");
  if (dashIdx > 0) {
    const shortName = name.slice(dashIdx + 3).trim();
    if (shortName && shortName !== name) candidates.push(shortName);
  }
  return candidates;
}

function rowMatchesShadeSelection(
  row: ShadeCatalogRow,
  parsed: ReturnType<typeof parseShadeSelection>,
  name: string
): boolean {
  const rowShadeId = Number(row.teeth_shade_id ?? row.gum_shade_id ?? row.id ?? 0);
  const rowBrandId = Number(row.brand?.id ?? 0);
  if (parsed.shadeId > 0 && rowShadeId === parsed.shadeId) return true;
  if (parsed.brandId > 0 && rowBrandId === parsed.brandId && row.name === name) return true;
  return row.name === name;
}

export function findShadeCatalogMatch(
  raw: string | undefined | null,
  shades: ShadeCatalogRow[] | undefined | null
): ShadeCatalogRow | null {
  if (!raw?.trim() || !shades?.length) return null;
  const parsed = parseShadeSelection(raw);

  for (const name of shadeNameCandidates(raw)) {
    const match = shades.find((row) => rowMatchesShadeSelection(row, parsed, name));
    if (match) return match;
  }

  return null;
}

/** Middle / top / bottom gum shade color for field preview swatches. */
export function getGumShadePreviewColor(
  raw: string | undefined | null,
  shades: ShadeCatalogRow[] | undefined | null
): string | null {
  const match = findShadeCatalogMatch(raw, shades);
  if (!match) return null;
  return (
    match.color_code_middle?.trim() ||
    match.color_code_top?.trim() ||
    match.color_code_bottom?.trim() ||
    null
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
  if (match) {
    const displayName = match.name;
    const systemRaw =
      match.brand?.system_name?.trim() ||
      fallbackSystemName?.trim() ||
      "";
    if (!systemRaw) return displayName;
    return `${formatShadeSystemName(systemRaw)} - ${displayName}`;
  }

  const fallbackSystem = fallbackSystemName?.trim();
  if (fallbackSystem) {
    const shortName = shadeNameCandidates(raw).at(-1) ?? name;
    return `${formatShadeSystemName(fallbackSystem)} - ${shortName}`;
  }

  return name;
}

/** Shade code/name for the tooth preview icon beside Teeth Shade fields. */
export function getShadePreviewCode(raw: string | undefined | null): string {
  const candidates = shadeNameCandidates(raw);
  if (candidates.length === 0) return "";
  return candidates[candidates.length - 1] ?? candidates[0] ?? "";
}

/** @deprecated Use formatShadeFieldLabel — kept for existing removable call sites. */
export const formatRemovableShadeFieldLabel = formatShadeFieldLabel;

/** Tailwind classes for shade labels inside flex field rows (ellipsis when too long). */
export const SHADE_FIELD_LABEL_CLASS =
  "text-[14px] sm:text-lg text-[#000000] truncate min-w-0 flex-1";
