import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAbutmentAddonEntries,
  mergeProductAndAbutmentAddonEntries,
} from "./abutmentAddonSync.ts";

const abutments = [
  {
    id: 1,
    type: "Lab provided",
    code: "LAB",
    description: "",
    status: "Active",
    image_url: null,
    sequence: 1,
    customer_id: 1,
    options: [],
    addons: [
      { id: 10, name: "Impression coping", status: "Active" },
      { id: 11, name: "Implant Labor", status: "Active" },
      { id: 12, name: "Impression Coping", status: "Active" },
      { id: 13, name: "Implant Labor", status: "Active" },
    ],
  },
];

test("buildAbutmentAddonEntries counts one qty per implant tooth and collapses same-name rows", () => {
  const details = {
    2: { abutmentType: "Lab provided", abutmentId: 1 },
    7: { abutmentType: "Lab provided", abutmentId: 1 },
    10: { abutmentType: "Lab provided", abutmentId: 1 },
    15: { abutmentType: "Lab provided", abutmentId: 1 },
  };
  const entries = buildAbutmentAddonEntries(details, abutments, null);
  const byName = Object.fromEntries(entries.map((e) => [e.name.toLowerCase(), e.qty]));
  assert.equal(byName["impression coping"], 4);
  assert.equal(byName["implant labor"], 4);
  assert.equal(entries.length, 2);
});

test("buildAbutmentAddonEntries uses implant retention count even when only one tooth has abutment filled", () => {
  const details = {
    3: { abutmentType: "Lab provided", abutmentId: 1 },
  };
  const entries = buildAbutmentAddonEntries(details, abutments, null, [3, 6, 11, 14]);
  const byName = Object.fromEntries(entries.map((e) => [e.name.toLowerCase(), e.qty]));
  assert.equal(byName["impression coping"], 4);
  assert.equal(byName["implant labor"], 4);
});

test("mergeProductAndAbutmentAddonEntries replaces same-name product defaults", () => {
  const merged = mergeProductAndAbutmentAddonEntries(
    [
      { addon_id: 99, qty: 1, name: "Impression Coping" },
      { addon_id: 100, qty: 2, name: "Wire clasp" },
    ],
    [{ addon_id: 10, qty: 4, name: "Impression coping" }]
  );
  const byName = Object.fromEntries(
    merged.map((e) => [e.name.toLowerCase(), e.qty])
  );
  assert.equal(byName["impression coping"], 4);
  assert.equal(byName["wire clasp"], 2);
});
