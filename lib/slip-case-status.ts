function normalizeSlipCaseStatus(status: string | undefined | null): string {
  return (status ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** True when slip/case status is active (in progress). */
export function isSlipCaseInProgress(status: string | undefined | null): boolean {
  return normalizeSlipCaseStatus(status) === "in progress";
}

/** True when slip/case is on hold — Resume FAB is shown only in this state. */
export function isSlipCaseOnHold(status: string | undefined | null): boolean {
  const normalized = normalizeSlipCaseStatus(status);
  return normalized === "on hold" || normalized === "hold";
}

/** True when slip/case is finished. */
export function isSlipCaseFinished(status: string | undefined | null): boolean {
  return normalizeSlipCaseStatus(status) === "finished";
}

/** True when slip/case is cancelled — read-only, no actions are available. */
export function isSlipCaseCancelled(status: string | undefined | null): boolean {
  const normalized = normalizeSlipCaseStatus(status);
  return (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "cancel" ||
    normalized === "trash"
  );
}
