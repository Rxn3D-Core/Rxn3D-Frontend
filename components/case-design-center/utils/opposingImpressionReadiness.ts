export const MAXILLARY_SENTINEL = 1;
export const MANDIBULAR_SENTINEL = 17;

type Arch = "maxillary" | "mandibular";
type InitialArch = Arch | "both";

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
  const opposingArch = getOpposingArch(initialArch);
  if (
    !hasOppositeSection ||
    !oppositeImpressionEnabled ||
    !opposingArch ||
    hasSkippedOpposing(noOpposingNeeded, initialArch)
  ) {
    return { required: false, arch: null, tooth: null };
  }

  const card0Teeth = getCard0TeethForArch(opposingArch);
  return {
    required: true,
    arch: opposingArch,
    tooth: resolveOpposingImpressionTooth(opposingArch, card0Teeth),
  };
}
