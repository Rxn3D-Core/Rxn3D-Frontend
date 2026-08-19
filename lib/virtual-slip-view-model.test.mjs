import assert from "node:assert/strict";
import test from "node:test";
import { buildVirtualSlipRushArchSlots } from "./virtual-slip-rush-slots.ts";
import { buildVirtualSlipStatusBoxProps } from "./virtual-slip-extraction-display.ts";
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
        has_retention: "No",
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

test("buildVirtualSlipVM uses tooth_chart_preload for arch tooth chart", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    products: [
      {
        type: "Maxillary",
        category: { name: "Removable Restorations" },
        teeth_selection: [7, 8, 9, 10],
        extractions: [
          { extraction_id: 11, teeth_numbers: [1, 16] },
          { extraction_id: 10, teeth_numbers: [2, 15] },
        ],
        product: {
          extractions: [
            {
              extraction_id: 10,
              code: "MT",
              name: "Missing teeth",
              visibility_type: "Image",
              overlay: "No",
              status: "Active",
            },
            {
              extraction_id: 11,
              code: "WEOD",
              name: "Will extract on delivery",
              visibility_type: "Image",
              overlay: "No",
              status: "Active",
            },
            {
              extraction_id: 20,
              code: "TIM",
              name: "Teeth in mouth",
              visibility_type: "Image",
              is_tim: "Yes",
              overlay: "No",
              status: "Active",
            },
          ],
        },
        tooth_chart_preload: {
          arch: "upper",
          tooth_numbers: [1, 2, 7, 8, 9, 10, 15, 16],
          teeth: [
            {
              tooth_number: 2,
              extraction_id: 10,
              default_image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-2.png",
              image_url: "https://example.com/missing-2.png",
              visibility_type: "Image",
              overlay: "No",
            },
            {
              tooth_number: 7,
              extraction_id: null,
              image_url: "https://example.com/product-7.png",
              visibility_type: "Image",
              overlay: "No",
            },
          ],
        },
      },
    ],
  });

  const arch = vm.arches.maxillary;
  assert.ok(arch);
  // Status teeth from preload; product tooth 7 from preload + tooth-chart layer.
  assert.equal(arch.extractionDisplay.extractionImagesByCode.MT[2], "https://example.com/missing-2.png");
  assert.equal(arch.extractionDisplay.toothExtractionMap[7], "TIM");
  assert.equal(
    arch.extractionDisplay.extractionImagesByCode.TIM[7],
    "https://example.com/product-7.png",
  );
  assert.equal(arch.toothChartSelectionsByTooth[7], undefined);
  // Bottom product summary: teeth_selection label + full extraction display for status boxes.
  assert.match(arch.products[0].teethLabel, /7/);
  const statusProps = buildVirtualSlipStatusBoxProps(
    arch.products[0].extractionDisplay,
    "maxillary",
    { apiProduct: arch.products[0].apiProduct },
  );
  assert.ok(statusProps);
  assert.deepEqual(statusProps.displayTeethByCode.MT, [2, 15]);
});

test("buildVirtualSlipVM arch chart merges tooth chart and preload for product teeth", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    products: [
      {
        type: "Maxillary",
        category: { name: "Removable Restorations" },
        teeth_selection: [6, 7, 8, 9, 10, 11],
        extractions: [
          { extraction_id: 10, teeth_numbers: [2, 15] },
        ],
        slip_product_teeth_selections: [
          {
            tooth_number: 8,
            selected_tooth_image_url: "https://example.com/metal-frame-8.png",
            extraction: { code: "TIM", name: "Teeth in mouth", is_tim: "Yes", status: "Active" },
          },
        ],
        product: {
          extractions: [
            {
              extraction_id: 10,
              code: "MT",
              name: "Missing teeth",
              visibility_type: "Image",
              overlay: "No",
              status: "Active",
            },
            {
              extraction_id: 20,
              code: "TIM",
              name: "Teeth in mouth",
              is_tim: "Yes",
              visibility_type: "Image",
              overlay: "No",
              status: "Active",
            },
          ],
        },
        tooth_chart_preload: {
          arch: "upper",
          teeth: [
            {
              tooth_number: 8,
              extraction_id: null,
              default_image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-8.png",
              image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-8.png",
              visibility_type: "Image",
              overlay: "No",
            },
          ],
        },
      },
    ],
  });

  const arch = vm.arches.maxillary;
  assert.ok(arch);
  assert.equal(arch.extractionDisplay.toothExtractionMap[8], "TIM");
  assert.equal(
    arch.extractionDisplay.extractionImagesByCode.TIM[8],
    "https://example.com/metal-frame-8.png",
  );
  assert.equal(arch.toothChartSelectionsByTooth[8], undefined);
  assert.match(arch.products[0].teethLabel, /8/);
  assert.equal(
    arch.products[0].extractionDisplay.extractionImagesByCode.TIM?.[8],
    "https://example.com/metal-frame-8.png",
  );
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

