import type { ImplantDetailData } from "../components/ImplantDetailSection";
import type { ProductAbutment } from "@/services/implant-api";

export type AddonQtyEntry = { addon_id: number; qty: number; name?: string };

function parseCategoryIds(
  value?: string | number[] | number | null
): number[] {
  if (value == null || value === "") return [];
  const raw = Array.isArray(value)
    ? value
    : typeof value === "number"
      ? [value]
      : String(value).split(",");
  return raw
    .map((part) => Number(String(part).trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function addonAppliesToCategory(
  categoryIdsCsv: string | number[] | number | null | undefined,
  productCategoryId?: number | null
): boolean {
  const linked = parseCategoryIds(categoryIdsCsv);
  if (linked.length === 0) return true;
  if (productCategoryId == null || productCategoryId <= 0) return true;
  return linked.includes(productCategoryId);
}

export function normalizeAddonName(name: string | null | undefined): string {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Qty for abutment default addons = number of teeth with Implant retention.
 * `implantToothNumbers` is the implant-retention tooth list for the product group.
 * Same-name catalog duplicates collapse to one line (4x, not 1x + 3x).
 */
export function buildAbutmentAddonEntries(
  implantDetailByTooth: Record<number, ImplantDetailData>,
  productAbutments: ProductAbutment[],
  productCategoryId?: number | null,
  implantToothNumbers?: number[]
): Array<{ addon_id: number; qty: number; name: string }> {
  const implantCount = (implantToothNumbers ?? [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0).length;

  const teethByName = new Map<string, Set<number>>();
  const addonByName = new Map<string, { addon_id: number; name: string }>();

  for (const [toothKey, detail] of Object.entries(implantDetailByTooth)) {
    const toothNumber = Number(toothKey);
    if (!Number.isFinite(toothNumber) || toothNumber <= 0) continue;
    if (!detail?.abutmentType && !detail?.abutmentId) continue;
    const abutment =
      (detail.abutmentId
        ? productAbutments.find((row) => row.id === detail.abutmentId)
        : null) ?? productAbutments.find((row) => row.type === detail.abutmentType);
    if (!abutment?.addons?.length) continue;
    for (const addon of abutment.addons) {
      if (!addon.id || String(addon.status ?? "Active") === "Inactive") continue;
      if (!addonAppliesToCategory(addon.category_ids, productCategoryId)) continue;
      const name = String(addon.name ?? "").trim();
      if (!name) continue;
      const key = normalizeAddonName(name);
      const teeth = teethByName.get(key) ?? new Set<number>();
      teeth.add(toothNumber);
      teethByName.set(key, teeth);
      if (!addonByName.has(key)) {
        addonByName.set(key, { addon_id: addon.id, name });
      }
    }
  }

  return Array.from(teethByName.entries()).map(([key, teeth]) => {
    const row = addonByName.get(key)!;
    // Prefer implant-retention count so qty matches selected Implant retentions
    // even before every tooth's abutment row is mirrored into state.
    const qty = Math.max(teeth.size, implantCount > 0 ? implantCount : 0);
    return {
      addon_id: row.addon_id,
      qty,
      name: row.name,
    };
  });
}

/**
 * Abutment default addons replace product-library defaults of the same name
 * instead of stacking as duplicate invoice lines.
 */
export function mergeProductAndAbutmentAddonEntries(
  existing: AddonQtyEntry[],
  abutment: Array<{ addon_id: number; qty: number; name: string }>
): AddonQtyEntry[] {
  const byName = new Map<string, AddonQtyEntry>();
  for (const entry of abutment) {
    if (entry.qty <= 0) continue;
    const key = normalizeAddonName(entry.name);
    if (!key) continue;
    const current = byName.get(key);
    byName.set(key, {
      addon_id: current?.addon_id ?? entry.addon_id,
      qty: Math.max(current?.qty ?? 0, entry.qty),
      name: current?.name || entry.name,
    });
  }
  const abutmentNames = new Set(byName.keys());
  const merged = Array.from(byName.values());
  for (const entry of existing) {
    if (entry.qty <= 0) continue;
    const key = normalizeAddonName(entry.name);
    if (key && abutmentNames.has(key)) continue;
    merged.push(entry);
  }
  return merged;
}
