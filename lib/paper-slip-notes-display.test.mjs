import assert from "node:assert/strict";
import test from "node:test";

import {
  PAPER_SLIP_NOTES_OVERFLOW_SUFFIX,
  formatPaperSlipNotesForPrint,
  resolveLatestSlipNoteText,
  truncatePaperSlipNotes,
  truncatePaperSlipNotesByHeight,
  truncateTextToMaxLines,
  truncateTextToMaxWords,
} from "./paper-slip-notes-display.ts";

test("truncateTextToMaxLines keeps short notes unchanged", () => {
  const note = "Line one\nLine two";
  assert.equal(truncateTextToMaxLines(note, 4), note);
});

test("truncateTextToMaxLines caps at four lines and appends ellipsis line", () => {
  const note = "a\nb\nc\nd\ne\nf";
  assert.equal(truncateTextToMaxLines(note, 4), "a\nb\nc\nd\n...");
});

test("truncatePaperSlipNotes keeps short notes unchanged", () => {
  const note = "Shade A2 try-in with teeth";
  assert.deepEqual(truncatePaperSlipNotes(note), {
    body: note,
    isTruncated: false,
  });
});

test("truncatePaperSlipNotes stops near 2.5 lines so suffix fits on the same line", () => {
  const note =
    "Please fabricate Mid Grade Metal Frame Acrylic for #2, #4, #5, #6, #7, #8, #9, #10, #12, #13, #14, #15 and Mid Grade Full Denture Acrylic for Try in with teeth, shade Vita Classical A2. scans sent for both duplicating existing upd and lower full dentures with and without dentures his current lower ones are loose and missing a tooth or and";
  const charsPerLine = 64;
  const truncated = truncatePaperSlipNotes(note, 3, charsPerLine);

  assert.equal(truncated.isTruncated, true);
  assert.ok(truncated.body.length > 0);
  assert.ok(!truncated.body.includes("missing a tooth"));
  assert.ok(truncated.body.length <= Math.floor(charsPerLine * 2.5));
  assert.ok(
    truncated.body.length + PAPER_SLIP_NOTES_OVERFLOW_SUFFIX.length <=
      3 * charsPerLine
  );
});

test("truncatePaperSlipNotes flattens newlines before measuring wrap budget", () => {
  const note = "line one\nline two\nline three\nline four that continues past the budget";
  const truncated = truncatePaperSlipNotes(note, 1, 40);

  assert.equal(truncated.isTruncated, true);
  assert.equal(truncated.body.includes("\n"), false);
});

test("truncatePaperSlipNotesByHeight keeps short notes when measure says they fit", () => {
  const note = "Shade A2 try-in with teeth";
  const result = truncatePaperSlipNotesByHeight(note, () => 18, 54);
  assert.deepEqual(result, { body: note, isTruncated: false });
});

test("truncatePaperSlipNotesByHeight binary-searches so body plus suffix fits", () => {
  const note =
    "Please fabricate Mid Grade Metal Frame Acrylic for many teeth and then continue with a much longer instruction that clearly exceeds three printed lines of the notes box on the paper slip";
  // ~40 chars per wrap line at this fake width.
  const measureHeight = (value) => Math.ceil(value.length / 40) * 18;
  const result = truncatePaperSlipNotesByHeight(note, measureHeight, 54);

  assert.equal(result.isTruncated, true);
  assert.ok(result.body.length > 0);
  assert.ok(measureHeight(`${result.body}${PAPER_SLIP_NOTES_OVERFLOW_SUFFIX}`) <= 54);
  assert.ok(measureHeight(note) > 54);
});

test("formatPaperSlipNotesForPrint appends plain suffix without a badge", () => {
  const note = Array.from({ length: 80 }, (_, i) => `word${i + 1}`).join(" ");
  const formatted = formatPaperSlipNotesForPrint(note, null);

  assert.ok(formatted.endsWith(PAPER_SLIP_NOTES_OVERFLOW_SUFFIX));
  assert.equal(formatted.includes("ps-notes-badge"), false);
  assert.equal(formatted.includes("<span"), false);
});

test("truncateTextToMaxWords keeps notes at or under the limit unchanged", () => {
  const note = "Shade A2 with cutback on the incisal third";
  assert.equal(truncateTextToMaxWords(note, 100), note);
  assert.equal(truncateTextToMaxWords("one two three", 3), "one two three");
});

test("truncateTextToMaxWords caps at the word limit and appends ellipsis", () => {
  const note = Array.from({ length: 120 }, (_, i) => `word${i + 1}`).join(" ");
  const truncated = truncateTextToMaxWords(note, 100);

  assert.ok(truncated.endsWith("word100..."));
  assert.equal(truncated.split(/\s+/).length, 100);
});

test("truncateTextToMaxWords preserves line breaks within the kept words", () => {
  assert.equal(truncateTextToMaxWords("one two\nthree four", 3), "one two\nthree...");
});

test("resolveLatestSlipNoteText returns empty for missing notes", () => {
  assert.equal(resolveLatestSlipNoteText(undefined), "");
  assert.equal(resolveLatestSlipNoteText([]), "");
});

test("resolveLatestSlipNoteText picks the note with the newest created_at", () => {
  const latest = resolveLatestSlipNoteText([
    { id: 1, note: "Older note", created_at: "2026-01-01T10:00:00.000Z" },
    { id: 2, note: "Latest note", created_at: "2026-06-01T10:00:00.000Z" },
    { id: 3, note: "Middle note", created_at: "2026-03-01T10:00:00.000Z" },
  ]);
  assert.equal(latest, "Latest note");
});

test("resolveLatestSlipNoteText uses last array entry when timestamps are absent", () => {
  const latest = resolveLatestSlipNoteText([
    { note: "First note" },
    { note: "Most recent note" },
  ]);
  assert.equal(latest, "Most recent note");
});
