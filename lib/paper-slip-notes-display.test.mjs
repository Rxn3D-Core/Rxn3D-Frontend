import assert from "node:assert/strict";
import test from "node:test";

import { truncateTextToMaxLines } from "./paper-slip-notes-display.ts";

test("truncateTextToMaxLines keeps short notes unchanged", () => {
  const note = "Line one\nLine two";
  assert.equal(truncateTextToMaxLines(note, 4), note);
});

test("truncateTextToMaxLines caps at four lines and appends ellipsis line", () => {
  const note = "a\nb\nc\nd\ne\nf";
  assert.equal(truncateTextToMaxLines(note, 4), "a\nb\nc\nd\n...");
});
