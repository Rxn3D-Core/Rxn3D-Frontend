import type { AddedProduct, Arch } from "../types";

/** Stable key for the single expanded product accordion (one arch at a time). */
export function productAccordionKey(arch: Arch, slotId: string): string {
  return `${arch}:${slotId}`;
}

export function addedProductSlotId(productId: number): string {
  return `added:${productId}`;
}

/** First preloaded added product to focus (add-new-stage / slip hydrate). */
export function firstPreloadedAccordionFocus(
  initialArch: string | undefined,
  addedProducts: AddedProduct[] | undefined
): { key: string; productCardId: number; arch: Arch } | null {
  const list = addedProducts ?? [];
  if (list.length === 0) return null;
  const preferredArch: Arch = initialArch === "mandibular" ? "mandibular" : "maxillary";
  const first = list.find((p) => p.arch === preferredArch) ?? list[0];
  const arch = first.arch as Arch;
  return {
    arch,
    productCardId: first.id,
    key: productAccordionKey(arch, addedProductSlotId(first.id)),
  };
}

export function defaultActiveAccordionKey(
  initialArch?: string,
  addedProducts?: AddedProduct[]
): string {
  const focus = firstPreloadedAccordionFocus(initialArch, addedProducts);
  if (focus) return focus.key;
  if (initialArch === "mandibular") return productAccordionKey("mandibular", "removable0");
  return productAccordionKey("maxillary", "removable0");
}

/** Arch encoded as the first segment of `productAccordionKey` (e.g. `maxillary:added:3`). */
export function archFromActiveAccordionKey(activeAccordionKey: string): Arch | null {
  if (!activeAccordionKey) return null;
  const colon = activeAccordionKey.indexOf(":");
  if (colon <= 0) return null;
  const arch = activeAccordionKey.slice(0, colon);
  if (arch === "maxillary" || arch === "mandibular") return arch;
  return null;
}

/** True when this panel's arch owns the expanded product accordion (tooth chart + status boxes). */
export function isOwnArchToothChartEnabled(
  panelArch: Arch,
  activeAccordionKey: string
): boolean {
  return archFromActiveAccordionKey(activeAccordionKey) === panelArch;
}
