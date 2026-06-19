/** Limit printable notes to `maxLines` newline-separated lines, appending `...` when truncated. */
export function truncateTextToMaxLines(text: string, maxLines = 4): string {
  const normalized = text.replace(/\r\n/g, "\n").trimEnd();
  if (!normalized) return "";
  const lines = normalized.split("\n");
  if (lines.length <= maxLines) return normalized;
  return `${lines.slice(0, maxLines).join("\n")}\n...`;
}
