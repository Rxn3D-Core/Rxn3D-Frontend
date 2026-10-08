import assert from "node:assert/strict";
import test from "node:test";
import { buildVirtualSlipVM } from "./virtual-slip-view-model.ts";
import { buildPaperSlipV5Html } from "./paper-slip-v5-html.ts";

test("v5 html uses loaded tooth image urls in svg, not a raster jpeg", () => {
  const vm = buildVirtualSlipVM({
    case: {
      patient_name: "Ada",
      case_number: "C-1",
      lab: { name: "HMC", logo_url: "https://example.com/logo.png" },
      office: { name: "Office", code: "OFC" },
    },
    slip_number: "S-9",
    products: [
      {
        type: "Maxillary",
        category: { name: "Fixed Restorations" },
        teeth_selection: [8],
        product: { name: "Crown" },
        retention_options: [
          {
            id: 4,
            name: "Implant",
            code: "I",
            teeth_number: 8,
            selected_tooth_image_url: "https://example.com/tooth-8-implant.png",
            visibility_type: "Image",
          },
        ],
      },
    ],
  });

  const html = buildPaperSlipV5Html({ vm, caseId: 1, slipId: 9, details: { case: { office: { code: "OFC" } } } });

  assert.match(html, /<svg /);
  assert.match(html, /font-size="25"/);
  assert.match(html, /letter-spacing="-6"/);
  assert.match(html, /x="278.8"/);
  assert.match(html, /y="112"/);
  assert.match(html, /y="51"/);
  assert.doesNotMatch(html, /font-size="16"/);
  assert.match(html, /https:\/\/example.com\/tooth-8-implant\.png/);
  assert.match(html, /\/images\/teeth\/maxillary\/tooth-1\.png\?v=4/);
  assert.doesNotMatch(html, /data:image\/jpeg/);
  assert.match(html, /Crown/);
  assert.match(html, /OFC/);
});

test("v5 centers detail rows and keeps shade beside the label", () => {
  const product = {
    title: "Crown",
    teethLabel: "#8",
    grade: "Premium long grade name",
    stage: "",
    teethShade: "VITA Classical - A2",
    gumShade: "Ivoclar - Dark Pink",
    impression: "",
    addOns: [],
    implants: [],
    willExtractTeeth: [],
  };
  const html = buildPaperSlipV5Html({
    vm: {
      header: {
        labName: "Lab",
        officeName: "",
        doctorName: "",
        patientName: "",
        caseNumber: "",
        slipNumber: "",
        pickupDate: "",
        dueDate: "",
        deliveryTime: "",
      },
      arches: {
        maxillary: { products: [product] },
        mandibular: { products: [{ ...product, teethShade: "3D Master - B1", gumShade: "" }] },
      },
      notes: "",
    },
    caseId: 1,
    slipId: 2,
  });

  const teeth = html.slice(html.indexOf(">Teeth Shade<") - 400, html.indexOf(">Teeth Shade<") + 400);
  assert.match(html, /grid-template-columns: minmax\(0, 1fr\) max-content minmax\(0, 1fr\)/);
  assert.match(teeth, /ps-shade-line-l[\s\S]*ps-sys">VITA Classical<\/span><span class="ps-shade">A2/);
  assert.match(teeth, /ps-shade">B1<\/span><span class="ps-sys">3D Master/);
  assert.match(html, /@page \{ size: letter portrait; margin: 0; \}/);
  assert.match(html, /transform: rotate\(90deg\) scale\(calc\(5\.5in \/ 628px\)\)/);
  assert.doesNotMatch(html, /11in \/ 890px/);
  assert.doesNotMatch(html, /0\.12in/);
});

test("v5 add-on overflow says +N more", () => {
  const product = {
    title: "Crown",
    teethLabel: "#8",
    grade: "",
    stage: "",
    teethShade: "",
    gumShade: "",
    impression: "",
    addOns: [
      "2x Wire clasp",
      "Gold tooth",
      "Mesh",
      "Soft liner",
      "Metal palate",
      "Clasp",
    ],
    implants: [],
    willExtractTeeth: [],
  };
  const html = buildPaperSlipV5Html({
    vm: {
      header: {
        labName: "Lab",
        officeName: "",
        doctorName: "",
        patientName: "",
        caseNumber: "",
        slipNumber: "",
        pickupDate: "",
        dueDate: "",
        deliveryTime: "",
      },
      arches: {
        maxillary: { products: [product] },
        mandibular: { products: [] },
      },
      notes: "",
    },
    caseId: 1,
    slipId: 2,
  });

  assert.match(html, /2x Wire clasp \+5 more/);
  assert.doesNotMatch(html, /\(\+5\)/);
});

test("v5 pan number strikes zero but not the letter O", () => {
  const vm = buildVirtualSlipVM({
    case: { patient_name: "Ada", case_number: "C-1", office: { name: "Office", code: "OFC" } },
    slip_number: "S-9",
    casepan: { number: "O0" },
    products: [],
  });

  const html = buildPaperSlipV5Html({ vm, caseId: 1, slipId: 9 });
  const zero = `<span class="ps-zero">0<span class="ps-zero-slash"></span></span>`;

  assert.ok(html.includes(`<div class="ps-pan">O${zero}</div>`));
  assert.ok(html.includes(`<span class="ps-head-v">O${zero}</span>`));
});

test("v5 tints Color extraction teeth without a photo", () => {
  const html = buildPaperSlipV5Html({
    vm: {
      header: { labName: "Lab", officeName: "", doctorName: "", patientName: "", caseNumber: "", slipNumber: "", pickupDate: "", dueDate: "", deliveryTime: "" },
      arches: {
        maxillary: {
          products: [],
          teeth: [],
          toothChartSelectionsByTooth: {},
          extractionDisplay: {
            toothExtractionMap: { 9: "FIX" },
            claspTeeth: [],
            extractionsByCode: { FIX: { code: "FIX", name: "Fix or Repair", visibility_type: "Color", color: "#A0F69A", overlay: "No" } },
            extractionImagesByCode: {},
          },
        },
        mandibular: { products: [] },
      },
      notes: "",
    },
    caseId: 1,
    slipId: 2,
  });

  assert.match(html, /tooth-9\.png\?v=4"[^>]*style="filter:opacity\(0\.35\) drop-shadow\(rgb\(160,246,154\) 0px 0px 0px\)"/);
  assert.doesNotMatch(html, /tooth-8\.png\?v=4"[^>]*style=/);
});
