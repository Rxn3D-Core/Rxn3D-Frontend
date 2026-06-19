import assert from "node:assert/strict";
import test from "node:test";

import {
  V2_STATUS_TABS,
  countVisibleV2Columns,
  getV2PaginationPages,
  v2RowActionStripClass,
} from "./case-table-ui.mjs";

test("V2_STATUS_TABS defines the compact table statuses", () => {
  assert.deepEqual(V2_STATUS_TABS, [
    { label: "In Progress", value: "In Progress", icon: "progress" },
    { label: "On Hold", value: "On hold", icon: "hold" },
    { label: "Cancelled", value: "cancelled", icon: "cancelled" },
    { label: "Done", value: "Finished", icon: "done" },
  ]);
});

test("countVisibleV2Columns groups patient/slipNumber and pan/product columns", () => {
  assert.equal(
    countVisibleV2Columns({
      patient: false,
      slipNumber: true,
      office: true,
      pan: true,
      product: true,
      status: true,
      location: true,
      due: true,
      actions: true,
      timestamp: false,
      attachment: false,
      viewSlip: false,
    }),
    8,
  );
});

test("getV2PaginationPages returns a stable five-page window", () => {
  assert.deepEqual(getV2PaginationPages(5, 12), [3, 4, 5, 6, 7]);
  assert.deepEqual(getV2PaginationPages(1, 3), [1, 2, 3]);
});

test("v2RowActionStripClass is hidden until row hover or focus", () => {
  assert.match(v2RowActionStripClass, /group-hover:opacity-100/);
  assert.match(v2RowActionStripClass, /group-focus-within:opacity-100/);
  assert.match(v2RowActionStripClass, /pointer-events-none/);
});
