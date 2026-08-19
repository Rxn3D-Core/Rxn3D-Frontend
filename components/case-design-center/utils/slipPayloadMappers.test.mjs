import assert from "node:assert/strict";
import test from "node:test";

import {
  buildImplantAndAbutmentDetails,
  buildProductExtractions,
  buildRetentionOptions,
  buildRetentions,
  buildTeethSelection,
  buildToothChart,
  groupProductsIntoSlips,
  normalizeRush,
} from "./slipPayloadMappers.ts";

test("normalizeRush maps targetDate to API rush", () => {
  assert.deepEqual(normalizeRush({ targetDate: "2026-06-01" }), {
    is_rush: true,
    requested_rush_date: "2026-06-01",
  });
});

test("normalizeRush returns is_rush false when no rush", () => {
  assert.deepEqual(normalizeRush(null), { is_rush: false });
  assert.deepEqual(normalizeRush({}), { is_rush: false });
});

test("normalizeRush includes notes when provided", () => {
  assert.deepEqual(
    normalizeRush({
      targetDate: "2025-07-20",
      notes: "Patient needs this urgently",
    }),
    {
      is_rush: true,
      requested_rush_date: "2025-07-20",
      notes: "Patient needs this urgently",
    }
  );
});

test("normalizeRush passes through API-shaped rush", () => {
  assert.deepEqual(
    normalizeRush({ is_rush: true, requested_rush_date: "2026-07-15" }),
    { is_rush: true, requested_rush_date: "2026-07-15" }
  );
});

test("groupProductsIntoSlips pairs same product_id on both arches", () => {
  const upper = { type: "Upper", product_id: 101, stage_id: 2 };
  const lower = { type: "Lower", product_id: 101, stage_id: 2 };
  const otherUpper = { type: "Upper", product_id: 102, stage_id: 2 };
  const groups = groupProductsIntoSlips([upper, lower, otherUpper]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], [upper, lower]);
  assert.deepEqual(groups[1], [otherUpper]);
});

test("groupProductsIntoSlips keeps one upper and one lower on the same slip", () => {
  const upper = { type: "Upper", product_id: 101, stage_id: 2 };
  const lower = { type: "Lower", product_id: 102, stage_id: 2 };
  const groups = groupProductsIntoSlips([upper, lower]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0], [upper, lower]);
});

test("groupProductsIntoSlips pairs same product_id first when lower has two products", () => {
  const upper = { type: "Upper", product_id: 101, stage_id: 2 };
  const lowerMatch = { type: "Lower", product_id: 101, stage_id: 2 };
  const lowerOther = { type: "Lower", product_id: 102, stage_id: 2 };
  const groups = groupProductsIntoSlips([upper, lowerOther, lowerMatch]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], [upper, lowerMatch]);
  assert.deepEqual(groups[1], [lowerOther]);
});

test("groupProductsIntoSlips pairs remaining products by order on both arches", () => {
  const upperFda = { type: "Upper", product_id: 101, stage_id: 2 };
  const upperCrown = { type: "Upper", product_id: 103, stage_id: 2 };
  const lowerIsp = { type: "Lower", product_id: 102, stage_id: 2 };
  const lowerFda = { type: "Lower", product_id: 101, stage_id: 2 };
  const groups = groupProductsIntoSlips([upperFda, upperCrown, lowerIsp, lowerFda]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], [upperFda, lowerFda]);
  assert.deepEqual(groups[1], [upperCrown, lowerIsp]);
});

