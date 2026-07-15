/** Known product categories emitted by `caseNoteBuilder.buildSectionText`. */
export const CASE_NOTE_CATEGORIES = [
  "Fixed Restoration",
  "Removable",
  "Orthodontic",
] as const;

const COMPACT_LINE_RE =
  /^(MAXILLARY|MANDIBULAR)\s*\(([^)]+)\)\s*—\s*(.+)$/i;

const ARCH_HEADER_RE = /^(MAXILLARY|MANDIBULAR)\s*$/i;

function archLabel(arch: "maxillary" | "mandibular"): "MAXILLARY" | "MANDIBULAR" {
  return arch === "maxillary" ? "MAXILLARY" : "MANDIBULAR";
}

/** One compact case-summary line: `MAXILLARY (Removable) — Please fabricate…` */
export function buildCompactCaseSummaryLine(
  arch: "maxillary" | "mandibular",
  category: string,
  note: string,
): string {
  const label = archLabel(arch);
  const trimmed = note.trim();
  return trimmed ? `${label} (${category}) — ${trimmed}` : `${label} (${category}) —`;
}

export function isCompactCaseSummaryLine(line: string): boolean {
  return COMPACT_LINE_RE.test(line.trim());
}

function compactLegacyArchBody(body: string): string {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const categorySet = new Set<string>(CASE_NOTE_CATEGORIES);
  const result: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (categorySet.has(line)) {
      index += 1;
      const noteParts: string[] = [];
      while (index < lines.length && !categorySet.has(lines[index])) {
        noteParts.push(lines[index]);
        index += 1;
      }
      result.push(noteParts.join(" "));
      continue;
    }

    result.push(lines.slice(index).join(" "));
    break;
  }

  return result.join("\n");
}

function stripCompactArchPrefix(line: string): string {
  const match = line.match(COMPACT_LINE_RE);
  return match ? match[3].trim() : line;
}

function splitCombinedCaseSummaryNotes(text: string): {
  maxillaryRaw: string;
  mandibularRaw: string;
} {
  const mandibularMatch = text.match(/\n\s*MANDIBULAR(?:\s|\(|$)/i);
  if (mandibularMatch?.index != null) {
    return {
      maxillaryRaw: text.slice(0, mandibularMatch.index).trim(),
      mandibularRaw: text.slice(mandibularMatch.index).trim(),
    };
  }

  if (/^\s*MANDIBULAR(?:\s|\(|$)/i.test(text)) {
    return { maxillaryRaw: "", mandibularRaw: text.trim() };
  }

  return { maxillaryRaw: text.trim(), mandibularRaw: "" };
}

function stripArchHeader(raw: string, arch: "MAXILLARY" | "MANDIBULAR"): string {
  return raw.replace(new RegExp(`^\\s*${arch}\\s*\\n?`, "i"), "").trim();
}

/** Collapse legacy multi-line arch blocks into compact one-liners for slip display. */
export function formatCaseSummaryNotesForDisplay(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const nonEmptyLines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  if (
    nonEmptyLines.length > 0 &&
    nonEmptyLines.every(
      (line) =>
        isCompactCaseSummaryLine(line) ||
        (!ARCH_HEADER_RE.test(line) && !CASE_NOTE_CATEGORIES.includes(line as (typeof CASE_NOTE_CATEGORIES)[number])),
    ) &&
    !nonEmptyLines.some((line) => ARCH_HEADER_RE.test(line))
  ) {
    return nonEmptyLines.map(stripCompactArchPrefix).join("\n\n");
  }

  const upper = trimmed.toUpperCase();
  if (!upper.includes("MAXILLARY") && !upper.includes("MANDIBULAR")) {
    return trimmed;
  }

  const { maxillaryRaw, mandibularRaw } = splitCombinedCaseSummaryNotes(trimmed);
  const parts: string[] = [];

  if (maxillaryRaw) {
    if (isCompactCaseSummaryLine(maxillaryRaw.split("\n")[0]?.trim() ?? "")) {
      parts.push(
        ...maxillaryRaw
          .split("\n")
          .map((line) => stripCompactArchPrefix(line.trim()))
          .filter(Boolean),
      );
    } else {
      const body = stripArchHeader(maxillaryRaw, "MAXILLARY");
      if (body) parts.push(compactLegacyArchBody(body));
    }
  }

  if (mandibularRaw) {
    const firstLine = mandibularRaw.split("\n")[0]?.trim() ?? "";
    if (isCompactCaseSummaryLine(firstLine)) {
      parts.push(
        ...mandibularRaw
          .split("\n")
          .map((line) => stripCompactArchPrefix(line.trim()))
          .filter(Boolean),
      );
    } else {
      const body = stripArchHeader(mandibularRaw, "MANDIBULAR");
      if (body) parts.push(compactLegacyArchBody(body));
    }
  }

  return parts.filter(Boolean).join("\n\n");
}

/** Arch body for split Maxillary / Mandibular editors (without arch prefix). */
export function getCaseSummaryArchContent(
  notes: string,
  arch: "maxillary" | "mandibular",
): string {
  const trimmed = notes.trim();
  if (!trimmed) return "";

  const label = archLabel(arch);
  const { maxillaryRaw, mandibularRaw } = splitCombinedCaseSummaryNotes(trimmed);
  const raw = arch === "maxillary" ? maxillaryRaw : mandibularRaw;
  if (!raw) return "";

  const compactLines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (compactLines.every((line) => isCompactCaseSummaryLine(line))) {
    return compactLines.map(stripCompactArchPrefix).filter(Boolean).join("\n");
  }

  if (
    compactLines.every(
      (line) =>
        !ARCH_HEADER_RE.test(line) &&
        !CASE_NOTE_CATEGORIES.includes(line as (typeof CASE_NOTE_CATEGORIES)[number]),
    )
  ) {
    return compactLines.join("\n");
  }

  return stripArchHeader(raw, label);
}

export function isCaseSummaryArchHeaderLine(line: string): boolean {
  return ARCH_HEADER_RE.test(line.trim()) || isCompactCaseSummaryLine(line);
}

/** Expand a compact section into legacy `[category, …noteLines]` for note parsing. */
export function parseCompactSectionLines(lines: string[]): {
  arch: "maxillary" | "mandibular";
  lines: string[];
} | null {
  if (lines.length !== 1 || !isCompactCaseSummaryLine(lines[0])) return null;
  const match = lines[0].match(COMPACT_LINE_RE);
  if (!match) return null;
  const [, lineArch, category, note] = match;
  return {
    arch: lineArch.toUpperCase() === "MAXILLARY" ? "maxillary" : "mandibular",
    lines: [category, note.trim()],
  };
}

/** Rebuild combined notes from split Maxillary / Mandibular editor fields. */
export function rebuildCaseSummaryFromArchParts(
  maxillaryContent: string,
  mandibularContent: string,
): string {
  const toCompactLines = (
    arch: "maxillary" | "mandibular",
    content: string,
  ): string[] =>
    content
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        if (isCompactCaseSummaryLine(line)) return stripCompactArchPrefix(line);
        const match = line.match(/^(.+?)\s*—\s*(.+)$/);
        if (match) return match[2].trim();
        return line;
      });

  return [
    ...toCompactLines("maxillary", maxillaryContent),
    ...toCompactLines("mandibular", mandibularContent),
  ]
    .filter(Boolean)
    .join("\n\n");
}
