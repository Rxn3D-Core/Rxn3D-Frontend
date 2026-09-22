/**
 * Paper slip print layout: full (portrait, 1/sheet) vs half (landscape, 2/sheet).
 * Preference is remembered in localStorage for the next print.
 */

export type PaperSlipPrintLayout = "full" | "half";

export const PAPER_SLIP_PRINT_LAYOUT_STORAGE_KEY = "rxn3d.paperSlipPrintLayout";

export function isPaperSlipPrintLayout(value: unknown): value is PaperSlipPrintLayout {
  return value === "full" || value === "half";
}

export function readStoredPaperSlipPrintLayout(): PaperSlipPrintLayout {
  if (typeof window === "undefined") return "full";
  try {
    const raw = window.localStorage.getItem(PAPER_SLIP_PRINT_LAYOUT_STORAGE_KEY);
    return isPaperSlipPrintLayout(raw) ? raw : "full";
  } catch {
    return "full";
  }
}

export function storePaperSlipPrintLayout(layout: PaperSlipPrintLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAPER_SLIP_PRINT_LAYOUT_STORAGE_KEY, layout);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Chunk sections into pairs for landscape half-page sheets. */
export function chunkPaperSlipSectionsForHalfPage<T>(items: T[]): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pages.push(items.slice(i, i + 2));
  }
  return pages;
}
