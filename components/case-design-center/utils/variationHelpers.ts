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

/* ------------------------------------------------------------------ */
/*  Per-arch product image resolution                                  */
/* ------------------------------------------------------------------ */

/**
 * Resolve the per-arch image for a product. Products may carry arch-specific
 * artwork (`arch_image_maxillary` / `arch_image_mandibular`, sometimes nested as
 * `arch_images.{maxillary,mandibular}`) or jaw reference photos (`jaw_photos`).
 * When present, the upper image is shown on the maxillary arch and the lower
 * image on the mandibular arch (e.g. an upper-only vs lower-only denture).
 * Falls back to `fallback`, then the product's own image.
 *
 * Tolerates the alternate key/nesting shapes the product-details endpoint
 * returns (jaw photos keyed by maxillary/mandibular, `show_jaw_photo` as "Yes").
 */
function firstUrl(...values: unknown[]): string | null {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (s !== "") return s;
  }
  return null;
}

function isJawPhotoMode(showJawPhoto: unknown): boolean {
  if (showJawPhoto === true || showJawPhoto === 1) return true;
  const s = String(showJawPhoto ?? "").trim().toLowerCase();
  return s === "yes" || s === "1" || s === "true";
}

/** Per-arch jaw photo URL, tolerating upper/lower vs maxillary/mandibular keys and `library_product` nesting. */
function jawPhotoForArch(
  product: Record<string, unknown>,
  arch: "maxillary" | "mandibular",
): string | null {
  const nested = product.library_product as Record<string, unknown> | undefined;
  const raw =
    (product.jaw_photos as Record<string, unknown> | undefined) ??
    (product.jawPhotos as Record<string, unknown> | undefined) ??
    (nested?.jaw_photos as Record<string, unknown> | undefined);
  if (!raw || typeof raw !== "object") return null;
  return arch === "maxillary"
    ? firstUrl(raw.upper, raw.Upper, raw.maxillary)
    : firstUrl(raw.lower, raw.Lower, raw.mandibular);
}

/** Read a per-arch image from either nested `arch_images` or flat `arch_image_*`. */
function archImageForArch(
  product: Record<string, unknown>,
  arch: "maxillary" | "mandibular",
): string | null {
  const nested = product.arch_images as Record<string, unknown> | undefined;
  if (arch === "maxillary") {
    return firstUrl(nested?.maxillary, product.arch_image_maxillary);
  }
  return firstUrl(nested?.mandibular, product.arch_image_mandibular);
}

export function resolveArchProductImage(
  product: unknown,
  arch: "maxillary" | "mandibular",
  fallback?: string | null,
): string | null {
  const p = (product && typeof product === "object" ? product : null) as
    | Record<string, unknown>
    | null;
  const fb = fallback ?? firstUrl(p?.image_url, p?.image);
  if (!p) return fb;

  const jawImg = jawPhotoForArch(p, arch);
  const archImg = archImageForArch(p, arch);

  // Jaw photos and per-arch images are equivalent sources for "this side's image".
  // Respect show_jaw_photo when set, but fall back to whichever source is present —
  // the details API may populate jaw_photos without flagging show_jaw_photo. Either
  // side-specific image wins over the generic/both image.
  const [primary, secondary] = isJawPhotoMode(p.show_jaw_photo)
    ? [jawImg, archImg]
    : [archImg, jawImg];

  return primary ?? secondary ?? fb;
}
