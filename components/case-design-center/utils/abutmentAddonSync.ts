import type { ImplantDetailData } from "../components/ImplantDetailSection";
import type { ProductAbutment } from "@/services/implant-api";
import { parseAbutmentOptionCategoryIds } from "@/components/advance-mode/main-category-multi-select";

function addonAppliesToCategory(
  categoryIdsCsv: string | null | undefined,
  productCategoryId?: number | null
): boolean {
  const linked = parseAbutmentOptionCategoryIds(categoryIdsCsv);
  if (linked.length === 0) return true;
  if (productCategoryId == null || productCategoryId <= 0) return true;
  return linked.includes(productCategoryId);
}

export function buildAbutmentAddonEntries(
  implantDetailByTooth: Record<number, ImplantDetailData>,
  productAbutments: ProductAbutment[],
  productCategoryId?: number | null
): Array<{ addon_id: number; qty: number; name: string }> {
  const qtyByAddonId = new Map<number, { qty: number; name: string }>();

  for (const detail of Object.values(implantDetailByTooth)) {
    if (!detail?.abutmentType && !detail?.abutmentId) continue;
    const abutment =
      (detail.abutmentId
        ? productAbutments.find((row) => row.id === detail.abutmentId)
        : null) ?? productAbutments.find((row) => row.type === detail.abutmentType);
    if (!abutment?.addons?.length) continue;
    for (const addon of abutment.addons) {
      if (!addon.id || String(addon.status ?? "Active") === "Inactive") continue;
      if (!addonAppliesToCategory(addon.category_ids, productCategoryId)) continue;
      const current = qtyByAddonId.get(addon.id);
      qtyByAddonId.set(addon.id, {
        qty: (current?.qty ?? 0) + 1,
        name: addon.name,
      });
    }
  }

  return Array.from(qtyByAddonId.entries()).map(([addon_id, row]) => ({
    addon_id,
    qty: row.qty,
    name: row.name,
  }));
}
