import test from "node:test";
import assert from "node:assert/strict";

import {
  countSlipUsageInPeriod,
  resolveUsagePeriod,
} from "./usage-fallback.ts";

test("resolveUsagePeriod uses explicit billing period when present", () => {
  const period = resolveUsagePeriod(
    "2026-05-10T00:00:00.000Z",
    "2026-06-09T23:59:59.999Z",
    new Date("2026-05-30T10:00:00.000Z"),
  );

  assert.equal(period.start.toISOString(), "2026-05-10T00:00:00.000Z");
  assert.equal(period.end.toISOString(), "2026-06-09T23:59:59.999Z");
});

test("resolveUsagePeriod falls back to current calendar month when billing period is missing", () => {
  const period = resolveUsagePeriod(
    null,
    null,
    new Date("2026-05-30T10:00:00.000Z"),
  );

  assert.equal(period.start.toISOString(), "2026-05-01T00:00:00.000Z");
  assert.equal(period.end.toISOString(), "2026-05-31T23:59:59.999Z");
});

test("countSlipUsageInPeriod counts only slips inside the billing period", () => {
  const count = countSlipUsageInPeriod(
    [
      { timestamp: "2026-05-09T23:59:59.999Z" },
      { timestamp: "2026-05-10T00:00:00.000Z" },
      { created_at: "2026-05-15T08:30:00.000Z" },
      { timestamp: "2026-06-09T23:59:59.999Z" },
      { timestamp: "2026-06-10T00:00:00.000Z" },
      { timestamp: "not-a-date" },
    ],
    {
      start: new Date("2026-05-10T00:00:00.000Z"),
      end: new Date("2026-06-09T23:59:59.999Z"),
    },
  );

  assert.equal(count, 3);
});
