/**
 * Canonical virtual slip URL: `/virtual-slip/{caseId}/{slipId}`.
 * When `caseId` is missing, falls back to the legacy single-segment route
 * (`/virtual-slip-v2/{slipId}`), which resolves case id and redirects.
 */
export function buildVirtualSlipPath(
  caseId: number | string | null | undefined,
  slipId: number | string
): string {
  const slip = String(slipId).trim();
  if (!slip) {
    throw new Error("Unable to build virtual slip path without a slip id.");
  }

  const caseNum =
    caseId == null || caseId === ""
      ? NaN
      : typeof caseId === "number"
        ? caseId
        : Number(String(caseId).trim());

  if (Number.isFinite(caseNum) && caseNum > 0) {
    return `/virtual-slip/${caseNum}/${slip}`;
  }

  return `/virtual-slip-v2/${slip}`;
}

/** @deprecated Prefer `buildVirtualSlipPath`. */
export function buildVirtualSlipV2Path(
  caseId: number | string | null | undefined,
  slipId: number | string
): string {
  return buildVirtualSlipPath(caseId, slipId);
}
