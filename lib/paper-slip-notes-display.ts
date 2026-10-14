/** Appended when printable notes exceed the 3-line box. Plain text only (no badge). */
export const PAPER_SLIP_NOTES_OVERFLOW_SUFFIX =
  "... (view full notes on virtual slip)";

/** Matches `.ps-notes` content width: 628px page − 16px page pad − 24px notes pad. */
export const PAPER_SLIP_NOTES_PROBE_WIDTH_PX = 588;

/** Matches `.ps-notes` `line-height: 18px`. */
export const PAPER_SLIP_NOTES_LINE_HEIGHT_PX = 18;

/** Visible note lines in the printed box. */
export const PAPER_SLIP_NOTES_MAX_LINES = 3;

/**
 * Approx. chars/line fallback when `document` is unavailable (Node tests).
 * Conservative so the plain suffix still fits on the last line.
 */
const PAPER_SLIP_NOTES_CHARS_PER_LINE = 64;

const PAPER_SLIP_NOTES_BODY_LINES_WHEN_TRUNCATED = 2.5;

export type PaperSlipNotesTruncation = {
  /** Note body only (no overflow suffix). Empty when there is no note. */
  body: string;
  isTruncated: boolean;
};

function normalizePaperSlipNote(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function cutAtWordBoundary(text: string, maxLen: number): string {
  if (maxLen <= 0) return "";
  if (text.length <= maxLen) return text;
  let cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace >= Math.floor(maxLen * 0.6)) {
    cut = cut.slice(0, lastSpace);
  }
  return cut.trimEnd();
}

/** Limit printable notes to `maxLines` newline-separated lines, appending `...` when truncated. */
export function truncateTextToMaxLines(text: string, maxLines = 4): string {
  const normalized = text.replace(/\r\n/g, "\n").trimEnd();
  if (!normalized) return "";
  const lines = normalized.split("\n");
  if (lines.length <= maxLines) return normalized;
  return `${lines.slice(0, maxLines).join("\n")}\n...`;
}

/**
 * Char-budget fallback when DOM measurement is unavailable.
 * Long notes stop near 2.5 lines so the plain suffix fits on the same last line.
 */
export function truncatePaperSlipNotes(
  text: string,
  maxLines = PAPER_SLIP_NOTES_MAX_LINES,
  charsPerLine = PAPER_SLIP_NOTES_CHARS_PER_LINE
): PaperSlipNotesTruncation {
  const normalized = normalizePaperSlipNote(text);
  if (!normalized) return { body: "", isTruncated: false };

  const perLine = Math.max(1, charsPerLine);
  const maxChars = Math.max(1, maxLines) * perLine;
  if (normalized.length <= maxChars) {
    return { body: normalized, isTruncated: false };
  }

  const budget = Math.max(
    1,
    Math.min(
      Math.floor(perLine * PAPER_SLIP_NOTES_BODY_LINES_WHEN_TRUNCATED),
      maxChars - PAPER_SLIP_NOTES_OVERFLOW_SUFFIX.length
    )
  );
  return {
    body: cutAtWordBoundary(normalized, budget),
    isTruncated: true,
  };
}

/**
 * Binary-search a word-boundary cut so `body + suffix` fits within `maxHeightPx`.
 * `measureHeight` returns the wrapped height of the given string (injectable for tests).
 */
export function truncatePaperSlipNotesByHeight(
  text: string,
  measureHeight: (value: string) => number,
  maxHeightPx = PAPER_SLIP_NOTES_LINE_HEIGHT_PX * PAPER_SLIP_NOTES_MAX_LINES
): PaperSlipNotesTruncation {
  const normalized = normalizePaperSlipNote(text);
  if (!normalized) return { body: "", isTruncated: false };

  if (measureHeight(normalized) <= maxHeightPx) {
    return { body: normalized, isTruncated: false };
  }

  let low = 0;
  let high = normalized.length;
  let best = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const body = cutAtWordBoundary(normalized, mid);
    if (!body) {
      high = mid - 1;
      continue;
    }
    const candidate = `${body}${PAPER_SLIP_NOTES_OVERFLOW_SUFFIX}`;
    if (measureHeight(candidate) <= maxHeightPx) {
      best = body.length;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (best <= 0) {
    // Extreme narrow width: keep the shortest word-boundary prefix that still
    // fits with the suffix, otherwise show suffix alone is not useful — fall
    // back to a tiny body cut.
    const tiny = cutAtWordBoundary(normalized, Math.min(24, normalized.length));
    return { body: tiny, isTruncated: true };
  }

  return {
    body: cutAtWordBoundary(normalized, best),
    isTruncated: true,
  };
}

type NotesProbe = {
  measure: (value: string) => number;
  dispose: () => void;
};

function createNotesProbe(doc: Document): NotesProbe {
  const el = doc.createElement("div");
  el.setAttribute("data-paper-slip-notes-probe", "true");
  el.style.cssText = [
    "position:absolute",
    "left:-99999px",
    "top:0",
    "visibility:hidden",
    "pointer-events:none",
    "box-sizing:border-box",
    `width:${PAPER_SLIP_NOTES_PROBE_WIDTH_PX}px`,
    `font:15px/${PAPER_SLIP_NOTES_LINE_HEIGHT_PX}px Arial, Helvetica, sans-serif`,
    "white-space:normal",
    "word-wrap:break-word",
    "overflow-wrap:break-word",
  ].join(";");
  doc.body.appendChild(el);

  return {
    measure(value: string) {
      el.textContent = value;
      return el.scrollHeight;
    },
    dispose() {
      el.remove();
    },
  };
}

/**
 * Measure real wrap with a DOM probe matching `.ps-notes`, then truncate so
 * body + plain suffix fit in 3 lines. Falls back to char budget without `doc`.
 */
export function measureTruncatePaperSlipNotes(
  text: string,
  doc?: Document | null
): PaperSlipNotesTruncation {
  if (!doc?.body) {
    return truncatePaperSlipNotes(text);
  }

  const probe = createNotesProbe(doc);
  try {
    return truncatePaperSlipNotesByHeight(text, probe.measure);
  } finally {
    probe.dispose();
  }
}

/**
 * Final printable note string (body, or body + plain overflow suffix).
 * Uses DOM measurement when `doc` is provided; otherwise char-budget fallback.
 */
export function formatPaperSlipNotesForPrint(
  text: string,
  doc?: Document | null
): string {
  const { body, isTruncated } = measureTruncatePaperSlipNotes(text, doc);
  if (!body) return "";
  return isTruncated ? `${body}${PAPER_SLIP_NOTES_OVERFLOW_SUFFIX}` : body;
}

/** Limit printable notes to `maxWords` words, appending `...` when truncated. */
export function truncateTextToMaxWords(text: string, maxWords = 100): string {
  const normalized = text.replace(/\r\n/g, "\n").trimEnd();
  if (!normalized) return "";

  // Split on whitespace but keep the separators so newlines/indentation survive.
  const tokens = normalized.split(/(\s+)/);
  let words = 0;
  let lastKeptToken = -1;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token || /^\s+$/.test(token)) continue;
    words += 1;
    if (words === maxWords) {
      lastKeptToken = index;
      break;
    }
  }

  if (lastKeptToken === -1) return normalized;

  const kept = tokens.slice(0, lastKeptToken + 1).join("");
  return kept.length === normalized.length ? normalized : `${kept}...`;
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
