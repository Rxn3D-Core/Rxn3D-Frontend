import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeRetentionChartType,
  resolveRetentionOptionChartType,
  resolveRetentionOptionChartTypeOrDefault,
  retentionOptionMatchesChartType,
} from "./retentionOptionChartType.ts";

test("normalizeRetentionChartType handles aliases and casing", () => {
  assert.equal(normalizeRetentionChartType("pontic"), "Pontic");
  assert.equal(normalizeRetentionChartType("Prepped"), "Prep");
  assert.equal(normalizeRetentionChartType("IMPLANT"), "Implant");
});

test("resolveRetentionOptionChartType uses selector_shape when tooth_chart_type missing", () => {
  const ponticOpt = {
    id: 3,
    name: "Custom pontic label",
    tooth_chart_type: null,
    selector_shape: "Pontic",
    has_implant: "No",
  };
  assert.equal(resolveRetentionOptionChartType(ponticOpt), "Pontic");
});

test("resolveRetentionOptionChartType uses name when only name indicates pontic", () => {
  const ponticOpt = {
    id: 4,
    name: "Pontic",
    tooth_chart_type: null,
    has_implant: "No",
  };
  assert.equal(resolveRetentionOptionChartType(ponticOpt), "Pontic");
});

test("resolveRetentionOptionChartType does not classify pontic as prep via has_implant fallback", () => {
  const ponticOpt = {
    id: 5,
    name: "Bridge Pontic",
    selector_shape: "Star",
    has_implant: "No",
  };
  assert.equal(resolveRetentionOptionChartTypeOrDefault(ponticOpt), "Pontic");
  assert.equal(retentionOptionMatchesChartType(ponticOpt, "Pontic"), true);
  assert.equal(retentionOptionMatchesChartType(ponticOpt, "Prep"), false);
});

test("resolveRetentionOptionChartType falls back to implant when has_implant yes", () => {
  const implantOpt = {
    id: 1,
    name: "Screwed retention",
    selector_shape: "Triangle",
    has_implant: "Yes",
  };
  assert.equal(resolveRetentionOptionChartType(implantOpt), "Implant");
});
