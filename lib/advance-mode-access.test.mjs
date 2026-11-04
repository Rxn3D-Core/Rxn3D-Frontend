import test from "node:test";
import assert from "node:assert/strict";

import { canUseAdvanceMode, withoutAdvanceFieldsTab, ADVANCE_FIELDS_TAB_ID } from "./advance-mode-access.ts";

const base = {
  isSuperadmin: false,
  isActingAsLabAdmin: false,
  entitlementsLoading: false,
  hasAdvanceModeFeature: false,
};

test("canUseAdvanceMode follows the plan feature for lab users", () => {
  const cases = [
    { name: "freemium lab", input: { ...base }, expected: false },
    { name: "paid lab", input: { ...base, hasAdvanceModeFeature: true }, expected: true },
    { name: "paid lab while entitlements load", input: { ...base, hasAdvanceModeFeature: true, entitlementsLoading: true }, expected: false },
    { name: "freemium lab while entitlements load", input: { ...base, entitlementsLoading: true }, expected: false },
  ];
  for (const c of cases) {
    assert.equal(canUseAdvanceMode(c.input), c.expected, c.name);
  }
});

test("canUseAdvanceMode keeps superadmin access unless acting as lab admin", () => {
  assert.equal(canUseAdvanceMode({ ...base, isSuperadmin: true }), true);
  assert.equal(canUseAdvanceMode({ ...base, isSuperadmin: true, entitlementsLoading: true }), true);
  assert.equal(canUseAdvanceMode({ ...base, isSuperadmin: true, isActingAsLabAdmin: true }), false);
  assert.equal(
    canUseAdvanceMode({ ...base, isSuperadmin: true, isActingAsLabAdmin: true, hasAdvanceModeFeature: true }),
    true,
  );
});

test("withoutAdvanceFieldsTab removes only the Advance Field tab when not allowed", () => {
  const tabs = [{ id: "details" }, { id: "toothChartConfigurations" }, { id: ADVANCE_FIELDS_TAB_ID }];
  assert.deepEqual(withoutAdvanceFieldsTab(tabs, true), tabs);
  assert.deepEqual(
    withoutAdvanceFieldsTab(tabs, false).map((t) => t.id),
    ["details", "toothChartConfigurations"],
  );
  assert.equal(withoutAdvanceFieldsTab(tabs, true), tabs, "allowed returns the same array reference");
});
