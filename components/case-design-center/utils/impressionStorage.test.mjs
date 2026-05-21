import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyImpressionSelections,
  setArchImpressionQty,
  buildImpressionDisplayText,
  archHasImpressionSelections,
  migrateLegacyFlatImpressions,
  mirrorImpressionArch,
  archEntriesToCodeQtyMap,
  isSlipImpressionSelections,
  mergeCatalogWithArchSelections,
  reconcileArchSelectionsWithCatalog,
  getArchImpressionQtyForOption,
} from "./impressionStorage.ts";

const alginate = {
  id: 10,
  code: "alginate",
  name: "Alginate",
  value: "alginate",
};

test("setArchImpressionQty adds and removes entries on an arch", () => {
  let s = emptyImpressionSelections();
  s = setArchImpressionQty(s, "maxillary", alginate, 2);
  assert.equal(s.maxillary.length, 1);
  assert.equal(s.maxillary[0].qty, 2);
  s = setArchImpressionQty(s, "maxillary", alginate, 0);
  assert.equal(s.maxillary.length, 0);
});

test("buildImpressionDisplayText formats arch lines", () => {
  let s = emptyImpressionSelections();
  s = setArchImpressionQty(s, "mandibular", { ...alginate, id: 11, code: "pvs", name: "PVS", value: "pvs" }, 1);
  assert.equal(buildImpressionDisplayText(s, "mandibular"), "1x PVS");
});

test("migrateLegacyFlatImpressions groups by arch and code", () => {
  const flat = {
    "1_maxillary_alginate": 2,
    "2_maxillary_alginate": 3,
    "0_mandibular_pvs": 1,
  };
  const s = migrateLegacyFlatImpressions(flat);
  assert.equal(s.maxillary.length, 1);
  assert.equal(s.maxillary[0].code, "alginate");
  assert.equal(s.maxillary[0].qty, 3);
  assert.equal(s.mandibular[0].qty, 1);
});

test("mirrorImpressionArch copies only when target is empty", () => {
  let s = emptyImpressionSelections();
  s = setArchImpressionQty(s, "maxillary", alginate, 1);
  const mirrored = mirrorImpressionArch(s, "maxillary", "mandibular");
  assert.ok(mirrored);
  assert.equal(mirrored.mandibular[0].code, "alginate");
  const noMirror = mirrorImpressionArch(mirrored, "maxillary", "mandibular");
  assert.equal(noMirror, null);
});

test("archEntriesToCodeQtyMap for submit snapshots", () => {
  const map = archEntriesToCodeQtyMap([
    { impression_id: 1, code: "a", name: "A", qty: 2 },
  ]);
  assert.deepEqual(map, { a: 2 });
});

test("isSlipImpressionSelections detects arch arrays", () => {
  assert.ok(isSlipImpressionSelections(emptyImpressionSelections()));
  assert.ok(!isSlipImpressionSelections({ "1_maxillary_x": 1 }));
});

test("archHasImpressionSelections", () => {
  assert.equal(archHasImpressionSelections(emptyImpressionSelections(), "maxillary"), false);
  let s = setArchImpressionQty(emptyImpressionSelections(), "maxillary", alginate, 1);
  assert.equal(archHasImpressionSelections(s, "maxillary"), true);
});

test("mergeCatalogWithArchSelections keeps selections when catalog is empty", () => {
  let s = emptyImpressionSelections();
  s = setArchImpressionQty(s, "mandibular", alginate, 1);
  const merged = mergeCatalogWithArchSelections([], s.mandibular);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].code, "alginate");
});

test("reconcileArchSelectionsWithCatalog updates ids without dropping qty", () => {
  let s = emptyImpressionSelections();
  s = {
    ...s,
    maxillary: [
      { impression_id: 0, code: "alginate", name: "Alginate", qty: 2 },
    ],
  };
  const catalog = [{ id: 99, code: "alginate", name: "Alginate", value: "alginate" }];
  const next = reconcileArchSelectionsWithCatalog(s, "maxillary", catalog);
  assert.equal(next.maxillary[0].impression_id, 99);
  assert.equal(next.maxillary[0].qty, 2);
});

test("getArchImpressionQtyForOption matches by name when code differs", () => {
  let s = emptyImpressionSelections();
  s = {
    ...s,
    mandibular: [
      { impression_id: 1, code: "legacy_alg", name: "Alginate", qty: 1 },
    ],
  };
  const qty = getArchImpressionQtyForOption(s, "mandibular", {
    id: 2,
    code: "alginate",
    name: "Alginate",
    value: "alginate",
  });
  assert.equal(qty, 1);
});
