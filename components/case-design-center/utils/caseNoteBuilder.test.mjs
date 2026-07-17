import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRemovableProductNote,
  formatFieldValueForNote,
  formatTeethNumbers,
} from "./caseNoteBuilder.ts";

test("formatTeethNumbers uses ranges", () => {
  assert.equal(formatTeethNumbers([3, 4]), "#3–#4");
});

test("formatFieldValueForNote expands contact icon JSON with field names", () => {
  const raw = JSON.stringify({
    41: { name: "MRL", optionId: 64 },
    42: { name: "Type II", optionId: 71 },
  });
  const advanceFields = [
    { id: 41, name: "Occlusal contacts", field_type: "dropdown" },
    { id: 42, name: "Pontic design", field_type: "dropdown" },
  ];
  const result = formatFieldValueForNote(raw, advanceFields);
  assert.equal(result, "Occlusal contacts: MRL; Pontic design: Type II");
  assert.ok(!result.includes("{"));
});

test("formatFieldValueForNote returns plain text unchanged", () => {
  assert.equal(formatFieldValueForNote("Screwed"), "Screwed");
  assert.equal(formatFieldValueForNote("auto"), "Auto");
});

test("formatFieldValueForNote never returns raw JSON blob", () => {
  const raw = '{"41":{"name":"MRL","optionId":64}}';
  const result = formatFieldValueForNote(raw, [{ id: 41, name: "Occlusal", field_type: "dropdown" }]);
  assert.equal(result, "Occlusal: MRL");
  assert.ok(!result.startsWith("{"));
});

test("formatFieldValueForNote formats per-tooth embrasure JSON as tooth labels", () => {
  const raw = JSON.stringify({
    41: { name: "MRL", optionId: 64 },
    42: { name: "Type II", optionId: 71 },
    43: { name: "Normal", optionId: 74 },
    44: { name: "Medium", optionId: 78 },
  });
  const result = formatFieldValueForNote(raw, [
    { id: 99, name: "Embrasure Type", field_type: "dropdown" },
  ]);
  assert.equal(result, "#41 MRL, #42 Type II, #43 Normal, #44 Medium");
  assert.ok(!result.includes("{"));
});

test("buildRemovableProductNote lists only product teeth passed in", () => {
  const note = buildRemovableProductNote({
    arch: "maxillary",
    teeth: [8, 10],
    allCardTeeth: [6, 8, 10, 11],
    product: { id: 1, name: "Stayplate" },
    repTooth: 8,
    getFieldValue: () => null,
    getSelectedShade: () => null,
  });
  assert.match(note, /for #8, #10/);
  assert.ok(!note.includes("#6"));
  assert.ok(!note.includes("#11"));
});

test("buildRemovableProductNote omits teeth clause when empty", () => {
  const note = buildRemovableProductNote({
    arch: "mandibular",
    teeth: [],
    allCardTeeth: [19, 22],
    product: { id: 2, name: "Flipper" },
    repTooth: 25,
    getFieldValue: () => null,
    getSelectedShade: () => null,
  });
  assert.equal(note, "Please fabricate Flipper.");
  assert.ok(!note.includes("#19"));
  assert.ok(!note.includes("#22"));
});
