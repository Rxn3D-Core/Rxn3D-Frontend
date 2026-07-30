// Run with: node --import ./test-alias-loader.mjs --test lib/paper-slip-print-v2-view-model.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPaperSlipPrintV2Sections,
  buildPaperSlipPrintV2SlipVM,
  extractPaperSlipPrintV2Extras,
} from "./paper-slip-print-v2-view-model.ts";

function makeRecord(overrides = {}) {
  return {
    id: 501,
    qr_code_url: "https://example.com/qr/501.png",
    case: {
      case_number: "C-99",
      patient_name: "Jane Roe",
      casepan: { number: "42" },
      lab: {
        name: "Acme Dental Lab",
        address: "1 Main St",
        city: "Denver",
        state: "CO",
        postal_code: "80202",
        code: "ADL",
        phone: "555-1000",
        email: "lab@acme.test",
      },
      office: { name: "Downtown Office" },
      doctor: { name: "Dr. Smith", license_number: "LIC-777" },
    },
    ...overrides,
  };
}

function makeDetails(overrides = {}) {
  return {
    slip_number: "S-123",
    case: {
      case_number: "C-99",
      patient_name: "Jane Roe",
      casepan: { number: "42" },
      lab: { name: "Acme Dental Lab" },
      office: { name: "Downtown Office" },
      doctor: { name: "Dr. Smith" },
    },
    casepan: { number: "42" },
    products: [{ type: "Upper", teeth_selection: "8,9", product: { name: "Zirconia Crown" } }],
    ...overrides,
  };
}

test("extractPaperSlipPrintV2Extras reads QR + print-only header fields", () => {
  const extras = extractPaperSlipPrintV2Extras(makeRecord());

  assert.equal(extras.slipId, 501);
  assert.equal(extras.qrCodeUrl, "https://example.com/qr/501.png");
  assert.equal(extras.labAddress, "1 Main St, Denver, CO, 80202");
  assert.equal(extras.labCode, "ADL");
  assert.equal(extras.doctorLicenseNumber, "LIC-777");
  assert.equal(extras.labPhone, "555-1000");
  assert.equal(extras.labEmail, "lab@acme.test");
});

test("extractPaperSlipPrintV2Extras falls back to root-level lab/doctor and null QR", () => {
  const extras = extractPaperSlipPrintV2Extras({
    id: 7,
    case: {},
    lab: { name: "Root Lab", code: "RL", phone_number: "555-2000" },
    doctor: { license_no: "L-2" },
  });

  assert.equal(extras.slipId, 7);
  assert.equal(extras.qrCodeUrl, null);
  assert.equal(extras.labCode, "RL");
  assert.equal(extras.labPhone, "555-2000");
  assert.equal(extras.doctorLicenseNumber, "L-2");
});

test("buildPaperSlipPrintV2SlipVM merges details body with print extras", () => {
  const extras = extractPaperSlipPrintV2Extras(makeRecord());
  const slip = buildPaperSlipPrintV2SlipVM(makeDetails(), extras);

  assert.equal(slip.slipId, 501);
  assert.equal(slip.extras.qrCodeUrl, "https://example.com/qr/501.png");
  // Body comes from buildVirtualSlipVM(details).
  assert.equal(slip.vm.header.slipNumber, "S-123");
  assert.equal(slip.vm.header.caseNumber, "C-99");
  assert.equal(slip.vm.header.panNumber, "42");
  assert.ok(slip.vm.arches.maxillary, "maxillary arch built from Upper product");
});

test("buildPaperSlipPrintV2Sections preserves order and sets page breaks", () => {
  const a = buildPaperSlipPrintV2SlipVM(makeDetails({ slip_number: "S-1" }), {
    ...extractPaperSlipPrintV2Extras(makeRecord({ id: 1 })),
    slipId: 1,
  });
  const b = buildPaperSlipPrintV2SlipVM(makeDetails({ slip_number: "S-2" }), {
    ...extractPaperSlipPrintV2Extras(makeRecord({ id: 2 })),
    slipId: 2,
  });

  const sections = buildPaperSlipPrintV2Sections([a, b]);

  assert.equal(sections.length, 2);
  assert.equal(sections[0].slip.slipId, 1);
  assert.equal(sections[1].slip.slipId, 2);
  assert.equal(sections[0].pageBreakBefore, false);
  assert.equal(sections[1].pageBreakBefore, true);
  assert.ok(sections[0].key.startsWith("1-"));
});
