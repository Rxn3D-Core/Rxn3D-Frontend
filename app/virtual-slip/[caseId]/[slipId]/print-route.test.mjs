import assert from "node:assert/strict";
import test from "node:test";

import { buildVirtualSlipPrintRoute } from "./print-route.mjs";

test("buildVirtualSlipPrintRoute builds the paper slip print route for a slip id", () => {
  assert.equal(buildVirtualSlipPrintRoute(119), "/paper-slip/print?slip_ids=119");
});

test("buildVirtualSlipPrintRoute returns null for invalid slip ids", () => {
  assert.equal(buildVirtualSlipPrintRoute(Number.NaN), null);
  assert.equal(buildVirtualSlipPrintRoute(0), null);
});
