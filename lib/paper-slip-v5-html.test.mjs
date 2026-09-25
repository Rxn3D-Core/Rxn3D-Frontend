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
  assert.match(teeth, /ps-detail-row/);
  assert.match(teeth, /ps-shade-line-l[\s\S]*ps-sys">VITA Classical<\/span><span class="ps-shade">A2/);
  assert.match(teeth, /ps-shade">B1<\/span><span class="ps-sys">3D Master/);
  assert.match(html, /@page \{ size: letter portrait; margin: 0; \}/);
  assert.doesNotMatch(html, /0\.12in/);
});