test("groupProductsIntoSlips pairs by order then leaves orphan lowers", () => {
  const upper = { type: "Upper", product_id: 103, stage_id: 2 };
  const lowerFirst = { type: "Lower", product_id: 102, stage_id: 2 };
  const lowerSecond = { type: "Lower", product_id: 104, stage_id: 2 };
  const groups = groupProductsIntoSlips([upper, lowerFirst, lowerSecond]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0], [upper, lowerFirst]);
  assert.deepEqual(groups[1], [lowerSecond]);
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

test("buildRetentionOptions resolves pontic by selector_shape", () => {
  const product = {
    has_retention: "Yes",
    retention_options: [
      {
        id: 2,
        retention_option_id: 77,
        name: "Custom pontic",
        selector_shape: "Pontic",
        has_implant: "No",
      },
    ],
  };
  const rows = buildRetentionOptions(product, { 10: ["Pontic"] }, [10]);
  assert.deepEqual(rows, [{ retention_option_id: 77, teeth_number: 10 }]);
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

test("buildToothChart emits one row per selected tooth with chart fields", () => {
  const product = {
    has_retention: "Yes",
    has_extraction: "Yes",
    retention_options: [
      {
        id: 1,
        retention_option_id: 55,
        tooth_chart_type: "Prep",
        name: "Prep",
        retentions: [{ id: 5, name: "Cemented", status: "Active" }],
      },
    ],
    extractions: [
      { id: 20, extraction_id: 202, code: "MT", overlay: "No", status: "Active", name: "MT" },
    ],
  };
  const rows = buildToothChart(
    product,
    { fixed_retention_type: "Cemented" },
    { 8: ["Prep"] },
    { 8: "MT" },
    [],
    [8, 9],
    [{ extraction_id: 303, teeth_numbers: [9] }]
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    tooth_number: 8,
    chart_type: "Prep",
    retention_id: 5,
    retention_option_id: 55,
    extraction_id: 202,
  });
  assert.deepEqual(rows[1], {
    tooth_number: 9,
    opposite_extraction_id: 303,
  });
});

test("buildTeethSelection emits per-tooth rows with optional retention/extraction", () => {
  const product = {
    has_retention: "Yes",
    has_extraction: "Yes",
    retention_options: [
      { id: 1, retention_option_id: 55, tooth_chart_type: "Prep", name: "Prep" },
    ],
    extractions: [
      { id: 20, extraction_id: 202, code: "MT", overlay: "No", status: "Active", name: "MT" },
    ],
  };
  const rows = buildTeethSelection(product, { 8: ["Prep"] }, { 8: "MT" }, [], [8, 9]);
  assert.deepEqual(rows, [
    { teeth_number: 8, retention_option_id: 55, extraction_ids: [202] },
    { teeth_number: 9 },
  ]);
});

test("buildTeethSelection fills default tooth chart retention and extraction ids", () => {
  const product = {
    type: "Upper",
    has_retention: "Yes",
    has_extraction: "Yes",
    has_default_tooth_chart: "Yes",
    allow_select_only_implant: "Yes",
    retention_options: [
      { id: 1, retention_option_id: 7, tooth_chart_type: "Implant", name: "Implant" },
    ],
    extractions: [
      {
        id: 1,
        extraction_id: 1,
        code: "Def",
        name: "Default",
        status: "Active",
        is_default: "Yes",
        overlay: "No",
      },
    ],
    default_tooth_chart: [
      { tooth_number: 3, retention_option_id: 7, chart_type: "Implant" },
      { tooth_number: 4, extraction_id: null, retention_option_id: null, chart_type: null },
    ],
  };
  const rows = buildTeethSelection(product, { 3: ["Implant"] }, {}, [], [3, 4]);
  assert.deepEqual(rows, [
    { teeth_number: 3, retention_option_id: 7 },
    { teeth_number: 4, extraction_ids: [1] },
  ]);
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

test("buildImplantAndAbutmentDetails sends abutment type and option IDs", () => {
  const product = {
    abutments: [
      {
        id: 11,
        type: "Office Provided",
        options: [
          { id: 22, abutment_type_id: 33, name: "Stock Abutment" },
        ],
      },
    ],
  };
  const implantDetailByTooth = {
    8: {
      brand: "Brand A",
      systemName: "System X",
      platform: "NP",
      size: "3.5 x 10",
      inclusions: "No inclusion",
      inclusionQty: 0,
      abutmentType: "Office Provided",
      abutmentDetail: "Stock Abutment",
      dynamicFields: {},
    },
  };
  const implantCatalog = [
    {
      id: 100,
      brand_name: "Brand A",
      system_name: "System X",
      platforms: [
        {
          id: 200,
          name: "NP",
          sizes: [{ id: 300, label: "3.5 x 10" }],
        },
      ],
    },
  ];

  const { abutment_details } = buildImplantAndAbutmentDetails(
    product,
    implantDetailByTooth,
    implantCatalog
  );
  assert.deepEqual(abutment_details, [
    {
      teeth_number: 8,
      abutment_id: 11,
      abutment_type_id: 33,
      abutment_option_id: 22,
    },
  ]);
});
