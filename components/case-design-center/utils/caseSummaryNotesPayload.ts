import type { SlipCreationNote, SlipCreationProduct } from "@/services/slip-creation-service";

/** Strip per-product auto notes when the user-visible case summary drives slip notes. */
export function clearProductNotesWhenUsingCaseSummary(
  products: SlipCreationProduct[],
  caseSummaryNotes?: string
): void {
  if (!caseSummaryNotes?.trim()) return;
  for (const product of products) {
    delete product.notes;
  }
}

/** Slip-level notes: prefer the Case Summary Notes textarea (WYSIWYG), else aggregate product notes. */
export function buildSlipLevelNotes(
  slipProducts: SlipCreationProduct[],
  caseSummaryNotes: string | undefined,
  slipIndex: number
): SlipCreationNote[] {
  const trimmed = caseSummaryNotes?.trim();
  if (trimmed) {
    return slipIndex === 0 ? [{ note: trimmed, type: "stage" }] : [];
  }
  return slipProducts
    .map((p) => p.notes)
    .filter((note): note is string => Boolean(note))
    .map((note) => ({ note, type: "stage" as const }));
}
