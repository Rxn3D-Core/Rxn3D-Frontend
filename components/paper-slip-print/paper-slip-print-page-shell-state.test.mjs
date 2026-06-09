import test from "node:test";
import assert from "node:assert/strict";

import { buildPaperSlipPrintActionState } from "./paper-slip-print-page-shell-state.ts";

test("buildPaperSlipPrintActionState shows the print button once printable slips are ready", () => {
  assert.deepEqual(
    buildPaperSlipPrintActionState({
      fetchError: null,
      loading: false,
      slipCount: 2,
    }),
    { showPrintButton: true },
  );
});

test("buildPaperSlipPrintActionState hides the print button while data is loading", () => {
  assert.deepEqual(
    buildPaperSlipPrintActionState({
      fetchError: null,
      loading: true,
      slipCount: 2,
    }),
    { showPrintButton: false },
  );
});

test("buildPaperSlipPrintActionState hides the print button when there is nothing to print", () => {
  assert.deepEqual(
    buildPaperSlipPrintActionState({
      fetchError: null,
      loading: false,
      slipCount: 0,
    }),
    { showPrintButton: false },
  );
});

test("buildPaperSlipPrintActionState hides the print button when the page is in an error state", () => {
  assert.deepEqual(
    buildPaperSlipPrintActionState({
      fetchError: "Unable to load paper slip data.",
      loading: false,
      slipCount: 1,
    }),
    { showPrintButton: false },
  );
});
