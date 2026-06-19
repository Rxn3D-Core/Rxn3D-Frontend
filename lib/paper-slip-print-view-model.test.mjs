import assert from "node:assert/strict";
import test from "node:test";
import { buildPaperSlipPrintSlipVM, buildPaperSlipPrintVM } from "./paper-slip-print-view-model.ts";

function makeDefaultProduct(overrides = {}) {
  return {
    type: "Upper",
    teeth_selection: "8,9,10",
    category: { name: "Fixed Restoration" },
    product: { id: 1, name: "Zirconia Crown" },
    stage: { name: "Finish" },
    grade: { name: "Premium" },
    teeth_shade: { name: "A2" },
    gum_shade: { name: "G3" },
    stump_shade: { name: "ND2" },
    impressions: [{ quantity: 1, impression: { name: "STL" } }],
    addons: [{ quantity: 2, addon: { name: "Gold tooth" } }],
    selected_teeth: [],
    retentions: [],
    retention_options: [],
    extractions: [],
    ...overrides,
  };
}

test("extraction mode wins for an arch and suppresses retention visuals on other teeth", () => {
  const vm = buildPaperSlipPrintVM({
    products: [
      makeDefaultProduct({
        selected_teeth: [
          { tooth_number: 8, extraction_ids: [202], retention_option_id: 55 },
          { tooth_number: 9, retention_option_id: 55 },
          { tooth_number: 10 },
        ],
        extractions: [
          {
            id: 20,
            extraction_id: 202,
            name: "Missing teeth",
            image_url: "https://example.com/extractions/8.png",
            images: [{ tooth_number: 8, image_url: "https://example.com/extractions/8.png" }],
          },
        ],
        retention_options: [
          {
            id: 99,
            retention_option_id: 55,
            name: "Implant",
            tooth_chart_type: "Implant",
            image_url: "https://example.com/retention/fallback.png",
            images: [{ tooth_number: 9, image_url: "https://example.com/retention/9.png" }],
            retentions: [{ name: "Screwed", status: "Active" }],
          },
        ],
      }),
    ],
  });

  const arch = vm.arches.maxillary;
  assert.ok(arch);
  assert.equal(arch.mode, "extraction");
  assert.equal(arch.toothChartSelectionsByTooth[8].source, "extraction");
  assert.equal(arch.toothChartSelectionsByTooth[8].imageUrl, "https://example.com/extractions/8.png");
  assert.equal(arch.toothChartSelectionsByTooth[9].source, "default");
  assert.match(arch.toothChartSelectionsByTooth[9].imageUrl, /\/images\/teeth\/maxillary\/tooth-9\.png/);
  assert.deepEqual(
    arch.callouts.map((item) => ({ label: item.label, teeth: item.teethNumbers })),
    [{ label: "Missing teeth", teeth: [8] }],
  );
});

test("retention mode applies when the arch has no extraction visuals and fills the rest with defaults", () => {
  const vm = buildPaperSlipPrintVM({
    products: [
      makeDefaultProduct({
        selected_teeth: [{ tooth_number: 8, retention_option_id: 55 }, { tooth_number: 9 }],
        retention_options: [
          {
            id: 99,
            retention_option_id: 55,
            name: "Prep",
            tooth_chart_type: "Prepped",
            image_url: "https://example.com/retention/fallback.png",
            images: [{ tooth_number: 8, image_url: "https://example.com/retention/8.png" }],
            retentions: [{ name: "Cemented", status: "Active" }],
          },
        ],
      }),
    ],
  });

  const arch = vm.arches.maxillary;
  assert.ok(arch);
  assert.equal(arch.mode, "retention");
  assert.equal(arch.toothChartSelectionsByTooth[8].source, "retention");
  assert.equal(arch.toothChartSelectionsByTooth[8].imageUrl, "https://example.com/retention/8.png");
  assert.equal(arch.toothChartSelectionsByTooth[9].source, "default");
  assert.deepEqual(
    arch.callouts.map((item) => ({ label: item.label, teeth: item.teethNumbers })),
    [{ label: "Prep", teeth: [8] }],
  );
});

