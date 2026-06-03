/** Values treated as empty for read-only virtual slip UI (omit label + row). */
const EMPTY_DISPLAY = /^(n\/a|na|—|-|–|none|null|undefined)$/i;

export function hasDisplayValue(value: unknown): boolean {
  const s = String(value ?? "").trim();
  if (!s) return false;
  return !EMPTY_DISPLAY.test(s);
}
