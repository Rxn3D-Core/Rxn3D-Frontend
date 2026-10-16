import assert from "node:assert/strict";
import test from "node:test";
import {
  isHydratedProductApiData,
  resolveAddedCardProductData,
  resolveAddedCardRepTooth,
  resolveCardFieldValue,
  resolveCardImpressionText,
  resolveRemovableProgressTooth,
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

test("resolveRemovableProgressTooth keeps tooth that already has stage when lower tooth joins", () => {
  const values = new Map([
    [25, { stage: "Final" }],
    [20, {}],
  ]);
  const completed = new Map([[25, new Set(["stage"])]]);
  const tn = resolveRemovableProgressTooth(
    [20, 25, 27, 28],
    "mandibular",
    3,
    (_arch, tooth, step) => completed.get(tooth)?.has(step) === true,
    (_arch, tooth, step) => values.get(tooth)?.[step] ?? "",
    { mandibular_prep_25: "Final" }
  );
  assert.equal(tn, 25);
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

test("resolveRemovableProgressTooth stays on the tooth with grade/stage when a lower tooth only gets impression", () => {
  // Full-denture card binds the whole arch (17-32) but the slip preloads grade/stage/shade
  // only on its own teeth. Impression then lands on the lowest bound tooth (17).
  const archTeeth = Array.from({ length: 16 }, (_, i) => 17 + i);
  const completed = new Map([
    [17, new Set(["impression"])],
    [18, new Set(["grade", "stage", "teeth_shade"])],
    [19, new Set(["grade", "stage", "teeth_shade"])],
  ]);
  const values = new Map([
    [17, { impression: "No Impression" }],
    [18, { grade: "Mid Grade", stage: "Try-in" }],
  ]);
  const tn = resolveRemovableProgressTooth(
    archTeeth,
    "mandibular",
    1,
    (_arch, tooth, step) => completed.get(tooth)?.has(step) === true,
    (_arch, tooth, step) => values.get(tooth)?.[step] ?? "",
    { mandibular_prep_18: "Try-in", mandibular_prep_19: "Try-in" }
  );
  assert.equal(tn, 18);
});

test("resolveRemovableProgressTooth still picks the lowest tooth when progress is equal", () => {
  const completed = new Map([
    [18, new Set(["grade", "stage"])],
    [19, new Set(["grade", "stage"])],
  ]);
  const tn = resolveRemovableProgressTooth(
    [19, 18, 17],
    "mandibular",
    1,
    (_arch, tooth, step) => completed.get(tooth)?.has(step) === true,
    () => ""
  );
  assert.equal(tn, 18);
});

test("resolveCardImpressionText reads No Impression from the card tooth that holds it", () => {
  // Impression is saved on the lowest tooth bound to the card (17) while the field
  // tooth is 18 — the "No Impression" label must still show.
  const completed = new Map([[17, new Set(["impression"])]]);
  const values = new Map([[17, { impression: "No Impression" }]]);
  const text = resolveCardImpressionText(
    "mandibular",
    1,
    [17, 18, 19],
    18,
    (_arch, tooth, step) => completed.get(tooth)?.has(step) === true,
    (_arch, tooth, step) => values.get(tooth)?.[step] ?? ""
  );
  assert.equal(text, "No Impression");
});

test("resolveCardImpressionText ignores stale text on teeth whose impression was un-completed", () => {
  const completed = new Map([[17, new Set(["impression"])]]);
  const values = new Map([
    [17, { impression: "No Impression" }],
    [18, { impression: "1x PVS" }],
  ]);
  const text = resolveCardImpressionText(
    "mandibular",
    1,
    [17, 18, 19],
    18,
    (_arch, tooth, step) => completed.get(tooth)?.has(step) === true,
    (_arch, tooth, step) => values.get(tooth)?.[step] ?? ""
  );
  assert.equal(text, "No Impression");
});

test("resolveCardImpressionText is empty when no tooth has a completed impression", () => {
  const text = resolveCardImpressionText(
    "mandibular",
    1,
    [17, 18],
    18,
    () => false,
    () => ""
  );
  assert.equal(text, "");
});
