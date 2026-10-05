/**
 * Removable products with no tooth chart / tooth selection in case design —
 * typically impression / stage / notes only (e.g. Minimum Acrylic Repair for
 * gum cracks when configured without extractions).
 */

type ProductLike = {
  has_retention?: string | boolean | null;
  retention_options?: unknown[] | null;
  hide_reference_teeth_selection?: string | null;
  extractions?: unknown[] | null;
} | null | undefined;

function hasRetentionLayer(product: NonNullable<ProductLike>): boolean {
  const flag = product.has_retention;
  if (flag === true || flag === "Yes" || flag === "yes") return true;
  if (flag === false || flag === "No" || flag === "no") return false;
  return Array.isArray(product.retention_options) && product.retention_options.length > 0;
}

function isActiveExtractionRow(e: {
  status?: string;
  name?: string | null;
  code?: string | null;
}): boolean {
  if (String(e.status ?? "Active").trim().toLowerCase() === "inactive") return false;
  if (e.name == null || e.code == null) return false;
  if (String(e.name).trim() === "" || String(e.code).trim() === "") return false;
  return true;
}

export function shouldHideReferenceTeethSelection(product?: object | null): boolean {
  if (!product) return false;
  const p = product as ProductLike;
  return String(p?.hide_reference_teeth_selection ?? "")
    .trim()
    .toLowerCase() === "yes";
}

export function isNoToothChartProduct(product?: object | null): boolean {
  if (!product) return false;
  const p = product as NonNullable<ProductLike>;
  if (hasRetentionLayer(p)) return false;
  if (shouldHideReferenceTeethSelection(p)) return true;
  const extractions = p.extractions;
  if (!Array.isArray(extractions)) return true;
  return !extractions.some((e) =>
    isActiveExtractionRow(
      e as { status?: string; name?: string | null; code?: string | null }
    )
  );
}
