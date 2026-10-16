import type { Arch } from "../types";

/**
 * Count teeth assigned to each product card from a slip preload map
 * (`toothProductCards` keys like `maxillary_14` → cardId).
 */
export function countPreloadedTeethByCard(
  toothProductCards: Record<string, number> | null | undefined,
  arch: Arch
): Record<number, number> {
  const counts: Record<number, number> = {};
  if (!toothProductCards) return counts;
  const prefix = `${arch}_`;
  for (const [key, cardId] of Object.entries(toothProductCards)) {
    if (!key.startsWith(prefix)) continue;
    const toothPart = key.slice(prefix.length);
    // Skip virtual slots (negative tooth numbers) — they are not chart selections.
    if (toothPart.startsWith("-")) continue;
    const id = Number(cardId);
    if (!Number.isFinite(id)) continue;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}
