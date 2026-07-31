import test from "node:test";
import assert from "node:assert/strict";
import {
  findAddedProductByCardId,
  resolveActiveAddedProductOnArch,
  resolveAddedCardProduct,
  resolveAddedCardExtractions,
  resolveAddedFixedCardHeaderTeeth,
} from "./addedProductCardHelpers.ts";

const MAX = [1, 2, 3, 4];

test("findAddedProductByCardId ignores card 0", () => {
  assert.equal(
    findAddedProductByCardId([{ id: 1, arch: "maxillary", product: {}, expanded: true }], 0),
    undefined
  );
});

test("resolveActiveAddedProductOnArch filters by arch", () => {
  const list = [
    { id: 1, arch: "maxillary", product: { id: 10 }, expanded: true },
    { id: 2, arch: "mandibular", product: { id: 20 }, expanded: true },
  ];
  assert.equal(resolveActiveAddedProductOnArch(list, 1, "maxillary")?.id, 1);
  assert.equal(resolveActiveAddedProductOnArch(list, 1, "mandibular"), undefined);
  assert.equal(resolveActiveAddedProductOnArch(list, 2, "mandibular")?.id, 2);
});

test("resolveAddedCardProduct prefers tooth then virtual then stub", () => {
  const ap = {
    id: 2,
    arch: "maxillary",
    product: { id: 99, name: "stub" },
    expanded: true,
  };
  const byTooth = new Map([
    ["maxillary_-2", { id: 50, name: "virtual" }],
    ["maxillary_3", { id: 50, name: "on-tooth" }],
  ]);
  const getToothProduct = (arch, tn) => byTooth.get(`${arch}_${tn}`) ?? null;
  const getToothProductCard = (_arch, tn) => (tn === 3 ? 2 : 0);

  assert.equal(
    resolveAddedCardProduct("maxillary", ap, MAX, getToothProduct, getToothProductCard)?.name,
    "on-tooth"
  );

  const getCardEmpty = () => 0;
  assert.equal(
    resolveAddedCardProduct("maxillary", ap, MAX, getToothProduct, getCardEmpty)?.name,
    "virtual"
  );
});

test("resolveAddedCardExtractions falls back to stub", () => {
  const extractions = [{ extraction_id: 1, code: "MT", name: "Missing", status: "Active" }];
  const ap = {
    id: 1,
    arch: "maxillary",
    product: { id: 9, extractions },
    expanded: true,
  };
  assert.deepEqual(
    resolveAddedCardExtractions(
      "maxillary",
      ap,
      MAX,
      () => null,
      () => 0
    ),
    extractions
  );
});

test("resolveAddedFixedCardHeaderTeeth unions owned with chart teeth", () => {
  assert.deepEqual(
    resolveAddedFixedCardHeaderTeeth({
      assignedTeeth: [3, 6],
      defaultChartProductTeeth: [1, 2, 3, 4, 5, 6, 7, 8],
    }),
    [1, 2, 3, 4, 5, 6, 7, 8]
  );
  assert.deepEqual(
    resolveAddedFixedCardHeaderTeeth({
      assignedTeeth: [3, 6],
    }),
    [3, 6]
  );
});
