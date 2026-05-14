import test from "node:test";
import assert from "node:assert/strict";

import { shouldShowCaseSummaryNotes } from "./caseSummaryVisibility.ts";

test("keeps case summary notes hidden when no product accordion is complete", () => {
  assert.equal(
    shouldShowCaseSummaryNotes({
      completedFixedAccordions: 0,
      completedRemovableAccordions: 0,
    }),
    false,
  );
});

test("shows case summary notes after any one product accordion is complete", () => {
  assert.equal(
    shouldShowCaseSummaryNotes({
      completedFixedAccordions: 1,
      completedRemovableAccordions: 0,
    }),
    true,
  );

  assert.equal(
    shouldShowCaseSummaryNotes({
      completedFixedAccordions: 0,
      completedRemovableAccordions: 1,
    }),
    true,
  );
});

test("shows case summary notes as soon as any product exists", () => {
  assert.equal(
    shouldShowCaseSummaryNotes({
      completedFixedAccordions: 0,
      completedRemovableAccordions: 0,
      hasAnyProducts: true,
    }),
    true,
  );
});

test("shows case summary notes for submitted cases even without completed accordions", () => {
  assert.equal(
    shouldShowCaseSummaryNotes({
      caseSubmitted: true,
      completedFixedAccordions: 0,
      completedRemovableAccordions: 0,
    }),
    true,
  );
});
