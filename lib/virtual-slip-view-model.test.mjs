import assert from "node:assert/strict";
import test from "node:test";
import { buildVirtualSlipRushArchSlots } from "./virtual-slip-rush-slots.ts";
import {
  buildVirtualSlipVM,
  getSlipProductArchVisibility,
} from "./virtual-slip-view-model.ts";

test("buildArch maps fixed product retention_options to tooth chart selections", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    products: [
      {
        type: "Maxillary",
        category: { name: "Fixed Restorations" },
        teeth_selection: [8, 9],
        retention_options: [
          {
            id: 4,
            name: "Implant",
            code: "I",
            teeth_number: 8,
            selected_tooth_image_url:
              "https://example.com/tooth-8-implant.png",
            visibility_type: "Image",
          },
          {
            id: 2,
            name: "Prep",
            tooth_chart_type: "Prep",
            teeth_number: 9,
            selected_tooth_image_url: "https://example.com/tooth-9-prep.png",
          },
        ],
      },
    ],
  });

  const chart = vm.arches.maxillary?.toothChartSelectionsByTooth ?? {};
  assert.equal(chart[8]?.chartType, "Implant");
  assert.equal(chart[8]?.imageUrl, "https://example.com/tooth-8-implant.png");
  assert.equal(chart[9]?.chartType, "Prep");
  assert.equal(chart[9]?.imageUrl, "https://example.com/tooth-9-prep.png");
});

test("retention_options tooth chart is skipped for removable products", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    products: [
      {
        type: "Maxillary",
        category: { name: "Removable Restorations" },
        teeth_selection: [8],
        retention_options: [
          {
            teeth_number: 8,
            name: "Implant",
            selected_tooth_image_url: "https://example.com/should-not-show.png",
          },
        ],
      },
    ],
  });

  const chart = vm.arches.maxillary?.toothChartSelectionsByTooth ?? {};
  assert.equal(chart[8], undefined);
});

test("retention_options override fills image when tooth_chart row lacks selected_image_url", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    products: [
      {
        type: "Mandibular",
        category: { name: "Fixed Restorations" },
        teeth_selection: [24],
        tooth_chart: [{ tooth_number: 24, chart_type: "Prep" }],
        retention_options: [
          {
            teeth_number: 24,
            name: "Prep",
            selected_tooth_image_url: "https://example.com/tooth-24.png",
          },
        ],
      },
    ],
  });

  const chart = vm.arches.mandibular?.toothChartSelectionsByTooth ?? {};
  assert.equal(chart[24]?.chartType, "Prep");
  assert.equal(chart[24]?.imageUrl, "https://example.com/tooth-24.png");
});

test("getSlipProductArchVisibility returns upper-only when only Upper products", () => {
  const vis = getSlipProductArchVisibility([{ type: "Upper" }, { type: "Maxillary" }]);
  assert.equal(vis.hasMaxillary, true);
  assert.equal(vis.hasMandibular, false);
  assert.deepEqual(vis.visibleArches, ["maxillary"]);
});

test("getSlipProductArchVisibility returns lower-only when only Lower products", () => {
  const vis = getSlipProductArchVisibility([{ type: "Lower" }]);
  assert.equal(vis.hasMaxillary, false);
  assert.equal(vis.hasMandibular, true);
  assert.deepEqual(vis.visibleArches, ["mandibular"]);
});

test("buildVirtualSlipRushArchSlots includes only arches with products", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    products: [
      {
        id: 101,
        type: "Maxillary",
        product: { id: 5, name: "Crown" },
        teeth_selection: [8, 9],
        stage: { name: "Finish", work_days: 5 },
      },
    ],
  });

  const slots = buildVirtualSlipRushArchSlots(vm.arches, "2026-06-10");
  assert.equal(slots.length, 1);
  assert.equal(slots[0].arch, "maxillary");
  assert.equal(slots[0].productName, "Crown");
  assert.equal(slots[0].repTooth, 8);
  assert.equal(slots[0].actualDeliveryDate, "2026-06-10");
});

test("buildVirtualSlipRushArchSlots emits one slot per product per arch", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    delivery: { delivery_date: "2026-07-01T00:00:00Z" },
    products: [
      {
        id: 1,
        type: "Maxillary",
        product: { id: 10, name: "Upper A" },
        teeth_selection: [7],
      },
      {
        id: 2,
        type: "Mandibular",
        product: { id: 11, name: "Lower B" },
        teeth_selection: [24],
      },
    ],
  });

  const slots = buildVirtualSlipRushArchSlots(vm.arches, "2026-07-01");
  assert.equal(slots.length, 2);
  assert.deepEqual(
    slots.map((s) => s.arch),
    ["maxillary", "mandibular"]
  );
});
