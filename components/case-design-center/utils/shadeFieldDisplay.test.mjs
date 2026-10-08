import assert from "node:assert/strict";
import {
  formatRemovableShadeFieldLabel,
  formatShadeSystemName,
  formatShadeGuideWithBrand,
  findShadeCatalogMatch,
  getGumShadePreviewColor,
  getShadePreviewCode,
} from "./shadeFieldDisplay.ts";

assert.equal(formatShadeSystemName("vita_classical"), "Vita Classical");
assert.equal(formatShadeSystemName("Vita classical"), "Vita Classical");

assert.equal(
  formatShadeGuideWithBrand("vita_classical", "Ivoclar"),
  "Ivoclar - Vita Classical"
);
assert.equal(formatShadeGuideWithBrand("vita_classical", ""), "Vita Classical");
assert.equal(
  formatShadeGuideWithBrand("Vita Classical", "Vita Classical"),
  "Vita Classical"
);

const teethShades = [
  {
    id: 1,
    teeth_shade_id: 10,
    name: "C3",
    brand: { id: 5, name: "Vita Brand", system_name: "vita_classical" },
  },
];

assert.equal(
  formatRemovableShadeFieldLabel(
    JSON.stringify({ teeth_shade_id: 10, brand_id: 5, name: "C3" }),
    teethShades
  ),
  "Vita Classical - C3"
);

assert.equal(
  formatRemovableShadeFieldLabel("C3", teethShades),
  "Vita Classical - C3"
);

assert.equal(
  formatRemovableShadeFieldLabel("C3", [], "vita_classical"),
  "Vita Classical - C3"
);

assert.equal(formatRemovableShadeFieldLabel("C3", []), "C3");

// Shared shade codes across brands: prefer the active shade guide (not first catalog hit).
const ambiguousTeethShades = [
  {
    id: 100,
    teeth_shade_id: 100,
    name: "B4",
    brand: { id: 1, name: "Ivoclar Vivadent", system_name: "IPS Shade System" },
  },
  {
    id: 200,
    teeth_shade_id: 200,
    name: "B4",
    brand: { id: 2, name: "VITA Zahnfabrik", system_name: "vita_classical" },
  },
];

assert.equal(
  formatRemovableShadeFieldLabel("B4", ambiguousTeethShades, "vita_classical"),
  "Vita Classical - B4"
);

assert.equal(
  formatRemovableShadeFieldLabel(
    JSON.stringify({ teeth_shade_id: 100, brand_id: 1, name: "B4" }),
    ambiguousTeethShades,
    "vita_classical"
  ),
  "Vita Classical - B4"
);

assert.equal(
  findShadeCatalogMatch("B4", ambiguousTeethShades, "vita_classical")?.brand?.id,
  2
);

const gumShades = [
  {
    id: 2,
    gum_shade_id: 20,
    name: "Dark Pink",
    brand: { id: 7, system_name: "Ivoclar Gingiva" },
    color_code_middle: "#c97b8a",
  },
];

assert.equal(
  formatRemovableShadeFieldLabel(
    JSON.stringify({ gum_shade_id: 20, brand_id: 7, name: "Dark Pink" }),
    gumShades
  ),
  "Ivoclar Gingiva - Dark Pink"
);

const match = findShadeCatalogMatch(
  JSON.stringify({ gum_shade_id: 20, name: "Dark Pink" }),
  gumShades
);
assert.equal(match?.color_code_middle, "#c97b8a");

assert.equal(
  getShadePreviewCode(JSON.stringify({ teeth_shade_id: 10, name: "C3" })),
  "C3"
);

assert.equal(
  getShadePreviewCode("Gc Initial Gingiva - G-Dark"),
  "G-Dark"
);

assert.equal(
  getGumShadePreviewColor("Gc Initial Gingiva - G-Dark", [
    {
      gum_shade_id: 2,
      name: "G-Dark",
      brand: { id: 1, system_name: "GC INITIAL GINGIVA" },
      color_code_middle: "#D99191",
    },
  ]),
  "#D99191"
);

assert.equal(
  formatRemovableShadeFieldLabel("Gc Initial Gingiva - G-Dark", [
    {
      name: "G-Dark",
      brand: { id: 1, system_name: "GC INITIAL GINGIVA" },
    },
  ]),
  "Gc Initial Gingiva - G-Dark"
);

// Never fall back to brand.name when system_name is missing
assert.equal(
  formatRemovableShadeFieldLabel("C3", [
    { name: "C3", brand: { id: 1, name: "Vita Brand", system_name: "" } },
  ]),
  "C3"
);

console.log("shadeFieldDisplay.test.mjs: ok");
