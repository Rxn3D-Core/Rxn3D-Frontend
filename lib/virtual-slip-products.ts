/** Extract products from GET /v1/slip/slip/{id}/details (flat or nested under slips[0]). */
export function extractVirtualSlipProducts(details: unknown): unknown[] {
  if (!details || typeof details !== "object") return [];
  const d = details as {
    products?: unknown[];
    slips?: Array<{ products?: unknown[] }>;
  };
  if (Array.isArray(d.products)) return d.products;
  if (Array.isArray(d.slips?.[0]?.products)) return d.slips[0].products;
  return [];
}

/** Library product id on a slip product row (top-level or nested `product.id`). */
export function slipProductLibraryId(row: Record<string, unknown>): number {
  const nested = row.product as { id?: number } | undefined;
  return Number(row.product_id ?? nested?.id ?? 0);
}

/** Match eligibility line to slip details product (flexible id + arch). */
export function findSlipProductForEligibility(
  ep: { product_id: number; type: string },
  apiProducts: unknown[]
): Record<string, unknown> | undefined {
  if (!Array.isArray(apiProducts) || apiProducts.length === 0) return undefined;
  const wantType = String(ep.type ?? "").toLowerCase();

  const exact = apiProducts.find((p) => {
    const row = p as Record<string, unknown>;
    return (
      slipProductLibraryId(row) === ep.product_id &&
      String(row.type ?? "").toLowerCase() === wantType
    );
  });
  if (exact) return exact as Record<string, unknown>;

  const byProductId = apiProducts.find(
    (p) => slipProductLibraryId(p as Record<string, unknown>) === ep.product_id
  );
  if (byProductId) return byProductId as Record<string, unknown>;

  const byType = apiProducts.filter(
    (p) => String((p as { type?: string }).type ?? "").toLowerCase() === wantType
  );
  if (byType.length === 1) return byType[0] as Record<string, unknown>;

  return undefined;
}
