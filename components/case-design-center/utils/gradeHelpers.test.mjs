import assert from "node:assert/strict";
import test from "node:test";

import { mergeEnrichedProductFromDonor } from "./gradeHelpers.ts";

test("copies variations onto a tooth stub that is missing them", () => {
  const merged = mergeEnrichedProductFromDonor(
    { id: 73, name: "Flipper / Stayplate" },
    {
      id: 73,
      has_variation: "Yes",
      variations: [{ id: 1276, teeth_spec: "3", sort_order: 3 }],
    }
  );

  assert.equal(merged.has_variation, "Yes");
  assert.equal(merged.variations?.[0]?.id, 1276);
});