test("full-arch denture (every tooth missing) collapses to the All teeth missing callout", () => {
  const allLower = Array.from({ length: 16 }, (_, i) => i + 17);
  const vm = buildPaperSlipPrintVM({
    products: [
      makeDefaultProduct({
        type: "Lower",
        teeth_selection: allLower.join(","),
        missing_teeth: allLower.join(","),
        category: { name: "Removable Prosthetics" },
        product: { id: 2, name: "Full Denture" },
        selected_teeth: allLower.map((tooth_number) => ({ tooth_number })),
      }),
    ],
  });

  const arch = vm.arches.mandibular;
  assert.ok(arch);
  assert.equal(arch.allMissing, true);
  assert.deepEqual(
    arch.callouts.map((item) => item.label),
    ["All teeth missing"],
  );
  assert.equal(arch.detailRows[0].kind, "removable");
});

test("partial missing keeps a per-tooth Missing teeth callout (not All teeth missing)", () => {
  const vm = buildPaperSlipPrintVM({
    products: [
      makeDefaultProduct({
        type: "Lower",
        teeth_selection: "17,18,19,20",
        missing_teeth: "17,18,19,20",
        category: { name: "Removable Prosthetics" },
        product: { id: 2, name: "Stay Plate" },
        selected_teeth: [{ tooth_number: 17 }, { tooth_number: 18 }, { tooth_number: 19 }, { tooth_number: 20 }],
      }),
    ],
  });

  const arch = vm.arches.mandibular;
  assert.ok(arch);
  assert.equal(arch.allMissing, false);
  // teeth 17-20 are flagged missing on the chart even without a per-tooth image.
  for (const tooth of [17, 18, 19, 20]) {
    assert.equal(arch.teeth.find((t) => t.number === tooth)?.status, "missing");
  }
});

test("mixed arches include fixed, implant-retention, removable, and synthetic mixed detail rows", () => {
  const vm = buildPaperSlipPrintVM({
    products: [
      makeDefaultProduct({
        teeth_selection: "8",
        selected_teeth: [{ tooth_number: 8 }],
      }),
      makeDefaultProduct({
        teeth_selection: "9",
        product: { id: 3, name: "Implant Crown" },
        selected_teeth: [{ tooth_number: 9, retention_option_id: 55 }],
        retention_options: [
          {
            id: 99,
            retention_option_id: 55,
            name: "Implant",
            tooth_chart_type: "Implant",
            image_url: "https://example.com/retention/9.png",
            retentions: [{ name: "Screwed", status: "Active" }],
          },
        ],
        retentions: [{ tooth_number: 9, retention: { name: "Implant" } }],
      }),
      makeDefaultProduct({
        teeth_selection: "10,11",
        category: { name: "Removable Prosthetics" },
        product: { id: 4, name: "Flipper" },
        selected_teeth: [{ tooth_number: 10 }, { tooth_number: 11 }],
      }),
    ],
  });

  const arch = vm.arches.maxillary;
  assert.ok(arch);
  assert.deepEqual(
    arch.detailRows.map((row) => row.kind),
    ["mixed", "fixed", "implant_retention", "removable"],
  );
  assert.deepEqual(
    arch.detailRows[0].fields,
    [{ label: "Contains", value: "fixed, implant retention, removable" }],
  );
  assert.deepEqual(
    arch.detailRows[2].fields.find((field) => field.label === "Retention"),
    { label: "Retention", value: "Screwed" },
  );
});

