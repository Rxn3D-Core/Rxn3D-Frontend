import test from "node:test";
import assert from "node:assert/strict";

import { formatFieldValueForNote, formatTeethNumbers } from "./caseNoteBuilder.ts";

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
