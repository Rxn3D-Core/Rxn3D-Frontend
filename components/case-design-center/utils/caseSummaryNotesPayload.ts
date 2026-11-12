import type { SlipCreationNote, SlipCreationProduct } from "@/services/slip-creation-service";

/**
 * RXN-62: auto-generated notes are switched off for now (create slip, add stage, edit slip;
 * lab and office side). The generator in `caseNoteBuilder.ts` is kept on purpose.
 * Set this back to `true` to switch them on again.
 */
export const AUTO_GENERATED_NOTES_ENABLED: boolean = false;

/**
 * Strip per-product auto notes only when a single slip uses the case-summary textarea
 * as the one slip-level stage note (avoids duplicating the same text on products).
 */
export function clearProductNotesWhenUsingCaseSummary(
  products: SlipCreationProduct[],
  caseSummaryNotes?: string,
  totalSlips = 1,
  autoNotesEnabled = AUTO_GENERATED_NOTES_ENABLED
): void {
  if (!autoNotesEnabled) {
    // Nothing is generated, so products never carry a note of their own.
    for (const product of products) {
      delete product.notes;
    }
    return;
  }
  if (!caseSummaryNotes?.trim() || totalSlips !== 1) return;
  for (const product of products) {
    delete product.notes;
  }
}

/**
 * Slip-level stage notes for create / add-stage.
 * - Single slip: prefer the Case Summary Notes textarea (WYSIWYG).
 * - Multiple slips: attach stage notes for the products on each slip only.
 * - Auto notes off: only the note the user typed is sent, on every slip of the case.
 */
export function buildSlipLevelNotes(
  slipProducts: SlipCreationProduct[],
  caseSummaryNotes: string | undefined,
  slipIndex: number,
  totalSlips = 1,
  autoNotesEnabled = AUTO_GENERATED_NOTES_ENABLED
): SlipCreationNote[] {
  const trimmedSummary = caseSummaryNotes?.trim();

  if (!autoNotesEnabled) {
    return trimmedSummary ? [{ note: trimmedSummary, type: "stage" }] : [];
  }

  if (trimmedSummary && totalSlips === 1 && slipIndex === 0) {
    return [{ note: trimmedSummary, type: "stage" }];
  }

  return slipProducts
    .map((p) => p.notes?.trim())
    .filter((note): note is string => Boolean(note))
    .map((note) => ({ note, type: "stage" as const }));
}
