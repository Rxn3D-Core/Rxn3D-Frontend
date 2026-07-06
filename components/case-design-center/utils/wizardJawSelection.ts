import { hasRetentionOptions } from "./categoryHelpers";
import { productHasDefaultToothChartEnabled } from "@/lib/product-default-tooth-chart";

/** Category flag from library_categories.show_jaw_selection. Defaults to Yes when unset. */
export function categoryShowsJawSelection(
  category: { show_jaw_selection?: "Yes" | "No" | string | null } | null | undefined,
): boolean {
  const jaw = category?.show_jaw_selection;
  if (jaw === "No" || String(jaw ?? "").trim().toLowerCase() === "no") return false;
  return true;
}

/**
 * Whether the product picker should show upper / both / lower arch selection.
 * Default tooth chart products always ask; otherwise gated by category jaw flag
 * and non-fixed (removable) products.
 */
export function shouldShowJawArchSelection(
  product: Record<string, unknown> | null | undefined,
  categoryShowJaw: boolean,
): boolean {
  if (productHasDefaultToothChartEnabled(product)) return true;
  if (!categoryShowJaw) return false;
  return !hasRetentionOptions(product as Parameters<typeof hasRetentionOptions>[0]);
}
