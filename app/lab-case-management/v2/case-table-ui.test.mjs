import assert from "node:assert/strict";
import test from "node:test";

import tailwindConfig from "../../../tailwind.config.js";

import {
  V2_STATUS_TABS,
  countVisibleV2Columns,
  getV2PaginationPages,
  v2RowActionStripClass,
} from "./case-table-ui.mjs";

const allColumnsHidden = {
  patient: false,
  slipNumber: false,
  pan: false,
  product: false,
  timestamp: false,
  office: false,
  status: false,
  location: false,
  attachment: false,
  viewSlip: false,
  due: false,
  actions: false,
};

test("V2_STATUS_TABS defines the compact table statuses", () => {
  assert.deepEqual(V2_STATUS_TABS, [
    { label: "In Progress", value: "In Progress", icon: "progress" },
    { label: "On Hold", value: "On hold", icon: "hold" },
    { label: "Cancelled", value: "cancelled", icon: "cancelled" },
    { label: "Done", value: "Finished", icon: "done" },
  ]);
});

test("countVisibleV2Columns groups patient/slipNumber and pan/product columns", () => {
  const independentColumns = [
    "timestamp",
    "office",
    "status",
    "location",
    "attachment",
    "viewSlip",
    "due",
    "actions",
  ];
  const cases = [
    ["selection only", allColumnsHidden, 1],
    ["patient only", { ...allColumnsHidden, patient: true }, 2],
    ["slip number only", { ...allColumnsHidden, slipNumber: true }, 2],
    ["pan only", { ...allColumnsHidden, pan: true }, 2],
    ["product only", { ...allColumnsHidden, product: true }, 2],
    ...independentColumns.map((column) => [
      `${column} only`,
      { ...allColumnsHidden, [column]: true },
      2,
    ]),
    [
      "compact default",
      {
        ...allColumnsHidden,
        slipNumber: true,
        office: true,
        pan: true,
        product: true,
        status: true,
        location: true,
        due: true,
        actions: true,
      },
      8,
    ],
    [
      "all visible",
      Object.fromEntries(Object.keys(allColumnsHidden).map((key) => [key, true])),
      11,
    ],
  ];

  for (const [name, columns, expected] of cases) {
    assert.equal(countVisibleV2Columns(columns), expected, name);
  }
});

test("getV2PaginationPages returns a stable five-page window", () => {
  const cases = [
    [5, 12, [3, 4, 5, 6, 7]],
    [1, 3, [1, 2, 3]],
    [11, 12, [8, 9, 10, 11, 12]],
    [12, 12, [8, 9, 10, 11, 12]],
    [3, 5, [1, 2, 3, 4, 5]],
    [1, 1, [1]],
  ];

  for (const [currentPage, totalPages, expected] of cases) {
    assert.deepEqual(
      getV2PaginationPages(currentPage, totalPages),
      expected,
      `page ${currentPage} of ${totalPages}`,
    );
  }
});

test("v2RowActionStripClass is hidden until row hover or focus", () => {
  const actionStripClass = v2RowActionStripClass();

  assert.match(actionStripClass, /opacity-0/);
  assert.match(actionStripClass, /group-hover:opacity-100/);
  assert.match(actionStripClass, /group-focus-within:opacity-100/);
  assert.match(actionStripClass, /pointer-events-none/);
  assert.match(actionStripClass, /group-hover:pointer-events-auto/);
  assert.match(actionStripClass, /group-focus-within:pointer-events-auto/);
});

test("Tailwind scans app mjs helpers that contain UI class names", () => {
  assert.ok(
    tailwindConfig.content.some((pattern) => pattern.includes("mjs")),
    "Tailwind content paths must include .mjs files",
  );
});
