import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFixedFieldChain,
  nextIncompleteFixedField,
  advanceFieldKey,
  parseAdvanceFieldKey,
} from "./fixedFieldChain.ts";

test("buildFixedFieldChain: orders advance fields by sequence, keyed by id", () => {
  const fields = [
    { id: 11, name: "Metal Design", field_type: "dropdown", sequence: 3 },
    { id: 12, name: "Margin", field_type: "dropdown", sequence: 1 },
    { id: 13, name: "Characterization", field_type: "radio", sequence: 2 },
  ];
  const chain = buildFixedFieldChain(fields);
  assert.deepEqual(
    chain.map((d) => d.key),
    ["af:12", "af:13", "af:11"]
  );
  assert.deepEqual(
    chain.map((d) => d.name),
    ["Margin", "Characterization", "Metal Design"]
  );
});

test("buildFixedFieldChain: stage leads when includeStage", () => {
  const chain = buildFixedFieldChain(
    [{ id: 5, name: "Margin", field_type: "dropdown", sequence: 1 }],
    { includeStage: true }
  );
  assert.equal(chain[0].key, "stage");
  assert.equal(chain[0].kind, "stage");
  assert.equal(chain[1].key, "af:5");
});

test("buildFixedFieldChain: maps special field_types to kinds", () => {
  const fields = [
    { id: 1, name: "Tooth Shade", field_type: "shade_guide", sequence: 1 },
    { id: 2, name: "Implant", field_type: "implant_library", sequence: 2 },
    { id: 3, name: "Whatever Label", field_type: "dropdown", sequence: 3 },
  ];
  const chain = buildFixedFieldChain(fields);
  assert.deepEqual(
    chain.map((d) => d.kind),
    ["shade_guide", "implant_library", "generic"]
  );
});

test("buildFixedFieldChain: behavior is name-independent (rename safe)", () => {
  const a = buildFixedFieldChain([{ id: 7, name: "Margin", field_type: "dropdown", sequence: 1 }]);
  const b = buildFixedFieldChain([{ id: 7, name: "MARGINN (typo)", field_type: "dropdown", sequence: 1 }]);
  // Same key, kind, order regardless of the (renamed/typo'd) display name.
  assert.equal(a[0].key, b[0].key);
  assert.equal(a[0].kind, b[0].kind);
});

test("buildFixedFieldChain: drops inactive fields, keeps order stable on tie", () => {
  const fields = [
    { id: 1, name: "A", field_type: "dropdown", sequence: 1, status: "Active" },
    { id: 2, name: "B", field_type: "dropdown", sequence: 1, status: "Inactive" },
    { id: 3, name: "C", field_type: "dropdown", sequence: 1 },
  ];
  const chain = buildFixedFieldChain(fields);
  assert.deepEqual(chain.map((d) => d.advanceFieldId), [1, 3]);
});

test("nextIncompleteFixedField: returns first incomplete descriptor", () => {
  const chain = buildFixedFieldChain(
    [
      { id: 1, name: "A", field_type: "dropdown", sequence: 1 },
      { id: 2, name: "B", field_type: "dropdown", sequence: 2 },
    ],
    { includeStage: true }
  );
  const completed = new Set(["stage", "af:1"]);
  const next = nextIncompleteFixedField(chain, (d) => completed.has(d.key));
  assert.equal(next?.key, "af:2");
  // All complete → null
  const all = new Set(["stage", "af:1", "af:2"]);
  assert.equal(nextIncompleteFixedField(chain, (d) => all.has(d.key)), null);
});

test("advanceFieldKey / parseAdvanceFieldKey round-trip", () => {
  assert.equal(advanceFieldKey(42), "af:42");
  assert.equal(parseAdvanceFieldKey("af:42"), 42);
  assert.equal(parseAdvanceFieldKey("stage"), null);
});
