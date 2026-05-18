import test from "node:test";
import assert from "node:assert/strict";

import {
  getCardRepresentativeTooth,
  getPrimaryCardRepresentativeTooth,
  getRepresentativeTeethByCard,
} from "./productSelectionReadiness.ts";

test("ignores unselected sentinel teeth when resolving representative teeth", () => {
  const representativeTeeth = getRepresentativeTeethByCard({
    allTeeth: [1, 8, 9],
    selectedTeeth: [8, 9],
    getToothProduct: (_arch, tooth) => (tooth === 1 || tooth === 8 || tooth === 9 ? { id: 10 } : null),
    getToothProductCard: (_arch, _tooth) => 0,
    arch: "maxillary",
  });

  assert.deepEqual(representativeTeeth, [8]);
});

test("falls back to any assigned tooth when no selected teeth exist yet", () => {
  const representativeTeeth = getRepresentativeTeethByCard({
    allTeeth: [1],
    selectedTeeth: [],
    getToothProduct: (_arch, tooth) => (tooth === 1 ? { id: 10 } : null),
    getToothProductCard: (_arch, _tooth) => 0,
    arch: "maxillary",
  });

  assert.deepEqual(representativeTeeth, [1]);
});

test("card representative tooth uses lowest assigned tooth on the card", () => {
  const representativeTooth = getCardRepresentativeTooth({
    allTeeth: [17, 26, 27, 28],
    cardId: 0,
    getToothProduct: (_arch, tooth) => (tooth === 17 || tooth === 26 ? { id: 10 } : null),
    getToothProductCard: (_arch, _tooth) => 0,
    arch: "mandibular",
  });

  assert.equal(representativeTooth, 17);
});

test("primary card representative tooth prefers a selected tooth over sentinel", () => {
  const representativeTooth = getPrimaryCardRepresentativeTooth({
    allTeeth: [1, 8, 9],
    selectedTeeth: [8, 9],
    getToothProduct: (_arch, tooth) => (tooth === 1 || tooth === 8 || tooth === 9 ? { id: 10 } : null),
    getToothProductCard: (_arch, _tooth) => 0,
    arch: "maxillary",
  });

  assert.equal(representativeTooth, 8);
});
