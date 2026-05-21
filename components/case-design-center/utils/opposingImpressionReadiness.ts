import type { Arch } from "../types";

export const MAXILLARY_SENTINEL = 1;
export const MANDIBULAR_SENTINEL = 17;

type InitialArch = Arch | "both";

const IMPRESSION_KEY_RE = /^([^_]+)_(maxillary|mandibular)_(.+)$/;

function parseImpressionKeyLocal(
  key: string
): { productId: string; arch: Arch; code: string } | null {
  const match = key.match(IMPRESSION_KEY_RE);
  if (!match) return null;
  return { productId: match[1], arch: match[2] as Arch, code: match[3] };
}

function archHasActiveSelections(
  selectedImpressions: Record<string, number>,
  productId: string,
  arch: Arch
): boolean {
  const prefix = `${productId}_${arch}_`;
  return Object.entries(selectedImpressions).some(
    ([key, qty]) => key.startsWith(prefix) && qty > 0
  );
}

export function isOppositeImpressionEnabled(
  product: { opposite_impression?: unknown } | null | undefined
): boolean {
  const oi = product?.opposite_impression;
  return oi === "Yes" || oi === true || oi === 1;
}

export function getOpposingArch(initialArch: InitialArch): Arch | null {
  if (initialArch === "both") return null;
  return initialArch === "maxillary" ? "mandibular" : "maxillary";
}

export function resolveOpposingImpressionTooth(
  opposingArch: Arch,
  card0Teeth: number[]
): number {
  if (card0Teeth.length > 0) return Math.min(...card0Teeth);
  return opposingArch === "maxillary" ? MAXILLARY_SENTINEL : MANDIBULAR_SENTINEL;
}

/** Where opposing impression field progress is stored on a single-arch removable slip. */
export function resolveOpposingFieldStorage(initialArch: InitialArch): {
  fieldArch: Arch;
  fieldTooth: number;
} | null {
  if (initialArch === "both") return null;
  if (initialArch === "maxillary") {
    return { fieldArch: "maxillary", fieldTooth: MAXILLARY_SENTINEL };
  }
  return { fieldArch: "mandibular", fieldTooth: MANDIBULAR_SENTINEL };
}

/** Product id prefix used in selectedImpressions keys for the opposing arch. */
export function resolveOpposingImpressionProductId(
  product: { id?: number } | null | undefined,
  selectedImpressions: Record<string, number>,
  opposingArch: Arch
): string {
  const fromProduct = product?.id?.toString();
  if (
    fromProduct &&
    archHasActiveSelections(selectedImpressions, fromProduct, opposingArch)
  ) {
    return fromProduct;
  }
  if (archHasActiveSelections(selectedImpressions, "0", opposingArch)) {
    return "0";
  }
  for (const key of Object.keys(selectedImpressions)) {
    const parsed = parseImpressionKeyLocal(key);
    if (parsed?.arch === opposingArch && (selectedImpressions[key] ?? 0) > 0) {
      return parsed.productId;
    }
  }
  return fromProduct ?? "0";
}

/** True when any product has opposing-arch impression qty > 0. */
export function archHasOpposingImpressionSelections(
  selectedImpressions: Record<string, number>,
  opposingArch: Arch,
  productId?: string
): boolean {
  if (productId) {
    return archHasActiveSelections(selectedImpressions, productId, opposingArch);
  }
  return Object.entries(selectedImpressions).some(([key, qty]) => {
    const parsed = parseImpressionKeyLocal(key);
    return parsed?.arch === opposingArch && qty > 0;
  });
}

export function hasSkippedOpposing(
  noOpposingNeeded: Record<string, boolean>,
  primaryArch: Arch
): boolean {
  if (primaryArch === "maxillary") {
    return Object.keys(noOpposingNeeded).some(
      (k) =>
        /^\d+_mandibular_/.test(k) ||
        (k.startsWith("maxillary_prep_") && k.includes("_mandibular_"))
    );
  }
  return Object.keys(noOpposingNeeded).some(
    (k) =>
      /^\d+_maxillary_/.test(k) ||
      (k.startsWith("mandibular_prep_") && k.includes("_maxillary_"))
  );
}

export function getOpposingImpressionRequirement({
  initialArch,
  hasOppositeSection,
  oppositeImpressionEnabled,
  noOpposingNeeded,
  getCard0TeethForArch,
}: {
  initialArch: InitialArch;
  hasOppositeSection: boolean;
  oppositeImpressionEnabled: boolean;
  noOpposingNeeded: Record<string, boolean>;
  getCard0TeethForArch: (arch: Arch) => number[];
}): { required: boolean; arch: Arch | null; tooth: number | null } {
  // Opposing impressions are always optional — never block slip readiness.
  void hasOppositeSection;
  void oppositeImpressionEnabled;
  void noOpposingNeeded;
  void getCard0TeethForArch;
  void initialArch;
  return { required: false, arch: null, tooth: null };
}
