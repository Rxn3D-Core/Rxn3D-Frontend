import test from "node:test";
import assert from "node:assert/strict";
import { nextAddedProductCardId } from "./nextAddedProductCardId.ts";

test("nextAddedProductCardId returns 1 when empty (card 0 reserved)", () => {
  assert.equal(nextAddedProductCardId([]), 1);
  assert.equal(nextAddedProductCardId(undefined), 1);
});

test("nextAddedProductCardId returns max(id)+1", () => {
  assert.equal(nextAddedProductCardId([{ id: 1 }]), 2);
  assert.equal(nextAddedProductCardId([{ id: 1 }, { id: 2 }]), 3);
  assert.equal(nextAddedProductCardId([{ id: 3 }, { id: 1 }]), 4);
});

test("nextAddedProductCardId never returns 0", () => {
  assert.notEqual(nextAddedProductCardId([]), 0);
  assert.ok(nextAddedProductCardId([{ id: 5 }]) >= 1);
});
