import test from "node:test";
import assert from "node:assert/strict";

import { hasRetentionOptions } from "./categoryHelpers.ts";

test("treats has_retention Yes as fixed even when retention_options are omitted", () => {
  assert.equal(hasRetentionOptions({ has_retention: "Yes" }), true);
});

test("treats has_retention No as non-retention even when retention_options are omitted", () => {
  assert.equal(hasRetentionOptions({ has_retention: "No" }), false);
});

test("falls back to retention_options array when has_retention is absent", () => {
  assert.equal(hasRetentionOptions({ retention_options: [{ id: 1 }] }), true);
});
