import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveLatestSlipNoteText,
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
