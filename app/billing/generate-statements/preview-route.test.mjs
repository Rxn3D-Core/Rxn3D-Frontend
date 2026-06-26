import assert from "node:assert/strict";
import test from "node:test";

import { buildStatementPreviewRoute } from "./preview-route.mjs";

test("buildStatementPreviewRoute returns a route for a valid statement id", () => {
  assert.equal(buildStatementPreviewRoute(42), "/statement-preview/42");
});

test("buildStatementPreviewRoute normalizes numeric strings", () => {
  assert.equal(buildStatementPreviewRoute("9"), "/statement-preview/9");
});

test("buildStatementPreviewRoute returns null for invalid ids", () => {
  assert.equal(buildStatementPreviewRoute("abc"), null);
  assert.equal(buildStatementPreviewRoute(0), null);
  assert.equal(buildStatementPreviewRoute(-7), null);
});
