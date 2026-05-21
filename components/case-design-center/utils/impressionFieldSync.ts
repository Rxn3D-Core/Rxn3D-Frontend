import type { Arch, ImpressionOptionForModal, ProductApiData } from "../types";
import { productImpressionsToModalOptions } from "../types";

const IMPRESSION_KEY_RE = /^([^_]+)_(maxillary|mandibular)_(.+)$/;

/** One impression selection per arch (card 0 product id in modal keys). */
export const ARCH_IMPRESSION_PRODUCT_ID = "0";

export function parseImpressionKey(
  key: string
): { productId: string; arch: Arch; code: string } | null {
  const match = key.match(IMPRESSION_KEY_RE);
  if (!match) return null;
  return { productId: match[1], arch: match[2] as Arch, code: match[3] };
}

export function getDualModalArches(
  oppositeImpression: "Yes" | "No" | undefined,
  currentArch: Arch
): Arch[] {
  if (oppositeImpression === "Yes") {
    return ["maxillary", "mandibular"];
  }
  return [currentArch];
}

export function buildImpressionDisplayText(
  selectedImpressions: Record<string, number>,
  productId: string,
  arch: Arch,
  resolveLabel: (code: string) => string
): string {
  const prefix = `${productId}_${arch}_`;
  const entries = Object.entries(selectedImpressions).filter(
    ([key, qty]) => key.startsWith(prefix) && qty > 0
  );
  return entries
    .map(([key, qty]) => {
      const identifier = key.slice(prefix.length);
      return `${qty}x ${resolveLabel(identifier)}`;
    })
    .join(", ");
}

export function archHasActiveImpressionSelections(
  selectedImpressions: Record<string, number>,
  productId: string,
  arch: Arch
): boolean {
  const prefix = `${productId}_${arch}_`;
  return Object.entries(selectedImpressions).some(
    ([key, qty]) => key.startsWith(prefix) && qty > 0
  );
}

/** Map stored impression key segment (code/value) to display name. */
export function resolveImpressionName(
  identifier: string,
  options: ImpressionOptionForModal[]
): string {
  const impression = options.find(
    (i) =>
      i.value === identifier ||
      i.code === identifier ||
      i.name === identifier
  );
  return impression?.name || identifier;
}

export function getImpressionOptionsForProduct(
  product: ProductApiData | null | undefined
): ImpressionOptionForModal[] {
  return productImpressionsToModalOptions(product?.impressions);
}

const MAXILLARY_TEETH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const MANDIBULAR_TEETH = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

/** Resolve product API data for building impression labels from productId + arch. */
export function resolveProductForImpression(
  arch: Arch,
  productId: string,
  getToothProduct: (arch: Arch, tooth: number) => ProductApiData | null,
  initialProductDetails: ProductApiData | null | undefined,
  toothNumber?: number
): ProductApiData | null {
  if (toothNumber != null) {
    const fromTooth = getToothProduct(arch, toothNumber);
    if (fromTooth) return fromTooth;
  }
  if (
    initialProductDetails &&
    (initialProductDetails.id?.toString() === productId || productId === "0")
  ) {
    return initialProductDetails;
  }
  const allTeeth = arch === "maxillary" ? MAXILLARY_TEETH : MANDIBULAR_TEETH;
  for (const tn of allTeeth) {
    const p = getToothProduct(arch, tn);
    if (p?.id?.toString() === productId) return p;
  }
  return null;
}
