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
