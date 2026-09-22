import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveListingPaperSlipId,
  resolveListingPaperSlipIds,
} from "../lib/paper-slip-listing-print-ids.ts";

test("resolveListingPaperSlipId uses slip id only", () => {
  assert.equal(resolveListingPaperSlipId({ id: 5277 }), 5277);
  assert.equal(resolveListingPaperSlipId({ id: null }), null);
  assert.equal(resolveListingPaperSlipId({}), null);
});

test("resolveListingPaperSlipIds keeps selected slip ids and drops caseId mix-ups", () => {
  // Rows historically mis-sent caseId; helper must ignore that and use id.
  const rows = [
    { id: 10, caseId: 100 },
    { id: 11, caseId: 100 },
    { id: 10, caseId: 100 },
  ];
  assert.deepEqual(resolveListingPaperSlipIds(rows), [10, 11]);
});
