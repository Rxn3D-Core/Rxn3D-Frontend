import test from "node:test";
import assert from "node:assert/strict";

import {
  formatSplintGroupsForApi,
  parseSplintedTeethToLinks,
  splintKeyForProductCard,
  deriveAutoSplintLinks,
  deriveWingTeeth,
  formatWingGroupsForApi,
  combineSplintLinks,
  toggleSplintOverlay,
  DEFAULT_RETENTION_RULES,
} from "./splintHelpers.ts";

const withRules = (overrides) => ({
  ...DEFAULT_RETENTION_RULES,
  S1: { ...DEFAULT_RETENTION_RULES.S1, ...(overrides.S1 ?? {}) },
  W1: { ...DEFAULT_RETENTION_RULES.W1, ...(overrides.W1 ?? {}) },
});

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

test("deriveAutoSplintLinks: S1 pontic between two preps chains into one group", () => {
  const roles = { 13: "Prep", 14: "Pontic", 15: "Prep" };
  const links = deriveAutoSplintLinks([13, 14, 15], roles);
  assert.deepEqual(links, [13, 14]);
  assert.deepEqual(formatSplintGroupsForApi([13, 14, 15], links), ["13,14,15"]);
});

test("deriveAutoSplintLinks: S1 cantilever (prep + pontic)", () => {
  assert.deepEqual(deriveAutoSplintLinks([5, 6], { 5: "Prep", 6: "Pontic" }), [5]);
  assert.deepEqual(deriveAutoSplintLinks([5, 6], { 5: "Implant", 6: "Pontic" }), [5]);
});

test("deriveAutoSplintLinks: pontic adjacent to another pontic links", () => {
  assert.deepEqual(deriveAutoSplintLinks([14, 15], { 14: "Pontic", 15: "Pontic" }), [14]);
});

test("deriveAutoSplintLinks: S2 all prep/implant with no pontic → no auto links", () => {
  assert.deepEqual(
    deriveAutoSplintLinks([13, 14, 15], { 13: "Prep", 14: "Prep", 15: "Implant" }),
    []
  );
});

test("deriveAutoSplintLinks: S3 single tooth never splinted", () => {
  assert.deepEqual(deriveAutoSplintLinks([6], { 6: "Prep" }), []);
});

test("deriveAutoSplintLinks: non-adjacent pontic+prep (gap) does not link", () => {
  assert.deepEqual(deriveAutoSplintLinks([13, 15], { 13: "Prep", 15: "Pontic" }), []);
});

test("deriveAutoSplintLinks: accepts array-valued role map", () => {
  const roles = { 13: ["Prep"], 14: ["Pontic"], 15: ["Prep"] };
  assert.deepEqual(deriveAutoSplintLinks([13, 14, 15], roles), [13, 14]);
});

test("deriveWingTeeth: empty neighbor of a pontic is a wing position", () => {
  const arch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  // Pontic at 14, both neighbors empty → wings on 13 and 15.
  assert.deepEqual(deriveWingTeeth({ 14: "Pontic" }, arch), [13, 15]);
});

test("deriveWingTeeth: prep/implant/pontic neighbor is NOT a wing", () => {
  const arch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  // Both neighbors filled → no wings.
  assert.deepEqual(deriveWingTeeth({ 13: "Prep", 14: "Pontic", 15: "Implant" }, arch), []);
});

test("deriveWingTeeth: supported pontic gets NO wing on its empty side (unit-level)", () => {
  const arch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  // 10 Prep – 11 Pontic, 12 empty → 11 supported by the Prep → no wing on 12.
  assert.deepEqual(deriveWingTeeth({ 10: "Prep", 11: "Pontic" }, arch), []);
  // 13 Prep – 14 Pontic – 15 Pontic, 16 empty → unit has Prep at 13 → no wing on 16.
  assert.deepEqual(
    deriveWingTeeth({ 13: "Prep", 14: "Pontic", 15: "Pontic" }, arch),
    []
  );
});