test("dual-arch slip hides opposing impressions on columns that have products", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    products: [
      {
        type: "Upper",
        category: { name: "Removable Restorations" },
        product: { name: "Full Denture Acrylic" },
        teeth_selection: [1, 2, 3],
        impressions: [{ quantity: 1, impression: { name: "Alginate" } }],
        opposite_impression: "Yes",
        opposite_impressions: [{ quantity: 1, impression: { name: "Opposing alginate" } }],
      },
      {
        type: "Lower",
        category: { name: "Removable Restorations" },
        product: { name: "Full Denture Acrylic" },
        teeth_selection: [17, 18, 19],
        impressions: [{ quantity: 1, impression: { name: "Alginate" } }],
        opposite_impression: "Yes",
        opposite_impressions: [{ quantity: 1, impression: { name: "Other opposing alginate" } }],
      },
    ],
  });

  assert.equal(vm.arches.maxillary?.opposing, null);
  assert.equal(vm.arches.mandibular?.opposing, null);
  assert.match(vm.arches.maxillary?.products[0]?.impression ?? "", /Alginate/);
  assert.match(vm.arches.mandibular?.products[0]?.impression ?? "", /Alginate/);
});

test("dual-arch slip ignores opposing extractions when target arch has its own product", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    products: [
      {
        type: "Upper",
        category: { name: "Removable Restorations" },
        product: { name: "Full Denture Acrylic" },
        teeth_selection: [1, 2, 3],
        opposite_extractions: [
          {
            extraction_id: 10,
            teeth_numbers: [17, 18],
            extraction: { code: "MT_L1_G2", name: "Missing teeth" },
          },
        ],
      },
      {
        type: "Lower",
        category: { name: "Removable Restorations" },
        product: { name: "Full Denture Acrylic" },
        teeth_selection: [17, 18, 19],
        opposite_extractions: [
          {
            extraction_id: 10,
            teeth_numbers: [1, 2],
            extraction: { code: "MT_L1_G2", name: "Missing teeth" },
          },
        ],
      },
    ],
  });

  assert.equal(vm.arches.maxillary?.opposing, null);
  assert.equal(vm.arches.mandibular?.opposing, null);
  assert.equal(vm.arches.maxillary?.extractionDisplay.toothExtractionMap[17], undefined);
  assert.equal(vm.arches.maxillary?.extractionDisplay.toothExtractionMap[1], undefined);
  assert.equal(vm.arches.mandibular?.extractionDisplay.toothExtractionMap[1], undefined);
  assert.equal(vm.arches.mandibular?.extractionDisplay.toothExtractionMap[17], undefined);
});

test("single-arch slip still shows opposing impressions on the opposing-only column", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    products: [
      {
        type: "Upper",
        category: { name: "Removable Restorations" },
        product: { name: "Full Denture Acrylic" },
        teeth_selection: [1, 2, 3],
        impressions: [{ quantity: 1, impression: { name: "Alginate" } }],
        opposite_impression: "Yes",
        opposite_impressions: [{ quantity: 1, impression: { name: "Mandibular scan" } }],
      },
    ],
  });

  assert.equal(vm.arches.maxillary?.opposing, null);
  assert.equal(vm.arches.mandibular?.products.length, 0);
  assert.equal(vm.arches.mandibular?.opposing?.showImpression, true);
  assert.match(vm.arches.mandibular?.opposing?.impression ?? "", /Mandibular scan/);
});

test("header dueDate prefers delivery.final_date over delivery_date", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    delivery: {
      delivery_date: "2026-08-24T07:00:00.000000Z",
      delivery_time: "2026-08-18T00:00:00.000000Z",
      pickup_date: "2026-08-17T07:00:00.000000Z",
      pickup_time: "2026-08-17T07:30:00.000000Z",
      final_date: "2026-08-14",
    },
  });

  assert.equal(vm.header.dueDate, "08/14/26");
  assert.equal(vm.header.pickupDate, "08/17/26");
  assert.equal(vm.header.deliveryTime, "4:00 PM");
});

test("header deliveryTime uses lab default_delivery_time when slip time is midnight", () => {
  const vm = buildVirtualSlipVM(
    {
      case: { patient_name: "Test" },
      delivery: {
        delivery_date: "2026-08-24T07:00:00.000000Z",
        delivery_time: "2026-08-18T00:00:00.000000Z",
      },
    },
    { defaultDeliveryTime: "16:00" },
  );

  assert.equal(vm.header.deliveryTime, "4:00 PM");
});

test("header deliveryTime keeps a real slip clock instead of the lab default", () => {
  const vm = buildVirtualSlipVM(
    {
      case: { patient_name: "Test" },
      delivery: { delivery_time: "2026-08-18T15:30:00.000000Z" },
    },
    { defaultDeliveryTime: "16:00" },
  );

  assert.equal(vm.header.deliveryTime, "3:30 PM");
});

test("header dueDate prefers delivery.final_date even when the slip is rushed", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    is_rush: true,
    requested_rush_date: "2026-08-20T00:00:00.000000Z",
    delivery: {
      delivery_date: "2026-08-24T07:00:00.000000Z",
      final_date: "2026-08-14",
    },
  });

  assert.equal(vm.header.dueDate, "08/14/26");
  assert.equal(vm.header.isRush, true);
  assert.equal(vm.header.rushDueDate, "08/20/26");
});

test("header dueDate falls back to delivery_date when final_date is missing", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Test" },
    delivery: { delivery_date: "2026-08-24T07:00:00.000000Z" },
  });

  assert.equal(vm.header.dueDate, "08/24/26");
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
