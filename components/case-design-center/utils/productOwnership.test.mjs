import test from "node:test";
import assert from "node:assert/strict";

import { resolveProductOwnershipUpdate } from "./productOwnership.js";

test("does not reassign teeth across product cards", () => {
  assert.equal(
    resolveProductOwnershipUpdate({
      isActiveProductRemovables: true,
      activeProductCardId: 12,
      activeArchMatches: true,
      activeProductId: 501,
      currentCardId: 0,
      selectedProductId: 101,
    }),
    null
  );
});
