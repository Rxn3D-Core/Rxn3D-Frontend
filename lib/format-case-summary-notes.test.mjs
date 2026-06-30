import test from "node:test";
import assert from "node:assert/strict";

import {
  formatCaseSummaryNotesForDisplay,
  getCaseSummaryArchContent,
  rebuildCaseSummaryFromArchParts,
} from "./format-case-summary-notes.ts";

const LEGACY = `MAXILLARY
Removable
Please fabricate a Premium Flexible/Valplast in the Try in with teeth stage. Use D2 denture teeth with Reddish Pink gingiva. Impression: 1x Alginate. Missing teeth: #11

MANDIBULAR
Removable
Please fabricate a Premium Flexible/Valplast in the Try in with teeth stage. Use D2 denture teeth with Reddish Pink gingiva. Impression: 1x Alginate. Will extract on delivery: #17–#32.`;

const LEGACY_SENTENCE = `Please fabricate a Premium Flexible/Valplast in the Try in with teeth stage. Use D2 denture teeth with Reddish Pink gingiva. Impression: 1x Alginate. Missing teeth: #11

Please fabricate a Premium Flexible/Valplast in the Try in with teeth stage. Use D2 denture teeth with Reddish Pink gingiva. Impression: 1x Alginate. Will extract on delivery: #17–#32.`;

const NEW_FORMAT = `Please fabricate, Premium Flexible/Valplast Try in with teeth for #11 and #12, use Vita Classical D2 denture with Ivoclar Reddish Pink gingiva, Impression: 1x Alginate, Missing teeth: #11.`;

test("formatCaseSummaryNotesForDisplay collapses legacy arch blocks to sentences", () => {
  assert.equal(formatCaseSummaryNotesForDisplay(LEGACY), LEGACY_SENTENCE);
});

test("formatCaseSummaryNotesForDisplay leaves new sentence notes unchanged", () => {
  assert.equal(formatCaseSummaryNotesForDisplay(NEW_FORMAT), NEW_FORMAT);
});

test("getCaseSummaryArchContent returns sentence for split editors", () => {
  assert.equal(
    getCaseSummaryArchContent(NEW_FORMAT, "maxillary"),
    NEW_FORMAT,
  );
});

test("rebuildCaseSummaryFromArchParts joins arch sentences", () => {
  const combined = `${NEW_FORMAT}\n\nPlease fabricate, Premium mandibular note.`;
  const maxillary = getCaseSummaryArchContent(combined, "maxillary");
  const mandibular = getCaseSummaryArchContent(combined, "mandibular");
  assert.equal(rebuildCaseSummaryFromArchParts(maxillary, mandibular), combined);
});
