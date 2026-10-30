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

/** True when a route segment is a positive integer id (rejects "abc", "0", "1.5", "12abc"). */
export function isValidVirtualSlipRouteId(
  raw: string | string[] | number | null | undefined
): boolean {
  if (typeof raw !== "string" && typeof raw !== "number") return false;
  const text = String(raw).trim();
  return /^\d+$/.test(text) && Number(text) > 0;
}

/**
 * True when the virtual slip URL cannot show a slip: a bad case/slip id, or a
 * finished load that returned no slip details (404, 422, empty data).
 */
export function isVirtualSlipUnavailable(args: {
  caseIdParam: string | string[] | undefined;
  slipIdParam: string | string[] | undefined;
  loading: boolean;
  details: unknown;
}): boolean {
  if (
    !isValidVirtualSlipRouteId(args.caseIdParam) ||
    !isValidVirtualSlipRouteId(args.slipIdParam)
  ) {
    return true;
  }
  if (args.loading) return false;
  const details = args.details;
  return (
    !details ||
    typeof details !== "object" ||
    Object.keys(details as Record<string, unknown>).length === 0
  );
}
