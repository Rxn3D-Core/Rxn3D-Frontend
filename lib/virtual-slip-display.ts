/** Values treated as empty for read-only virtual slip UI (omit label + row). */
const EMPTY_DISPLAY = /^(n\/a|na|—|-|–|none|null|undefined)$/i;

export function hasDisplayValue(value: unknown): boolean {
  const s = String(value ?? "").trim();
  if (!s) return false;
  return !EMPTY_DISPLAY.test(s);
}

/** `#8` for one tooth; `#'s 8,9,10` when multiple (optional joiner between numbers). */
export function formatToothNumbersLabel(
  teeth: number[],
  options?: { separator?: string },
): string {
  const sorted = [...teeth].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  const separator = options?.separator ?? ",";
  const list = sorted.join(separator);
  if (sorted.length === 1) return `#${list}`;
  return `#'s ${list}`;
}
