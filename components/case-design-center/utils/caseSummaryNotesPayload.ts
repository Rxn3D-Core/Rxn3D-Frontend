import type { SlipCreationNote, SlipCreationProduct } from "@/services/slip-creation-service";

/**
 * Strip per-product auto notes only when a single slip uses the case-summary textarea
 * as the one slip-level stage note (avoids duplicating the same text on products).
 */
export function clearProductNotesWhenUsingCaseSummary(
  products: SlipCreationProduct[],
  caseSummaryNotes?: string,
  totalSlips = 1
): void {
  if (!caseSummaryNotes?.trim() || totalSlips !== 1) return;
  for (const product of products) {
    delete product.notes;
  }
}

/**
 * Slip-level stage notes for create / add-stage.
 * - Single slip: prefer the Case Summary Notes textarea (WYSIWYG).
 * - Multiple slips: attach stage notes for the products on each slip only.
 */
export function buildSlipLevelNotes(
  slipProducts: SlipCreationProduct[],
  caseSummaryNotes: string | undefined,
  slipIndex: number,
  totalSlips = 1
): SlipCreationNote[] {
  const trimmedSummary = caseSummaryNotes?.trim();

  if (trimmedSummary && totalSlips === 1 && slipIndex === 0) {
    return [{ note: trimmedSummary, type: "stage" }];
  }

  return slipProducts
    .map((p) => p.notes?.trim())
    .filter((note): note is string => Boolean(note))
    .map((note) => ({ note, type: "stage" as const }));
}
