import test from "node:test";
import assert from "node:assert/strict";

import {
  nextStageAwareDueDate,
  pickHeaderDueDate,
} from "./headerEstimatedDueDate.ts";

const empty = { productId: null, displayDate: null };

test("stores the stage-aware date reported for the product", () => {
  const next = nextStageAwareDueDate(
    empty,
    { isoDate: "2026-11-20", displayDate: "Nov 20, 2026", isLoading: false },
    7
  );
  assert.deepEqual(next, { productId: 7, displayDate: "Nov 20, 2026" });
});

test("keeps the previous date while a new stage date is loading", () => {
  const prev = { productId: 7, displayDate: "Nov 20, 2026" };
  const next = nextStageAwareDueDate(
    prev,
    { isoDate: null, displayDate: null, isLoading: true },
    7
  );
  assert.equal(next, prev);
});

test("clears when stages are no longer ready (not loading, no date)", () => {
  const next = nextStageAwareDueDate(
    { productId: 7, displayDate: "Nov 20, 2026" },
    { isoDate: null, displayDate: null, isLoading: false },
    7
  );
  assert.deepEqual(next, { productId: 7, displayDate: null });
});

test("does not carry a date over to a different product", () => {
  const next = nextStageAwareDueDate(
    { productId: 7, displayDate: "Nov 20, 2026" },
    { isoDate: null, displayDate: null, isLoading: true },
    9
  );
  assert.deepEqual(next, { productId: 9, displayDate: null });
});

test("returns the same object when nothing changed", () => {
  const prev = { productId: 7, displayDate: "Nov 20, 2026" };
  const next = nextStageAwareDueDate(
    prev,
    { isoDate: "2026-11-20", displayDate: "Nov 20, 2026", isLoading: false },
    7
  );
  assert.equal(next, prev);
});

test("header uses the stage-aware date when present", () => {
  assert.deepEqual(
    pickHeaderDueDate({
      caseSubmitted: false,
      stageAwareDate: "Nov 20, 2026",
      productDate: "Nov 12, 2026",
      productDateLoading: false,
    }),
    { date: "Nov 20, 2026", isLoading: false }
  );
});

test("header falls back to the product date (and its loading) without a stage date", () => {
  assert.deepEqual(
    pickHeaderDueDate({
      caseSubmitted: false,
      stageAwareDate: null,
      productDate: "Nov 12, 2026",
      productDateLoading: false,
    }),
    { date: "Nov 12, 2026", isLoading: false }
  );
  assert.deepEqual(
    pickHeaderDueDate({
      caseSubmitted: false,
      stageAwareDate: null,
      productDate: null,
      productDateLoading: true,
    }),
    { date: null, isLoading: true }
  );
});

test("header shows nothing once the case is submitted", () => {
  assert.deepEqual(
    pickHeaderDueDate({
      caseSubmitted: true,
      stageAwareDate: "Nov 20, 2026",
      productDate: "Nov 12, 2026",
      productDateLoading: true,
    }),
    { date: null, isLoading: false }
  );
});
