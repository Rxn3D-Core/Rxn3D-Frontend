import type { ProductApiData, ProductAddon } from "../types";

function isActiveAddon(addon: ProductAddon): boolean {
  return String(addon.status ?? "Active").trim().toLowerCase() !== "inactive";
}

/** True when the product can offer add-ons (API flag or active catalog entries). */
export function productSupportsAddons(
  product: Pick<ProductApiData, "has_addon" | "addons"> | null | undefined
): boolean {
  if (!product) return false;
  if (product.has_addon === "No") return false;
  if (product.has_addon === "Yes") return true;
  return (product.addons ?? []).some(
    (a) => isActiveAddon(a) && (a.addon_id != null || a.id != null)
  );
}

/**
 * Parses the stored add-ons label string (comma-separated, from CaseDesignCenter) into
 * rows we should show in the UI. Omits empty selections such as "0 selected".
 */
export function parseAddonDisplayItems(addonsVal: string | undefined | null): string[] {
  const raw = (addonsVal ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      const lower = s.toLowerCase();
      if (lower === "0 selected") return false;
      return true;
    });
}

export function hasVisibleAddonDisplay(addonsVal: string | undefined | null): boolean {
  return parseAddonDisplayItems(addonsVal).length > 0;
}
