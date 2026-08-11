const STORAGE_KEY = "paperSlipAutoPrintSlipId";

/**
 * Marks a freshly created slip so the virtual slip page auto-opens the paper
 * slip print window once. Uses sessionStorage (not a query param) so a page
 * reload never re-triggers the print.
 */
export function markSlipForAutoPrint(slipId: number): void {
  if (typeof window === "undefined" || !slipId) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, String(slipId));
  } catch {
    // Storage unavailable (private mode / quota) — auto-print is best-effort.
  }
}

/**
 * One-shot check: returns true only the first time it is called for a slip
 * previously marked via markSlipForAutoPrint, and clears the flag so later
 * mounts (reloads, back-navigation) do not print again.
 */
export function consumeSlipAutoPrint(slipId: number): boolean {
  if (typeof window === "undefined" || !slipId) return false;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored !== String(slipId)) return false;
    window.sessionStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
