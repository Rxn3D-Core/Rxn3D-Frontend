import assert from "node:assert/strict";
import test from "node:test";
import {
  chunkPaperSlipSectionsForHalfPage,
  isPaperSlipPrintLayout,
  shouldOfferPaperSlipPrintLayoutChoice,
} from "../lib/paper-slip-print-layout.ts";

test("isPaperSlipPrintLayout accepts full and half only", () => {
  assert.equal(isPaperSlipPrintLayout("full"), true);
  assert.equal(isPaperSlipPrintLayout("half"), true);
  assert.equal(isPaperSlipPrintLayout("quarter"), false);
  assert.equal(isPaperSlipPrintLayout(""), false);
});

test("shouldOfferPaperSlipPrintLayoutChoice is iPhone and iPad only", () => {
  assert.equal(
    shouldOfferPaperSlipPrintLayoutChoice({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
    }),
    true,
  );
  assert.equal(
    shouldOfferPaperSlipPrintLayoutChoice({
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPad",
      maxTouchPoints: 5,
    }),
    true,
  );
  // iPadOS desktop site: Macintosh UA, MacIntel, multi-touch.
  assert.equal(
    shouldOfferPaperSlipPrintLayoutChoice({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    }),
    true,
  );
  assert.equal(
    shouldOfferPaperSlipPrintLayoutChoice({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 0,
    }),
    false,
  );
  assert.equal(
    shouldOfferPaperSlipPrintLayoutChoice({
      userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    }),
    false,
  );
  assert.equal(
    shouldOfferPaperSlipPrintLayoutChoice({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      platform: "Win32",
      maxTouchPoints: 0,
    }),
    false,
  );
});

test("chunkPaperSlipSectionsForHalfPage pairs slips for landscape sheets", () => {
  assert.deepEqual(chunkPaperSlipSectionsForHalfPage([1, 2, 3, 4]), [
    [1, 2],
    [3, 4],
  ]);
  assert.deepEqual(chunkPaperSlipSectionsForHalfPage(["a"]), [["a"]]);
  assert.deepEqual(chunkPaperSlipSectionsForHalfPage(["a", "b", "c"]), [
    ["a", "b"],
    ["c"],
  ]);
  assert.deepEqual(chunkPaperSlipSectionsForHalfPage([]), []);
});
