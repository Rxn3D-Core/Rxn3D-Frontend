import type { Arch } from "../types";

/** Stable key for the single expanded product accordion (one arch at a time). */
export function productAccordionKey(arch: Arch, slotId: string): string {
  return `${arch}:${slotId}`;
}

export function addedProductSlotId(productId: number): string {
  return `added:${productId}`;
}

export function defaultActiveAccordionKey(initialArch?: string): string {
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
