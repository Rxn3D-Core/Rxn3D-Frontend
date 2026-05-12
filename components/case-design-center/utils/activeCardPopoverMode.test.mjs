import test from "node:test";
import assert from "node:assert/strict";

import { shouldUseScopedRetentionMode } from "./activeCardPopoverMode.ts";

test("uses scoped retention mode for added non-removable cards", () => {
  assert.equal(
    shouldUseScopedRetentionMode({
      activeProductCardId: 5,
      activeProductIsRemovables: false,
      activeFixedGroupProductId: null,
    }),
    true
  );
});

test("uses scoped retention mode for card-0 grouped products", () => {
  assert.equal(
    shouldUseScopedRetentionMode({
      activeProductCardId: 0,
      activeProductIsRemovables: false,
      activeFixedGroupProductId: 101,
    }),
    true
  );
});

test("does not use scoped retention mode for removable cards", () => {
  assert.equal(
    shouldUseScopedRetentionMode({
      activeProductCardId: 9,
      activeProductIsRemovables: true,
      activeFixedGroupProductId: null,
    }),
    false
  );
});

test("does not use scoped retention mode for plain card 0 without a grouped product", () => {
  assert.equal(
    shouldUseScopedRetentionMode({
      activeProductCardId: 0,
      activeProductIsRemovables: false,
      activeFixedGroupProductId: null,
    }),
    false
  );
});
