import test from "node:test";
import assert from "node:assert/strict";

import {
  archAllowsAccordionCollapse,
  archFromActiveAccordionKey,
  isOwnArchToothChartEnabled,
  productAccordionKey,
  resolveSoleProductCardIdOnArch,
} from "./productAccordionFocus.ts";

test("archFromActiveAccordionKey parses arch from accordion key", () => {
  assert.equal(archFromActiveAccordionKey(productAccordionKey("maxillary", "removable0")), "maxillary");
  assert.equal(archFromActiveAccordionKey(productAccordionKey("mandibular", "added:9")), "mandibular");
  assert.equal(archFromActiveAccordionKey(productAccordionKey("maxillary", "fixed0_42")), "maxillary");
  assert.equal(archFromActiveAccordionKey(""), null);
});

test("archAllowsAccordionCollapse is false with a single card-0 removable product", () => {
  assert.equal(
    archAllowsAccordionCollapse("maxillary", [], {
      hasRemovablesCard0: true,
      fixedCard0GroupCount: 0,
    }),
    false
  );
});

test("archAllowsAccordionCollapse is true with card 0 plus one added product", () => {
  assert.equal(
    archAllowsAccordionCollapse(
      "maxillary",
      [{ id: 1, arch: "maxillary", productId: 2, product: { id: 2, name: "X" } }],
      { hasRemovablesCard0: true, fixedCard0GroupCount: 0 }
    ),
    true
  );
});

test("resolveSoleProductCardIdOnArch: card 0 alone", () => {
  assert.equal(
    resolveSoleProductCardIdOnArch({
      arch: "maxillary",
      addedProducts: [],
      hasCard0OnArch: true,
    }),
    0
  );
});

test("resolveSoleProductCardIdOnArch: one added alone", () => {
  assert.equal(
    resolveSoleProductCardIdOnArch({
      arch: "mandibular",
      addedProducts: [{ id: 2, arch: "mandibular", productId: 9, product: { id: 9, name: "Y" } }],
      hasCard0OnArch: false,
    }),
    2
  );
});

test("resolveSoleProductCardIdOnArch: multi-product returns null", () => {
  assert.equal(
    resolveSoleProductCardIdOnArch({
      arch: "maxillary",
      addedProducts: [{ id: 1, arch: "maxillary", productId: 2, product: { id: 2, name: "X" } }],
      hasCard0OnArch: true,
    }),
    null
  );
});

test("isOwnArchToothChartEnabled matches panel arch to active accordion", () => {
  const key = productAccordionKey("maxillary", "removable0");
  assert.equal(isOwnArchToothChartEnabled("maxillary", key), true);
  assert.equal(isOwnArchToothChartEnabled("mandibular", key), false);
});
