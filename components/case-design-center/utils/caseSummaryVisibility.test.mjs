import test from "node:test";
import assert from "node:assert/strict";

import { shouldShowCaseSummaryNotes } from "./caseSummaryVisibility.ts";

test("keeps case summary notes hidden until all products are complete", () => {
  assert.equal(
    shouldShowCaseSummaryNotes({
      allProductsComplete: false,
    }),
    false,
  );
});

test("shows case summary notes when every product accordion is complete", () => {
  assert.equal(
    shouldShowCaseSummaryNotes({
      allProductsComplete: true,
    }),
    true,
  );
});

test("shows case summary notes for submitted cases even when incomplete", () => {
  assert.equal(
    shouldShowCaseSummaryNotes({
      caseSubmitted: true,
      allProductsComplete: false,
    }),
    true,
  );
});
