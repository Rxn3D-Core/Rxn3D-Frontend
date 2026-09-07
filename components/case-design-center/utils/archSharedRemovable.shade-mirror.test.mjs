import test from "node:test";
import assert from "node:assert/strict";

/**
 * Mirrors findRemovableCardFieldValue / getRepToothForRemovableCard behavior for
 * the shade-mirror bug: shade lives on chart-selected tooth 5, not sentinel 1.
 */
function getRepToothForRemovableCard(arch, cardId, allArchTeeth, getToothProductCard, getToothProduct) {
  if (cardId !== 0) {
    const assigned = allArchTeeth
      .filter((tn) => getToothProductCard(arch, tn) === cardId)
      .sort((a, b) => a - b);
    if (assigned.length > 0) return assigned[0];
    return -cardId;
  }
  const card0Assigned = allArchTeeth
    .filter((tn) => getToothProductCard(arch, tn) === 0 && getToothProduct(arch, tn))
    .sort((a, b) => a - b);
  if (card0Assigned.length > 0) return card0Assigned[0];
  return allArchTeeth[0] ?? (arch === "maxillary" ? 1 : 17);
}

function findRemovableCardFieldValue(
  arch,
  cardId,
  allArchTeeth,
  step,
  getToothProductCard,
  getToothProduct,
  getFieldValue,
  isFieldCompleted
) {
  const repTooth = getRepToothForRemovableCard(
    arch,
    cardId,
    allArchTeeth,
    getToothProductCard,
    getToothProduct
  );
  const cardTeeth =
    cardId === 0
      ? allArchTeeth.filter(
          (tn) => getToothProductCard(arch, tn) === 0 && !!getToothProduct(arch, tn)
        )
      : allArchTeeth.filter((tn) => getToothProductCard(arch, tn) === cardId);
  const candidates = [repTooth, ...cardTeeth];
  if (cardId !== 0) candidates.push(-cardId);
  const seen = new Set();
  for (const tn of candidates) {
    if (seen.has(tn)) continue;
    seen.add(tn);
    const completed = isFieldCompleted(arch, tn, step);
    const value = getFieldValue(arch, tn, step) || "";
    if (completed || value) return { tooth: tn, value, completed };
  }
  return null;
}

const MAXILLARY_ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

test("rep tooth alone is sentinel, but shade lookup finds C2 on tooth 5", () => {
  const getToothProductCard = (_arch, tn) => (tn === 1 || tn === 5 || tn === 6 ? 0 : -1);
  const getToothProduct = (_arch, tn) => (tn === 1 || tn === 5 || tn === 6 ? { id: 10 } : null);
  const shadeJson = JSON.stringify({ teeth_shade_id: 1, brand_id: 2, name: "C2" });
  const getFieldValue = (_arch, tn, step) =>
    tn === 5 && step === "teeth_shade" ? shadeJson : "";
  const isFieldCompleted = (_arch, tn, step) => tn === 5 && step === "teeth_shade";

  // Old path: only look at rep tooth (sentinel 1) → miss C2
  const rep = getRepToothForRemovableCard(
    "maxillary",
    0,
    MAXILLARY_ALL,
    getToothProductCard,
    getToothProduct
  );
  assert.equal(rep, 1);
  assert.equal(getFieldValue("maxillary", rep, "teeth_shade"), "");

  // New path: scan card teeth → find C2 on tooth 5
  const found = findRemovableCardFieldValue(
    "maxillary",
    0,
    MAXILLARY_ALL,
    "teeth_shade",
    getToothProductCard,
    getToothProduct,
    getFieldValue,
    isFieldCompleted
  );
  assert.deepEqual(found, { tooth: 5, value: shadeJson, completed: true });
});
