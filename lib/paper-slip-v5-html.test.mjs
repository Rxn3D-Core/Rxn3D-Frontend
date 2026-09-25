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
