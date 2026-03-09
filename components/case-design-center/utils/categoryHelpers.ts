/**
 * Centralized category detection helpers.
 * Replaces dozens of inline toLowerCase() comparisons scattered across panels.
 */

/** Returns true if the category is a Removable-type category (Removables Restoration, Orthodontics) */
export function isRemovableCategory(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return (
    n === "removables" ||
    n === "removables restoration" ||
    n === "removable restoration" ||
    n === "orthodontics"
  );
}

/** Returns true if the category is Fixed Restoration */
export function isFixedCategory(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.toLowerCase().trim() === "fixed restoration";
}

/** Returns true if the category is Orthodontics */
export function isOrthodonticsCategory(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.toLowerCase().trim() === "orthodontics";
}

/** Get the normalized category name from a product's nested subcategory */
export function getCategoryName(product: { subcategory?: { category?: { name?: string } } } | null | undefined): string {
  return product?.subcategory?.category?.name ?? "";
}
