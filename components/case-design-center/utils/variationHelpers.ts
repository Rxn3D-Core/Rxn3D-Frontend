/**
 * Helpers for resolving product variation label + image based on the
 * number of teeth the user selected (teeth_space) against the product's
 * `variations` array.
 *
 * A variation's `teeth_spec` can be a single value ("1", "2", ...) or a
 * range ("4 - 15"). The `name_template` uses the token `[x tooth/teeth]`
 * which is replaced with `"{count} tooth"` or `"{count} teeth"`.
 */

const NAME_PLACEHOLDER_TOKEN = "[x tooth/teeth]";

export interface ProductVariation {
  id?: number;
  sort_order?: number;
  image_url?: string | null;
  teeth_spec?: string | null;
  name_template?: string | null;
}

/** Parse a `teeth_spec` string into an inclusive [min, max] range. */
function parseTeethSpec(spec: string | null | undefined): { min: number; max: number } | null {
  if (!spec) return null;
  const trimmed = spec.trim();
  if (!trimmed) return null;

  const parts = trimmed.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) {
    const n = parseInt(parts[0], 10);
    if (Number.isNaN(n)) return null;
    return { min: n, max: n };
  }
  if (parts.length === 2) {
    const min = parseInt(parts[0], 10);
    const max = parseInt(parts[1], 10);
    if (Number.isNaN(min) || Number.isNaN(max)) return null;
    return { min: Math.min(min, max), max: Math.max(min, max) };
  }
  return null;
}

/**
 * Find the variation whose teeth_spec matches the given teeth count.
 * Returns the first match (sorted by sort_order) when multiple apply.
 */
export function findVariationByTeethCount(
  variations: ReadonlyArray<ProductVariation> | null | undefined,
  teethCount: number,
): ProductVariation | null {
  if (!variations || variations.length === 0) return null;
  if (teethCount <= 0) return null;

  const sorted = [...variations].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );

  for (const v of sorted) {
    const range = parseTeethSpec(v.teeth_spec);
    if (!range) continue;
    if (teethCount >= range.min && teethCount <= range.max) {
      return v;
    }
  }
  return null;
}

/** Replace `[x tooth/teeth]` token with `{count} tooth|teeth`. */
export function renderVariationLabel(
  nameTemplate: string | null | undefined,
  teethCount: number,
): string {
  const template = (nameTemplate ?? "").trim();
  if (!template) return "";
  const unit = teethCount === 1 ? "tooth" : "teeth";
  return template.replace(NAME_PLACEHOLDER_TOKEN, `${teethCount} ${unit}`);
}

/**
 * Resolve the product's display name and image for the Initial Removables
 * accordion. Falls back to the product's own name/image when no variation
 * matches.
 */
export function resolveVariationDisplay(
  product: {
    name?: string;
    image_url?: string | null;
    has_variation?: string | boolean | null;
    variations?: ReadonlyArray<ProductVariation> | null;
  } | null | undefined,
  teethCount: number,
  fallbackName: string = "Removable restoration",
): { name: string; imageUrl: string | null; matched: boolean } {
  const baseName = product?.name || fallbackName;
  const baseImage = product?.image_url ?? null;

  const hasVariationOn =
    product?.has_variation === true ||
    product?.has_variation === "Yes" ||
    product?.has_variation === "yes";

  if (!hasVariationOn) {
    return { name: baseName, imageUrl: baseImage, matched: false };
  }

  const matched = findVariationByTeethCount(product?.variations ?? null, teethCount);
  if (!matched) {
    return { name: baseName, imageUrl: baseImage, matched: false };
  }

  const label = renderVariationLabel(matched.name_template, teethCount);
  return {
    name: label || baseName,
    imageUrl: matched.image_url ?? baseImage,
    matched: true,
  };
}
