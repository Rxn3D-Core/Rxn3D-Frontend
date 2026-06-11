import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requiresExtractionsAcknowledgement } from "../utils/extractionHelpers.ts";

/**
 * Mirrors useExtractionsAcknowledged default-ack logic (ack undefined → preloaded).
 */
function isAckComplete(ack, preloaded, extractions) {
  if (!requiresExtractionsAcknowledgement(extractions)) return true;
  return ack === undefined ? preloaded : ack === true;
}

describe("preload extractions acknowledgement", () => {
  const extractions = [
    { code: "MT", name: "Missing teeth", is_tim: false },
    { code: "WEOD", name: "Will extract on delivery", is_tim: false },
  ];

  it("preloaded flow treats unset ack as complete", () => {
    assert.equal(isAckComplete(undefined, true, extractions), true);
    assert.equal(isAckComplete(undefined, false, extractions), false);
  });

  it("explicit false still hides fields after preload", () => {
    assert.equal(isAckComplete(false, true, extractions), false);
  });

  it("explicit true always completes", () => {
    assert.equal(isAckComplete(true, false, extractions), true);
  });
});
