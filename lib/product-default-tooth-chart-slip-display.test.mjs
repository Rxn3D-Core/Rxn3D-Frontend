// Run: node --import ./test-alias-loader.mjs --test lib/product-default-tooth-chart-slip-display.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  implantOnlySelectionModeForArch,
  mergeDefaultToothChartIntoSlipPayloadMaps,
  mergeProductDefaultToothChartForSlipSvgDisplay,
  productAllowsSelectOnlyImplant,
  resolveDefaultToothChartPayloadIdsForTooth,
  resolveDefaultToothChartSlipAssignmentForArch,
} from "./product-default-tooth-chart-slip-display.ts";

const DEF_EXTRACTION = {
  id: 1,
  extraction_id: 1,
  code: "Def",
  name: "Default",
  color: "#111111",
  status: "Active",
  is_default: "Yes",
  overlay: "No",
  sequence: 1,
};

const EXT_EXTRACTION = {
  id: 2,
  extraction_id: 2,
  code: "Ext",
  name: "Extraction",
  color: "#222222",
  status: "Active",
  is_default: "No",
  overlay: "No",
  sequence: 2,
};

function buildProduct(overrides = {}) {
  return {
    type: "Upper",
    has_default_tooth_chart: "Yes",
    allow_select_only_implant: "Yes",
    extractions: [DEF_EXTRACTION, EXT_EXTRACTION],
    default_tooth_chart: [
      { tooth_number: 3, retention_option_id: 7, chart_type: "Implant" },
      { tooth_number: 5, retention_option_id: 8, chart_type: "Prep" },
      { tooth_number: 6, extraction_id: 2, retention_option_id: null, chart_type: null },
    ],
    ...overrides,
  };
}

test("productAllowsSelectOnlyImplant requires both flags", () => {
  assert.equal(productAllowsSelectOnlyImplant(buildProduct()), true);
  assert.equal(
    productAllowsSelectOnlyImplant(buildProduct({ allow_select_only_implant: "No" })),
    false,
  );
  assert.equal(
    productAllowsSelectOnlyImplant(buildProduct({ has_default_tooth_chart: "No" })),
    false,
  );
  assert.equal(productAllowsSelectOnlyImplant(null), false);
});

test("implantOnlySelectionModeForArch is on for the product's arch", () => {
  assert.equal(implantOnlySelectionModeForArch(buildProduct(), "maxillary"), true);
  // Even a chart with no implant rows allows implant-only selection
  assert.equal(
    implantOnlySelectionModeForArch(
      buildProduct({ default_tooth_chart: [] }),
      "maxillary",
    ),
    true,
  );
});

test("implantOnlySelectionModeForArch is off when flag off or wrong arch", () => {
  assert.equal(
    implantOnlySelectionModeForArch(
      buildProduct({ allow_select_only_implant: "No" }),
      "maxillary",
    ),
    false,
  );
  // Upper product chart never applies to the mandibular arch
  assert.equal(implantOnlySelectionModeForArch(buildProduct(), "mandibular"), false);
});

test("slip assignment binds all default-chart teeth when select-only-implant is on", () => {
  const assignment = resolveDefaultToothChartSlipAssignmentForArch(
    buildProduct(),
    "maxillary",
  );
  assert.ok(assignment);
  // Product owns every configured tooth; only Implant retention is seeded into slip state.
  assert.equal(assignment.productTeeth.length, 16);
  assert.ok(assignment.productTeeth.includes(3));
  assert.ok(assignment.productTeeth.includes(5));
  assert.ok(assignment.productTeeth.includes(6));
  assert.deepEqual(assignment.retentionTypesByTooth, { 3: ["Implant"] });
  assert.deepEqual(assignment.toothExtractionMap, {});
  assert.deepEqual(assignment.claspTeeth, []);
});

test("slip assignment keeps full chart binding when the flag is off", () => {
  const assignment = resolveDefaultToothChartSlipAssignmentForArch(
    buildProduct({ allow_select_only_implant: "No" }),
    "maxillary",
  );
  assert.ok(assignment);
  // Every maxillary tooth is configured (retention, Ext row, or Def fallback)
  assert.equal(assignment.productTeeth.length, 16);
  assert.deepEqual(assignment.retentionTypesByTooth[3], ["Implant"]);
  assert.deepEqual(assignment.retentionTypesByTooth[5], ["Prep"]);
  assert.equal(assignment.toothExtractionMap[6], "Ext");
});

test("display: deselected implant tooth falls back to the catalog default extraction", () => {
  const display = mergeProductDefaultToothChartForSlipSvgDisplay({
    product: buildProduct(),
    arch: "maxillary",
    userToothExtractionMap: {},
    userClaspTeeth: [],
    userRetentionTypesByTooth: {},
  });
  assert.equal(display.retentionTypesByTooth[3], undefined);
  assert.equal(display.toothExtractionMap[3], "Def");
  // Non-implant chart rows still display their default configuration
  assert.deepEqual(display.retentionTypesByTooth[5], ["Prep"]);
  assert.equal(display.toothExtractionMap[6], "Ext");
});

test("display: selected implant tooth renders the implant mark", () => {
  const display = mergeProductDefaultToothChartForSlipSvgDisplay({
    product: buildProduct(),
    arch: "maxillary",
    userToothExtractionMap: {},
    userClaspTeeth: [],
    userRetentionTypesByTooth: { 3: ["Implant"] },
  });
  assert.deepEqual(display.retentionTypesByTooth[3], ["Implant"]);
  assert.equal(display.toothExtractionMap[3], undefined);
});

test("display: flag off keeps implant defaults visible without user state", () => {
  const display = mergeProductDefaultToothChartForSlipSvgDisplay({
    product: buildProduct({ allow_select_only_implant: "No" }),
    arch: "maxillary",
    userToothExtractionMap: {},
    userClaspTeeth: [],
    userRetentionTypesByTooth: {},
  });
  assert.deepEqual(display.retentionTypesByTooth[3], ["Implant"]);
});

test("resolveDefaultToothChartPayloadIdsForTooth returns retention or catalog default extraction", () => {
  assert.deepEqual(resolveDefaultToothChartPayloadIdsForTooth(buildProduct(), 3), {
    retention_option_id: 7,
    chart_type: "Implant",
  });
  assert.deepEqual(resolveDefaultToothChartPayloadIdsForTooth(buildProduct(), 4), {
    extraction_id: 1,
  });
});

test("mergeDefaultToothChartIntoSlipPayloadMaps fills gaps without overriding user implant", () => {
  const product = buildProduct();
  const merged = mergeDefaultToothChartIntoSlipPayloadMaps(product, "maxillary", {
    retentionTypesByTooth: { 3: ["Implant"] },
    toothExtractionMap: {},
    claspTeeth: [],
    teeth: [3, 4, 5, 6],
  });
  assert.deepEqual(merged.retentionTypesByTooth[3], ["Implant"]);
  assert.equal(merged.retentionTypesByTooth[4], undefined);
  assert.deepEqual(merged.retentionTypesByTooth[5], ["Prep"]);
  assert.equal(merged.toothExtractionMap[4], "Def");
  assert.equal(merged.toothExtractionMap[6], "Ext");
});
