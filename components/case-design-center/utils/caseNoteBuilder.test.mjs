import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFixedProductNote,
  buildRemovableProductNote,
  formatFieldValueForNote,
  formatTeethNumbers,
  isFullArchTeeth,
} from "./caseNoteBuilder.ts";

const MAXILLARY_ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const MANDIBULAR_ALL = [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

test("formatTeethNumbers lists teeth separately up to 8 in a run", () => {
  assert.equal(formatTeethNumbers([3, 4]), "#3, #4");
  assert.equal(
    formatTeethNumbers([1, 2, 3, 4, 5, 6, 7, 8]),
    "#1, #2, #3, #4, #5, #6, #7, #8",
  );
});

test("formatTeethNumbers collapses a consecutive run longer than 8", () => {
  assert.equal(formatTeethNumbers([1, 2, 3, 4, 5, 6, 7, 8, 9]), "#1–#9");
  assert.equal(
    formatTeethNumbers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]),
    "#1–#16",
  );
});

test("formatTeethNumbers collapses only the long run, listing short ones", () => {
  assert.equal(
    formatTeethNumbers([2, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16]),
    "#2, #4, #6–#14, #16",
  );
});

test("formatTeethNumbers handles non-consecutive teeth and duplicates", () => {
  assert.equal(formatTeethNumbers([6, 7, 8, 9, 10, 12]), "#6, #7, #8, #9, #10, #12");
  assert.equal(formatTeethNumbers([8, 8, 10]), "#8, #10");
  assert.equal(formatTeethNumbers([]), "");
});

test("isFullArchTeeth detects complete maxillary and mandibular arches", () => {
  assert.equal(isFullArchTeeth(MAXILLARY_ALL), true);
  assert.equal(isFullArchTeeth(MANDIBULAR_ALL), true);
  assert.equal(isFullArchTeeth([...MAXILLARY_ALL].reverse()), true);
  assert.equal(isFullArchTeeth([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]), false);
  assert.equal(isFullArchTeeth([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]), false);
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

test("buildRemovableProductNote omits tooth numbers for full maxillary arch", () => {
  const note = buildRemovableProductNote({
    arch: "maxillary",
    teeth: MAXILLARY_ALL,
    allCardTeeth: MAXILLARY_ALL,
    product: { id: 3, name: "Immediate Full Denture" },
    repTooth: 1,
    getFieldValue: () => null,
    getSelectedShade: () => null,
  });
  assert.equal(note, "Please fabricate Immediate Full Denture.");
  assert.ok(!note.includes("#1"));
  assert.ok(!note.includes("#16"));
});

test("buildRemovableProductNote omits tooth numbers for full mandibular arch", () => {
  const note = buildRemovableProductNote({
    arch: "mandibular",
    teeth: MANDIBULAR_ALL,
    allCardTeeth: MANDIBULAR_ALL,
    product: { id: 4, name: "Immediate Full Denture" },
    repTooth: 17,
    getFieldValue: () => null,
    getSelectedShade: () => null,
  });
  assert.equal(note, "Please fabricate Immediate Full Denture.");
  assert.ok(!note.includes("#17"));
  assert.ok(!note.includes("#32"));
});

test("buildFixedProductNote omits tooth numbers for full arch", () => {
  const note = buildFixedProductNote({
    arch: "maxillary",
    teeth: MAXILLARY_ALL,
    product: { id: 5, name: "Full Arch Bridge" },
    repTooth: 1,
    getFieldValue: () => null,
    getSelectedShade: () => null,
  });
  assert.equal(note, "Please fabricate Full Arch Bridge.");
  assert.ok(!note.includes("#1"));
  assert.ok(!note.includes("#16"));
});
