import test from "node:test";
import assert from "node:assert/strict";

import { getRemovableRepTeeth, getCard0RepTooth } from "./removableReadiness.ts";

test("ignores unselected sentinel teeth when resolving removable representative teeth", () => {
  const repTeeth = getRemovableRepTeeth({
    allTeeth: [1, 8, 9],
    selectedTeeth: [8, 9],
    getToothProduct: (_arch, tooth) => (tooth === 1 || tooth === 8 || tooth === 9 ? { id: 10 } : null),
    getToothProductCard: (_arch, _tooth) => 0,
    arch: "maxillary",
  });

  assert.deepEqual(repTeeth, [8]);
});

test("falls back to any assigned tooth when no selected removable teeth exist yet", () => {
  const repTeeth = getRemovableRepTeeth({
    allTeeth: [1],
    selectedTeeth: [],
    getToothProduct: (_arch, tooth) => (tooth === 1 ? { id: 10 } : null),
    getToothProductCard: (_arch, _tooth) => 0,
    arch: "maxillary",
  });

  assert.deepEqual(repTeeth, [1]);
});

test("card 0 rep tooth prefers a selected removable tooth over sentinel", () => {
  const repTooth = getCard0RepTooth({
    allTeeth: [1, 8, 9],
    selectedTeeth: [8, 9],
    getToothProduct: (_arch, tooth) => (tooth === 1 || tooth === 8 || tooth === 9 ? { id: 10 } : null),
    getToothProductCard: (_arch, _tooth) => 0,
    arch: "maxillary",
  });

  assert.equal(repTooth, 8);
});
