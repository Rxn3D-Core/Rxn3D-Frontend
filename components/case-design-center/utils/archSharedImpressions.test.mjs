import test from "node:test";
import assert from "node:assert/strict";

import {
  applyArchImpressionSnapshot,
  archHasAnyImpressionSelections,
  getArchImpressionSnapshot,
  normalizeArchSharedImpressions,
} from "./archSharedImpressions.ts";

test("normalizeArchSharedImpressions copies one arch selection to all product ids", () => {
  const prev = { "1_maxillary_PVS": 2 };
  const next = normalizeArchSharedImpressions(prev, ["maxillary"], () => ["1", "2", "99"]);
  assert.equal(next["1_maxillary_PVS"], 2);
  assert.equal(next["2_maxillary_PVS"], 2);
  assert.equal(next["99_maxillary_PVS"], 2);
});

test("getArchImpressionSnapshot merges qty across products on same arch", () => {
  const snapshot = getArchImpressionSnapshot(
    {
      "1_maxillary_A": 1,
      "2_maxillary_A": 3,
      "1_mandibular_B": 1,
    },
    "maxillary"
  );
  assert.equal(snapshot.get("A"), 3);
  assert.equal(snapshot.size, 1);
});

test("applyArchImpressionSnapshot replaces prior arch keys", () => {
  const snapshot = new Map([["PVS", 2]]);
  const next = applyArchImpressionSnapshot(
    { "9_maxillary_OLD": 1, "1_mandibular_X": 1 },
    "maxillary",
    ["1", "2"],
    snapshot
  );
  assert.equal(next["9_maxillary_OLD"], undefined);
  assert.equal(next["1_maxillary_PVS"], 2);
  assert.equal(next["2_maxillary_PVS"], 2);
  assert.equal(next["1_mandibular_X"], 1);
});

test("archHasAnyImpressionSelections is true when any product has arch qty", () => {
  assert.equal(
    archHasAnyImpressionSelections({ "5_mandibular_STL": 1 }, "mandibular"),
    true
  );
  assert.equal(archHasAnyImpressionSelections({}, "mandibular"), false);
});
