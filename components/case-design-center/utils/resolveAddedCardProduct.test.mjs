import assert from "node:assert/strict";
import test from "node:test";
import {
  isHydratedProductApiData,
  resolveAddedCardProductData,
  resolveAddedCardRepTooth,
  resolveCardFieldValue,
} from "./resolveAddedCardProduct.ts";

test("resolveAddedCardRepTooth uses virtual slot when card has no teeth", () => {
  const tn = resolveAddedCardRepTooth([], 42, () => null, "maxillary");
  assert.equal(tn, -42);
});

test("resolveAddedCardRepTooth prefers tooth with loaded product", () => {
  const products = new Map([[4, { id: 1 }], [7, null]]);
  const tn = resolveAddedCardRepTooth(
    [7, 4],
    42,
    (_arch, tooth) => products.get(tooth) ?? null,
    "maxillary"
  );
  assert.equal(tn, 4);
});

test("isHydratedProductApiData rejects wizard stub, accepts full API payload", () => {
  assert.equal(
    isHydratedProductApiData({
      id: 1,
      extractions: [{ code: "MT" }],
      retention_options: [{}],
    }),
    false
  );
  assert.equal(
    isHydratedProductApiData({
      id: 1,
      advance_fields: [{ id: 1, name: "Base Shade", field_type: "dropdown" }],
    }),
    true
  );
});

test("resolveAddedCardProductData falls back to virtual slot", () => {
  const virtual = { id: 99, advance_fields: [{ id: 1, name: "Margin" }] };
  const p = resolveAddedCardProductData(
    "maxillary",
    5,
    [],
    (arch, tooth) => (tooth === -5 ? virtual : null),
    { id: 1, name: "stub" }
  );
  assert.equal(p?.id, 99);
  assert.equal(p?.advance_fields?.length, 1);
});

test("resolveCardFieldValue finds stage on virtual slot when rep tooth is empty", () => {
  const stageJson = '{"stage_id":13,"name":"Custom Trays"}';
  const values = new Map([
    ["maxillary_0", { stage: stageJson }],
    ["maxillary_8", {}],
  ]);
  const val = resolveCardFieldValue(
    "maxillary",
    0,
    [8, 9, 10],
    8,
    "stage",
    (_arch, tooth, step) => values.get(`maxillary_${tooth}`)?.[step] ?? ""
  );
  assert.equal(val, stageJson);
});
