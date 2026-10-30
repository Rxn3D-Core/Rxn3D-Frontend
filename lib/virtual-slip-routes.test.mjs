import test from "node:test";
import assert from "node:assert/strict";

import {
  buildVirtualSlipPath,
  buildVirtualSlipV2Path,
  isValidVirtualSlipRouteId,
  isVirtualSlipUnavailable,
} from "./virtual-slip-routes.ts";

test("buildVirtualSlipPath uses case id and slip id", () => {
  assert.equal(buildVirtualSlipPath(99, 42), "/virtual-slip/99/42");
  assert.equal(buildVirtualSlipPath("99", "42"), "/virtual-slip/99/42");
});

test("buildVirtualSlipPath falls back to legacy when case id is missing", () => {
  assert.equal(buildVirtualSlipPath(null, 42), "/virtual-slip-v2/42");
  assert.equal(buildVirtualSlipPath(undefined, 42), "/virtual-slip-v2/42");
  assert.equal(buildVirtualSlipPath(0, 42), "/virtual-slip-v2/42");
});

test("buildVirtualSlipV2Path aliases buildVirtualSlipPath", () => {
  assert.equal(buildVirtualSlipV2Path(7, 11), "/virtual-slip/7/11");
});

test("isValidVirtualSlipRouteId accepts only positive integers", () => {
  assert.equal(isValidVirtualSlipRouteId("42"), true);
  for (const bad of ["abc", "0", "-3", "1.5", "12abc", "", undefined, ["1", "2"]]) {
    assert.equal(isValidVirtualSlipRouteId(bad), false, String(bad));
  }
});

test("isVirtualSlipUnavailable flags bad ids, and empty details once loaded", () => {
  const ok = { caseIdParam: "9", slipIdParam: "42", loading: false, details: { id: 42 } };
  assert.equal(isVirtualSlipUnavailable(ok), false);
  assert.equal(isVirtualSlipUnavailable({ ...ok, caseIdParam: "abc" }), true);
  assert.equal(isVirtualSlipUnavailable({ ...ok, slipIdParam: "x" }), true);
  assert.equal(isVirtualSlipUnavailable({ ...ok, details: null }), true);
  assert.equal(isVirtualSlipUnavailable({ ...ok, details: {} }), true);
  assert.equal(isVirtualSlipUnavailable({ ...ok, loading: true, details: null }), false);
});
