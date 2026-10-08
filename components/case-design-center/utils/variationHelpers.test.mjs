import assert from "node:assert/strict";
import test from "node:test";

import { resolveVariationId } from "./variationHelpers.ts";

const flipperVariations = [
  { id: 1274, sort_order: 1, teeth_spec: "1" },
  { id: 1276, sort_order: 3, teeth_spec: "3" },
  { id: 1288, sort_order: 15, teeth_spec: "15" },
];

const rangeVariation = [{ id: 1290, sort_order: 1, teeth_spec: "1-16" }];

test("resolves variation id from teeth count when has_variation is Yes", () => {
  const id = resolveVariationId(
    { has_variation: "Yes", variations: flipperVariations },
    3
  );
  assert.equal(id, 1276);
});

test("resolves variation id when variations exist but has_variation is omitted", () => {
  const id = resolveVariationId({ variations: rangeVariation }, 1);
  assert.equal(id, 1290);
});

test("does not send a variation id without a teeth match", () => {
  const id = resolveVariationId(
    { has_variation: "Yes", variations: flipperVariations },
    16
  );
  assert.equal(id, undefined);
});

test("does not send a variation id when the product has no variations", () => {
  const id = resolveVariationId({ has_variation: "No", variations: [] }, 2);
  assert.equal(id, undefined);
});

test("does not send a variation id when has_variation is No even if leftover rows exist", () => {
  const id = resolveVariationId(
    { has_variation: "No", variations: flipperVariations },
    3
  );
  assert.equal(id, undefined);
});
