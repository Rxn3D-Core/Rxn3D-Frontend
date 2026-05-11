import test from "node:test";
import assert from "node:assert/strict";

import { shouldUseFixedRetentionMode } from "./activeFixedPopoverMode.ts";

test("uses fixed retention mode for added fixed cards", () => {
  assert.equal(
    shouldUseFixedRetentionMode({
      activeProductCardId: 5,
      activeProductIsRemovables: false,
      activeFixedGroupProductId: null,
    }),
    true
  );
});

test("uses fixed retention mode for card-0 fixed groups", () => {
  assert.equal(
    shouldUseFixedRetentionMode({
      activeProductCardId: 0,
      activeProductIsRemovables: false,
      activeFixedGroupProductId: 101,
    }),
    true
  );
});

test("does not use fixed retention mode for removable cards", () => {
  assert.equal(
    shouldUseFixedRetentionMode({
      activeProductCardId: 9,
      activeProductIsRemovables: true,
      activeFixedGroupProductId: null,
    }),
    false
  );
});

test("does not use fixed retention mode for plain card-0 without a fixed group", () => {
  assert.equal(
    shouldUseFixedRetentionMode({
      activeProductCardId: 0,
      activeProductIsRemovables: false,
      activeFixedGroupProductId: null,
    }),
    false
  );
});
