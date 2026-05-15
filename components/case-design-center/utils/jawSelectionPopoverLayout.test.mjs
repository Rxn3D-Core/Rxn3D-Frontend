import test from "node:test";
import assert from "node:assert/strict";

import { getJawSelectionPopoverInsets } from "./jawSelectionPopoverLayout.ts";

test("positions the jaw popover below the title row and inside the card border", () => {
  assert.deepEqual(getJawSelectionPopoverInsets(28), {
    top: 31,
    right: 3,
    bottom: 3,
    left: 3,
  });
});

test("clamps negative label heights so the popover never renders above the card", () => {
  assert.deepEqual(getJawSelectionPopoverInsets(-10), {
    top: 3,
    right: 3,
    bottom: 3,
    left: 3,
  });
});