test("deriveWingTeeth: pure-pontic span with no abutment still wings", () => {
  const arch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  // 11 Pontic – 12 Pontic, 10 & 13 empty, no abutment anywhere → wings on 10 & 13.
  assert.deepEqual(deriveWingTeeth({ 11: "Pontic", 12: "Pontic" }, arch), [10, 13]);
});

test("deriveWingTeeth: arch end has no neighbor", () => {
  const arch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  // Pontic at 1 → only neighbor 2.
  assert.deepEqual(deriveWingTeeth({ 1: "Pontic" }, arch), [2]);
  // Pontic at 16 → only neighbor 15.
  assert.deepEqual(deriveWingTeeth({ 16: "Pontic" }, arch), [15]);
});

test("formatWingGroupsForApi: pontic with two empty neighbors → one connected group", () => {
  const arch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  assert.deepEqual(formatWingGroupsForApi({ 14: "Pontic" }, arch), ["13,14,15"]);
});

test("formatWingGroupsForApi: supported pontic emits no wing group", () => {
  const arch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  // 13 Prep – 14 Pontic: 14 is supported → no wing group.
  assert.deepEqual(formatWingGroupsForApi({ 13: "Prep", 14: "Pontic" }, arch), []);
});

test("combineSplintLinks: preserve-manual keeps adds and removes", () => {
  const auto = [13, 14];
  const overlay = { added: [20], removed: [13] };
  assert.deepEqual(combineSplintLinks(auto, overlay, "preserve-manual"), [14, 20]);
});

test("combineSplintLinks: recompute-wins ignores overlay", () => {
  const auto = [13, 14];
  const overlay = { added: [20], removed: [13] };
  assert.deepEqual(combineSplintLinks(auto, overlay, "recompute-wins"), [13, 14]);
});

test("toggleSplintOverlay: breaking an auto link records a removal", () => {
  const auto = [13, 14];
  const next = toggleSplintOverlay(undefined, auto, 13);
  assert.deepEqual(next.removed, [13]);
  assert.deepEqual(combineSplintLinks(auto, next), [14]);
  // toggling back on clears the removal
  const back = toggleSplintOverlay(next, auto, 13);
  assert.deepEqual(back.removed, []);
  assert.deepEqual(combineSplintLinks(auto, back), [13, 14]);
});

test("toggleSplintOverlay: adding a manual link records an addition", () => {
  const auto = [13];
  const next = toggleSplintOverlay(undefined, auto, 20);
  assert.deepEqual(next.added, [20]);
  assert.deepEqual(combineSplintLinks(auto, next), [13, 20]);
});

test("rules: S1 disabled produces no auto-splint links", () => {
  const roles = { 13: "Prep", 14: "Pontic", 15: "Prep" };
  const rules = withRules({ S1: { enabled: false } });
  assert.deepEqual(deriveAutoSplintLinks([13, 14, 15], roles, rules), []);
});

test("rules: S1 supportRoles restricts which neighbors splint", () => {
  // Only Implant counts as support → pontic+prep does NOT splint, pontic+implant does.
  const rules = withRules({ S1: { supportRoles: ["Implant"] } });
  assert.deepEqual(deriveAutoSplintLinks([5, 6], { 5: "Prep", 6: "Pontic" }, rules), []);
  assert.deepEqual(deriveAutoSplintLinks([5, 6], { 5: "Implant", 6: "Pontic" }, rules), [5]);
});

test("rules: W1 disabled produces no wings", () => {
  const arch = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const rules = withRules({ W1: { enabled: false } });
  assert.deepEqual(deriveWingTeeth({ 14: "Pontic" }, arch, undefined, rules), []);
  assert.deepEqual(formatWingGroupsForApi({ 14: "Pontic" }, arch, undefined, rules), []);
});

test("rules: default catalog matches prior hardcoded behavior", () => {
  const roles = { 13: "Prep", 14: "Pontic", 15: "Prep" };
  assert.deepEqual(
    deriveAutoSplintLinks([13, 14, 15], roles, DEFAULT_RETENTION_RULES),
    deriveAutoSplintLinks([13, 14, 15], roles)
  );
});
