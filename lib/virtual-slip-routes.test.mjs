import test from "node:test";
import assert from "node:assert/strict";

import { buildVirtualSlipPath, buildVirtualSlipV2Path } from "./virtual-slip-routes.ts";

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