test("buildPaperSlipPrintSlipVM maps header, footer, notes, and chart-ready arch state", () => {
  const slip = buildPaperSlipPrintSlipVM({
    id: 96,
    slip_number: "S96",
    location: { name: "In lab" },
    delivery: {
      pickup_date: "2026-06-04T07:00:00.000000Z",
      delivery_date: "2026-06-18T07:00:00.000000Z",
      delivery_time: "2026-06-05T00:00:00.000000Z",
    },
    casepan: { number: "A0L" },
    notes: [{ note: "Please fabricate a Single Crown for teeth #8-#10." }],
    case: {
      case_number: "C91",
      patient_name: "test case",
      gender: "Male",
      age: null,
      lab: { name: "HMC innovs LLC", phone: "(702) 555-0123", email: "lab@hmcinnvs.com" },
      office: { name: "4M Dental Implants" },
      doctor: { name: "Michael Chen", license_number: "245637" },
      slips: [{ slip_number: "S96" }, { slip_number: "S97" }],
    },
    products: [
      makeDefaultProduct({
        selected_teeth: [{ tooth_number: 8, retention_option_id: 55 }],
        retention_options: [
          {
            id: 99,
            retention_option_id: 55,
            name: "Implant",
            tooth_chart_type: "Implant",
            image_url: "https://example.com/retention/8.png",
            retentions: [{ name: "Screwed", status: "Active" }],
          },
        ],
      }),
    ],
  });

  assert.equal(slip.slipId, 96);
  assert.equal(slip.header.labName, "HMC innovs LLC");
  assert.equal(slip.header.officeName, "4M Dental Implants");
  assert.equal(slip.header.doctorName, "Michael Chen");
  assert.equal(slip.header.casePanNumber, "A0L");
  assert.deepEqual(slip.notes, ["Please fabricate a Single Crown for teeth #8-#10."]);
  assert.deepEqual(slip.footer.relatedSlips, ["S96", "S97"]);
  assert.deepEqual(slip.arches.maxillary.selectedTeeth, [8, 9, 10]);
  assert.equal(slip.arches.maxillary.teeth.find((tooth) => tooth.number === 8)?.status, "implant");
  assert.equal(
    slip.arches.maxillary.toothChartSelectionsByTooth[8].imageUrl,
    "https://example.com/retention/8.png",
  );
});

test("opposing impression and callouts show on the opposite arch when that arch has no products", () => {
  const slip = buildPaperSlipPrintSlipVM({
    id: 117,
    slip_number: "S117",
    case: {
      case_number: "C117",
      patient_name: "Test Patient",
      lab: { name: "HMC innovs LLC" },
      office: { name: "Evergreen Dental" },
      doctor: { name: "David Brown" },
    },
    products: [
      makeDefaultProduct({
        type: "Upper",
        teeth_selection: "7,8,9,10",
        category: { name: "Removable Prosthetics" },
        product: { id: 4, name: "Stay Plate" },
        selected_teeth: [{ tooth_number: 7 }, { tooth_number: 8 }, { tooth_number: 9 }, { tooth_number: 10 }],
        opposite_impressions: [{ quantity: 1, impression: { name: "Light body" } }],
        opposite_extractions: [
          {
            teeth_numbers: "29",
            extraction: {
              name: "Missing teeth",
              code: "MT",
              image_url: "https://example.com/extractions/missing-icon.png",
              images: [{ tooth_number: 29, image_url: "https://example.com/extractions/29.png" }],
            },
          },
          {
            teeth_numbers: "19",
            extraction: {
              name: "Will extract on delivery",
              code: "WEOD",
              image_url: "https://example.com/extractions/will-extract-icon.png",
              images: [{ tooth_number: 19, image_url: "https://example.com/extractions/19.png" }],
            },
          },
        ],
      }),
    ],
  });

  assert.deepEqual(
    slip.opposing.mandibular?.callouts.map((item) => ({
      label: item.label,
      teeth: item.teethNumbers,
    })),
    [
      { label: "Missing teeth", teeth: [29] },
      { label: "Will extract on delivery", teeth: [19] },
    ],
  );
  assert.equal(slip.opposing.mandibular?.impression ?? "", "1x Light body");
});

test("paper slip arch chart includes splint links from splinted_teeth API groups", () => {
  const vm = buildPaperSlipPrintVM({
    products: [
      makeDefaultProduct({
        is_splinted: "Yes",
        splinted_teeth: ["8,9,10", "12,13"],
        teeth_selection: "8,9,10,12,13",
      }),
    ],
  });

  assert.deepEqual(vm.arches.maxillary?.splintedLinks, [8, 9, 12]);
});
