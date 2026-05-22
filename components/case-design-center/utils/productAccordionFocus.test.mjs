import test from "node:test";
import assert from "node:assert/strict";

import {
  archFromActiveAccordionKey,
  isOwnArchToothChartEnabled,
  productAccordionKey,
} from "./productAccordionFocus.ts";

test("archFromActiveAccordionKey parses arch from accordion key", () => {
  assert.equal(archFromActiveAccordionKey(productAccordionKey("maxillary", "removable0")), "maxillary");
  assert.equal(archFromActiveAccordionKey(productAccordionKey("mandibular", "added:9")), "mandibular");
  assert.equal(archFromActiveAccordionKey(productAccordionKey("maxillary", "fixed0_42")), "maxillary");
  assert.equal(archFromActiveAccordionKey(""), null);
});

test("isOwnArchToothChartEnabled matches panel arch to active accordion", () => {
  const key = productAccordionKey("maxillary", "removable0");
  assert.equal(isOwnArchToothChartEnabled("maxillary", key), true);
  assert.equal(isOwnArchToothChartEnabled("mandibular", key), false);
});
