import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveLatestSlipNoteText,
  truncateTextToMaxLines,
} from "./paper-slip-notes-display.ts";

test("truncateTextToMaxLines keeps short notes unchanged", () => {
  const note = "Line one\nLine two";
  assert.equal(truncateTextToMaxLines(note, 4), note);
});

test("truncateTextToMaxLines caps at four lines and appends ellipsis line", () => {
  const note = "a\nb\nc\nd\ne\nf";
  assert.equal(truncateTextToMaxLines(note, 4), "a\nb\nc\nd\n...");
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
