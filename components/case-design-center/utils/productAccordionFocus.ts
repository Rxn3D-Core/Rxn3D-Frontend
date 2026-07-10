import type { AddedProduct, Arch, ProductApiData } from "../types";

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

/** Guided slip-creation phases when initialArch is "both" (one arch active at a time). */
export type GuidedBothArchPhase =
  | "upper-selection"
  | "lower-selection"
  | "upper-fields"
  | "lower-fields"
  /** Both arches are fully configured — user can freely edit either arch. */
  | "both-active";

export function guidedPhaseAllowsArch(phase: GuidedBothArchPhase, arch: Arch): boolean {
  if (phase === "both-active") return true;
  if (phase === "upper-selection" || phase === "upper-fields") return arch === "maxillary";
  return arch === "mandibular";
}

/** Distinct card-0 fixed prep/pontic/implant product groups on an arch. */
export function countFixedCard0Groups(
  arch: Arch,
  retentionTypes: Record<string, string[]>,
  getToothProductCard: (arch: Arch, toothNumber: number) => number,
  getToothProduct: (arch: Arch, toothNumber: number) => ProductApiData | null
): number {
  const groupKeys = new Set<string>();
  for (const [toothNum, types] of Object.entries(retentionTypes)) {
    const hasPrepPontic = types.some(
      (t) => t === "Prep" || t === "Pontic" || t === "Implant"
    );
    if (!hasPrepPontic) continue;
    const tn = Number(toothNum);
    if (getToothProductCard(arch, tn) !== 0) continue;
    const product = getToothProduct(arch, tn);
    groupKeys.add(product?.id ? String(product.id) : "no_product");
  }
  return groupKeys.size;
}

/** Total product accordion cards rendered on one arch (card 0 + added products). */
export function archProductAccordionCount(
  arch: Arch,
  addedProducts: AddedProduct[] | undefined,
  options: {
    hasRemovablesCard0: boolean;
    fixedCard0GroupCount: number;
  }
): number {
  const added = (addedProducts ?? []).filter((p) => p.arch === arch).length;
  const card0 =
    (options.hasRemovablesCard0 ? 1 : 0) +
    (options.fixedCard0GroupCount > 0 ? options.fixedCard0GroupCount : 0);
  return card0 + added;
}

/** When false, the sole product accordion on an arch stays open (no collapse chevron). */
export function archAllowsAccordionCollapse(
  arch: Arch,
  addedProducts: AddedProduct[] | undefined,
  options: {
    hasRemovablesCard0: boolean;
    fixedCard0GroupCount: number;
  }
): boolean {
  return archProductAccordionCount(arch, addedProducts, options) > 1;
}
