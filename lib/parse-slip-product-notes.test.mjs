import assert from "node:assert/strict";
import test from "node:test";
import {
  parseGumShadeFromSlipProductNotes,
  parseSlipProductNotes,
  parseStageFromSlipProductNotes,
} from "./parse-slip-product-notes.ts";

const REMOVABLE_NOTE =
  "Please fabricate a Standard Flexible/Valplast in the Bite block stage. Use C4 denture teeth with Dark Pink gingiva. Impression: 1x Alginate. Teeth in mouth: #9–#11.";

test("parseSlipProductNotes extracts stage and shades from removable note text", () => {
  const parsed = parseSlipProductNotes(REMOVABLE_NOTE);
  assert.equal(parsed.stage, "Bite block");
  assert.equal(parsed.teethShade, "C4");
  assert.equal(parsed.gumShade, "Dark Pink");
});

test("parseStageFromSlipProductNotes handles fixed restoration wording", () => {
  const note =
    "Please fabricate a Crown for teeth #8–#9 in the Finish stage. Tooth shade: A2.";
  assert.equal(parseStageFromSlipProductNotes(note), "Finish");
});

test("parseGumShadeFromSlipProductNotes handles gum-only line", () => {
  assert.equal(parseGumShadeFromSlipProductNotes("Use Dark Pink gingiva."), "Dark Pink");
});
