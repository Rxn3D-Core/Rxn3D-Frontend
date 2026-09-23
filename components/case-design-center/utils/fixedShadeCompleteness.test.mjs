import assert from "node:assert/strict";
import {
  getMissingFixedShadeFieldLabel,
  isStoredShadeValuePresent,
} from "./fixedShadeCompleteness.ts";

const namedGuides = [
  { id: 91, name: "Body Shade", field_type: "shade_guide", status: "Active" },
  { id: 92, name: "Teeth Shade", field_type: "shade_guide", status: "Active" },
];

function shadeMap(map) {
  return (productId, arch, fieldType, advanceFieldId) => {
    const key =
      advanceFieldId != null
        ? `${productId}_${arch}_${fieldType}_${advanceFieldId}`
        : `${productId}_${arch}_${fieldType}`;
    return map[key] || "";
  };
}

assert.equal(isStoredShadeValuePresent(""), false);
assert.equal(isStoredShadeValuePresent("shade-sync"), false);
assert.equal(isStoredShadeValuePresent('{"name":"A2"}'), true);
assert.equal(isStoredShadeValuePresent("A2"), true);

// Classic teeth shade already filled — do not re-ask for empty named shade_guide fields.
assert.equal(
  getMissingFixedShadeFieldLabel(
    {
      has_teeth_shade: "Yes",
      advance_fields: namedGuides,
    },
    "fixed_p_502",
    "maxillary",
    shadeMap({ "fixed_p_502_maxillary_tooth_shade": "A2" })
  ),
  null
);

// Classic gum missing still blocks.
assert.equal(
  getMissingFixedShadeFieldLabel(
    {
      has_teeth_shade: "Yes",
      has_gum_shade: "Yes",
      advance_fields: namedGuides,
    },
    "fixed_p_502",
    "maxillary",
    shadeMap({ "fixed_p_502_maxillary_tooth_shade": "A2" })
  ),
  "Stump Shade"
);

// Field-value fallback counts as done when selectedShades key is empty.
assert.equal(
  getMissingFixedShadeFieldLabel(
    { has_teeth_shade: "Yes", advance_fields: namedGuides },
    "fixed_p_502",
    "maxillary",
    shadeMap({}),
    { toothShadeFieldDone: true }
  ),
  null
);

// Named-only products still require named shade_guide fields.
assert.equal(
  getMissingFixedShadeFieldLabel(
    { advance_fields: namedGuides },
    "fixed_p_504",
    "maxillary",
    shadeMap({})
  ),
  "Body Shade"
);

assert.equal(
  getMissingFixedShadeFieldLabel(
    { advance_fields: namedGuides },
    "fixed_p_504",
    "maxillary",
    shadeMap({
      "fixed_p_504_maxillary_tooth_shade_91": "B1",
      "fixed_p_504_maxillary_tooth_shade_92": "A2",
    })
  ),
  null
);

console.log("fixedShadeCompleteness.test.mjs: ok");
