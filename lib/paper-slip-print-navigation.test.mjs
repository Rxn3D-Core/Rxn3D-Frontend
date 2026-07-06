import test from "node:test";
import assert from "node:assert/strict";

import {
  getPaperSlipPrintNavigationMode,
  isPaperSlipMobileOrTablet,
} from "./paper-slip-print-navigation.ts";

test("isPaperSlipMobileOrTablet detects compact viewports", () => {
  assert.equal(isPaperSlipMobileOrTablet({ innerWidth: 390, userAgent: "Mozilla/5.0" }), true);
  assert.equal(isPaperSlipMobileOrTablet({ innerWidth: 1280, userAgent: "Mozilla/5.0" }), false);
});

test("isPaperSlipMobileOrTablet detects mobile user agents", () => {
  assert.equal(isPaperSlipMobileOrTablet({ innerWidth: 1440, userAgent: "Mozilla/5.0 iPhone" }), true);
  assert.equal(isPaperSlipMobileOrTablet({ innerWidth: 1440, userAgent: "Mozilla/5.0 Android Mobile" }), true);
});

test("getPaperSlipPrintNavigationMode uses same-tab navigation only on mobile and tablet", () => {
  assert.equal(
    getPaperSlipPrintNavigationMode({ innerWidth: 1024, userAgent: "Mozilla/5.0 iPad" }),
    "same-tab",
  );
  assert.equal(
    getPaperSlipPrintNavigationMode({ innerWidth: 1280, userAgent: "Mozilla/5.0" }),
    "in-page",
  );
});
