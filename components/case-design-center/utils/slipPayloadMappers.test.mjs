import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProductExtractions,
  buildRetentionOptions,
  buildRetentions,
  normalizeRush,
} from "./slipPayloadMappers.ts";

test("normalizeRush maps targetDate to API rush", () => {
  assert.deepEqual(normalizeRush({ targetDate: "2026-06-01" }), {
    is_rush: true,
    requested_rush_date: "2026-06-01",
  });
});

test("normalizeRush passes through API-shaped rush", () => {
  assert.deepEqual(
    normalizeRush({ is_rush: true, requested_rush_date: "2026-07-15" }),
    { is_rush: true, requested_rush_date: "2026-07-15" }
  );
});

test("buildProductExtractions groups teeth by extraction_id", () => {
  const product = {
    has_extraction: "Yes",
    extractions: [
      { id: 10, extraction_id: 101, code: "TIM", is_tim: "Yes", overlay: "No", status: "Active", name: "TIM", is_default: "Yes" },
      { id: 20, extraction_id: 202, code: "MT", overlay: "No", status: "Active", name: "MT" },
    ],
  };
  const result = buildProductExtractions(
    product,
    { 4: "MT" },
    [],
    [4, 5]
  );
  assert.equal(result.length, 2);
  const mt = result.find((r) => r.extraction_id === 202);
  assert.deepEqual(mt?.teeth_numbers, [4]);
});

test("buildRetentionOptions emits per-tooth retention_option_id", () => {
  const product = {
    has_retention: "Yes",
    retention_options: [
      { id: 1, retention_option_id: 55, tooth_chart_type: "Prep", name: "Prep" },
    ],
  };
  const rows = buildRetentionOptions(product, { 8: ["Prep"] }, [8]);
  assert.deepEqual(rows, [{ retention_option_id: 55, teeth_number: 8 }]);
});

test("buildRetentions emits multiple mechanisms from comma-separated field", () => {
  const product = {
    has_retention: "Yes",
    retention_options: [
      {
        id: 1,
        tooth_chart_type: "Implant",
        name: "Implant",
        retentions: [{ id: 4, name: "Screwed", status: "Active" }],
      },
      {
        id: 2,
        tooth_chart_type: "Prep",
        name: "Prepped",
        retentions: [{ id: 5, name: "Cemented", status: "Active" }],
      },
    ],
  };
  const rows = buildRetentions(
    product,
    { fixed_retention_type: "Screwed, Cemented" },
    { 8: ["Implant"], 9: ["Prep"] },
    [8, 9]
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((r) => r.retention_id).sort((a, b) => a - b),
    [4, 5]
  );
  assert.equal(rows.find((r) => r.retention_id === 4)?.teeth_number, 8);
  assert.equal(rows.find((r) => r.retention_id === 5)?.teeth_number, 9);
});

test("buildRetentions falls back to field names when chart map empty", () => {
  const product = {
    has_retention: "Yes",
    retention_options: [
      {
        id: 1,
        tooth_chart_type: "Implant",
        retentions: [
          { id: 4, name: "Screwed", status: "Active" },
          { id: 5, name: "Cemented", status: "Active" },
        ],
      },
    ],
  };
  const rows = buildRetentions(
    product,
    { fixed_retention_type: "Screwed, Cemented" },
    {},
    []
  );
  assert.deepEqual(
    rows.map((r) => r.retention_id).sort((a, b) => a - b),
    [4, 5]
  );
});
