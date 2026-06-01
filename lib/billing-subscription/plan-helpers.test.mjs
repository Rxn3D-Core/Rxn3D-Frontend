import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveNextBillingPeriodEnd,
  formatBillingDate,
} from "./plan-helpers.ts";

test("resolveNextBillingPeriodEnd prefers the billing profile period end", () => {
  const periodEnd = resolveNextBillingPeriodEnd(
    "2026-06-30T23:59:59.999Z",
    "2026-06-29T23:59:59.999Z",
  );

  assert.equal(periodEnd, "2026-06-30T23:59:59.999Z");
});

test("resolveNextBillingPeriodEnd falls back to billing usage period end", () => {
  const periodEnd = resolveNextBillingPeriodEnd(
    null,
    "2026-06-30T23:59:59.999Z",
  );

  assert.equal(periodEnd, "2026-06-30T23:59:59.999Z");
});

test("formatBillingDate renders the resolved fallback date", () => {
  const label = formatBillingDate(
    resolveNextBillingPeriodEnd(null, "2026-06-30"),
  );

  assert.equal(label, "Jun 30, 2026");
});
