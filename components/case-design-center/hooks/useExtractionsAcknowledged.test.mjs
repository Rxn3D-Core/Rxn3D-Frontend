import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requiresExtractionsAcknowledgement } from "../utils/extractionHelpers.ts";

/**
 * Mirrors useExtractionsAcknowledged default-ack logic:
 * unset ack → complete only for cards that existed at preload.
 */
function isAckComplete(ack, preloaded, extractions, cardId, preloadedCardIds) {
  if (!requiresExtractionsAcknowledgement(extractions)) return true;
  if (ack !== undefined) return ack === true;
  return preloaded && preloadedCardIds.has(cardId);
}

describe("preload extractions acknowledgement", () => {
  const extractions = [
    { code: "MT", name: "Missing teeth", is_tim: false },
    { code: "WEOD", name: "Will extract on delivery", is_tim: false },
  ];
  const preloadedCardIds = new Set([0, 1]);

  it("preloaded flow treats unset ack as complete for existing cards", () => {
    assert.equal(isAckComplete(undefined, true, extractions, 1, preloadedCardIds), true);
    assert.equal(isAckComplete(undefined, false, extractions, 1, preloadedCardIds), false);
  });

  it("products added after preload still require Done", () => {
    assert.equal(isAckComplete(undefined, true, extractions, 2, preloadedCardIds), false);
  });

  it("explicit false still hides fields after preload", () => {
    assert.equal(isAckComplete(false, true, extractions, 1, preloadedCardIds), false);
  });

  it("explicit true always completes", () => {
    assert.equal(isAckComplete(true, false, extractions, 2, preloadedCardIds), true);
  });
});
