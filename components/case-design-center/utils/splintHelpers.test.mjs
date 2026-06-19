import test from "node:test";
import assert from "node:assert/strict";

import {
  formatSplintGroupsForApi,
  parseSplintedTeethToLinks,
  splintKeyForProductCard,
} from "./splintHelpers.ts";

test("formatSplintGroupsForApi returns comma-separated groups for slip create payload", () => {
  const teeth = [4, 5, 6, 10, 11];
  const links = [4, 5, 10];
  assert.deepEqual(formatSplintGroupsForApi(teeth, links), ["4,5,6", "10,11"]);
});

test("parseSplintedTeethToLinks converts API groups to chart link lowers", () => {
  assert.deepEqual(parseSplintedTeethToLinks(["8,9,10", "12,13"]), [8, 9, 12]);
});

test("splintKeyForProductCard prefers card id over product id", () => {
  assert.equal(splintKeyForProductCard(3, 99), "card:3");
  assert.equal(splintKeyForProductCard(0, 12), "fixed:12");
  assert.equal(splintKeyForProductCard(0, 0), "card0");
});
