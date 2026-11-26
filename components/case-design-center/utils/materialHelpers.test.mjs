import assert from "node:assert/strict";
import test from "node:test";

import {
  getSelectableMaterials,
  isArchMaterialMissing,
  resolveSelectedMaterial,
  serializeMaterialFieldValue,
} from "./materialHelpers.ts";

const zirconia = { id: 1, material_id: 1, name: "Zirconia", status: "Active" };
const emax = { id: 2, name: "E.max", status: "Active" };
const retired = { id: 3, name: "Gold", status: "Inactive" };
const product = (materials, extra = {}) => ({ id: 10, has_material: "Yes", materials, ...extra });

test("no materials are offered when Material is off or none are linked", () => {
  assert.deepEqual(getSelectableMaterials(product([zirconia], { has_material: "No" })), []);
  assert.deepEqual(getSelectableMaterials(product([])), []);
  assert.deepEqual(getSelectableMaterials(product([retired])), []);
  assert.deepEqual(getSelectableMaterials(null), []);
});

test("only Active linked materials are offered", () => {
  assert.deepEqual(
    getSelectableMaterials(product([zirconia, emax, retired])).map((m) => m.material_id),
    [1, 2]
  );
});

test("a single material or the default one is selected automatically", () => {
  assert.equal(resolveSelectedMaterial(product([emax]), "")?.material_id, 2);
  assert.equal(resolveSelectedMaterial(product([zirconia, emax]), ""), undefined);
  assert.equal(
    resolveSelectedMaterial(product([zirconia, { ...emax, is_default: "Yes" }]), "")?.material_id,
    2
  );
});

test("the stored choice wins, by id or by name", () => {
  const p = product([zirconia, { ...emax, is_default: "Yes" }]);
  assert.equal(resolveSelectedMaterial(p, serializeMaterialFieldValue({ material_id: 1, name: "x" }))?.material_id, 1);
  assert.equal(resolveSelectedMaterial(p, "Zirconia")?.material_id, 1);
});

test("a material the product does not offer is never kept", () => {
  const old = serializeMaterialFieldValue({ material_id: 99, name: "Old" });
  assert.equal(resolveSelectedMaterial(product([zirconia, emax]), old), undefined);
  assert.equal(resolveSelectedMaterial(product([zirconia]), old)?.material_id, 1);
  assert.equal(resolveSelectedMaterial(product([zirconia], { has_material: "No" }), old), undefined);
});

function archState({ toothProducts, cards = {}, values = {} }) {
  return {
    arch: "maxillary",
    allArchTeeth: [1, 2, 3, 4],
    activeTeeth: [],
    addedProducts: [],
    card0Product: null,
    getToothProduct: (_arch, tn) => toothProducts[tn] ?? null,
    getToothProductCard: (_arch, tn) => cards[tn] ?? 0,
    getFieldValue: (_arch, tn) => values[tn] ?? "",
  };
}

test("an arch is blocked until every card that offers materials has one", () => {
  const p = product([zirconia, emax]);
  const state = archState({ toothProducts: { 2: p } });
  assert.equal(isArchMaterialMissing({ ...state, activeTeeth: [2] }), true);
  const chosen = serializeMaterialFieldValue({ material_id: 2, name: "E.max" });
  assert.equal(
    isArchMaterialMissing({ ...state, activeTeeth: [2], getFieldValue: (_a, tn) => (tn === 2 ? chosen : "") }),
    false
  );
});

test("each card on the arch is checked", () => {
  const state = archState({
    toothProducts: { 2: product([zirconia]), 3: product([zirconia, emax]) },
    cards: { 3: 1 },
  });
  assert.equal(isArchMaterialMissing({ ...state, activeTeeth: [2] }), false);
  assert.equal(isArchMaterialMissing({ ...state, activeTeeth: [2, 3] }), true);
});

test("teeth without their own product use the card's product", () => {
  const p = product([zirconia, emax]);
  const state = archState({ toothProducts: {} });
  assert.equal(isArchMaterialMissing({ ...state, activeTeeth: [2], card0Product: p }), true);
});

test("products without materials never block", () => {
  const state = archState({ toothProducts: { 2: product([], {}) } });
  assert.equal(isArchMaterialMissing({ ...state, activeTeeth: [2] }), false);
});
