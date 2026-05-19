import assert from "node:assert/strict";
import test from "node:test";
import {
  getRetentionMechanismNamesFromOption,
  getSuggestedRetentionMechanismTypes,
  parseRetentionMechanismSelection,
  serializeRetentionMechanismSelection,
} from "./retentionMechanismTypes.ts";

const implantOpt = {
  id: 1,
  name: "Implant",
  tooth_chart_type: "Implant",
  retentions: [{ id: 4, name: "Screwed", status: "Active" }],
};

const prepOpt = {
  id: 2,
  name: "Prepped",
  tooth_chart_type: "Prepped",
  retentions: [{ id: 5, name: "Cemented", status: "Active" }],
};

const ponticOpt = {
  id: 3,
  name: "Pontic",
  tooth_chart_type: "Pontic",
  retentions: [],
};

test("extracts active retention mechanism names from option", () => {
  assert.deepEqual(getRetentionMechanismNamesFromOption(implantOpt), ["Screwed"]);
  assert.deepEqual(getRetentionMechanismNamesFromOption(ponticOpt), []);
});

test("suggested types union across teeth", () => {
  const product = { retention_options: [implantOpt, prepOpt, ponticOpt] };
  const map = { 8: ["Implant"], 9: ["Prep"] };
  assert.deepEqual(getSuggestedRetentionMechanismTypes(product, map, [8, 9]), [
    "Screwed",
    "Cemented",
  ]);
});

test("pontic only yields no mechanism types", () => {
  const product = { retention_options: [ponticOpt] };
  const map = { 10: ["Pontic"] };
  assert.deepEqual(getSuggestedRetentionMechanismTypes(product, map, [10]), []);
});

test("serialize and parse selection", () => {
  assert.equal(
    serializeRetentionMechanismSelection(["Screwed", "Cemented"]),
    "Screwed, Cemented"
  );
  assert.deepEqual(parseRetentionMechanismSelection("Screwed, Cemented"), [
    "Screwed",
    "Cemented",
  ]);
});
