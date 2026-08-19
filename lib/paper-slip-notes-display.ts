/** Limit printable notes to `maxLines` newline-separated lines, appending `...` when truncated. */
export function truncateTextToMaxLines(text: string, maxLines = 4): string {
  const normalized = text.replace(/\r\n/g, "\n").trimEnd();
  if (!normalized) return "";
  const lines = normalized.split("\n");
  if (lines.length <= maxLines) return normalized;
  return `${lines.slice(0, maxLines).join("\n")}\n...`;
}

type SlipNoteLike = {
  id?: number;
  note?: unknown;
  created_at?: unknown;
  timestamp?: unknown;
  updated_at?: unknown;
};

function slipNoteText(entry: unknown): string {
  if (typeof entry === "string") return entry.trim();
  if (entry && typeof entry === "object") {
    return String((entry as SlipNoteLike).note ?? "").trim();
  }
  return "";
}

function slipNoteTime(entry: unknown): number {
  if (!entry || typeof entry !== "object") return Number.NaN;
  const meta = entry as SlipNoteLike;
  for (const value of [meta.created_at, meta.timestamp, meta.updated_at]) {
    if (value == null || value === "") continue;
    const parsed = Date.parse(String(value));
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Number.NaN;
}

function slipNoteId(entry: unknown): number {
  if (!entry || typeof entry !== "object") return 0;
  const id = (entry as SlipNoteLike).id;
  return typeof id === "number" && id > 0 ? id : 0;
}

/**
 * Paper slips should show only the most recent slip-level stage note.
 * Falls back to array order when timestamps are missing (last entry wins).
 */
export function resolveLatestSlipNoteText(rawNotes: unknown): string {
  if (!Array.isArray(rawNotes) || rawNotes.length === 0) return "";

  type Candidate = { text: string; time: number; id: number; index: number };
  const candidates: Candidate[] = [];

  rawNotes.forEach((entry, index) => {
    const text = slipNoteText(entry);
    if (!text) return;
    const time = slipNoteTime(entry);
    candidates.push({
      text,
      time: Number.isNaN(time) ? -1 : time,
      id: slipNoteId(entry),
      index,
    });
  });

  if (candidates.length === 0) return "";
  if (candidates.length === 1) return candidates[0].text;

  candidates.sort((a, b) => {
    if (b.time !== a.time) return b.time - a.time;
    if (b.id !== a.id) return b.id - a.id;
    return b.index - a.index;
  });

  return candidates[0].text;
}
