import test from "node:test";
import assert from "node:assert/strict";

import { readPlanError, planErrorReaction, createNoticeDeduper } from "./plan-error-reaction.ts";

const SUBS = "/billing/subscriptions";
const advanceBody = { error: "feature_not_available", feature_key: "product.advance_mode", upgrade_required: true };

test("readPlanError recognises plan errors only", () => {
  const cases = [
    { name: "advance 403", args: [403, "/v1/library/advance/fields", advanceBody], expected: { code: "feature_not_available", featureKey: "product.advance_mode" } },
    { name: "slip limit 402", args: [402, "/v1/slip", { error: "plan_limit_exceeded", feature_key: "slip.creation.monthly_limit" }], expected: { code: "plan_limit_exceeded", featureKey: "slip.creation.monthly_limit" } },
    { name: "code field, upper case", args: [403, "/v1/x", { code: "ADDON_NOT_AVAILABLE" }], expected: { code: "addon_not_available", featureKey: null } },
    { name: "permission 403", args: [403, "/v1/x", { error: "forbidden" }], expected: null },
    { name: "entitlements url", args: [403, "/v1/entitlements?lab_id=1", advanceBody], expected: null },
    { name: "other status", args: [500, "/v1/x", advanceBody], expected: null },
    { name: "no body", args: [403, "/v1/x", null], expected: null },
  ];
  for (const c of cases) {
    assert.deepEqual(readPlanError(...c.args), c.expected, c.name);
  }
});

test("planErrorReaction redirects only for the slip creation limit", () => {
  assert.equal(planErrorReaction({ code: "feature_not_available", featureKey: "product.advance_mode" }, "/lab-product-library/products", SUBS), "notify");
  assert.equal(planErrorReaction({ code: "plan_limit_exceeded", featureKey: "seats.user_limit" }, "/users", SUBS), "notify");
  assert.equal(planErrorReaction({ code: "plan_limit_exceeded", featureKey: "slip.creation.monthly_limit" }, "/case-design-center", SUBS), "redirect");
  assert.equal(planErrorReaction({ code: "plan_limit_exceeded", featureKey: "slip.creation.monthly_limit" }, SUBS, SUBS), "none");
  assert.equal(planErrorReaction({ code: "feature_not_available", featureKey: null }, `${SUBS}/plans`, SUBS), "none");
});

test("createNoticeDeduper lets one notice through per window", () => {
  const allow = createNoticeDeduper(8000);
  assert.equal(allow(1000), true);
  assert.equal(allow(1001), false);
  assert.equal(allow(8999), false);
  assert.equal(allow(9000), true);
  assert.equal(createNoticeDeduper(8000)(0), true, "first call always passes");
});
