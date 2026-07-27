import assert from "node:assert/strict";
import test from "node:test";

import { buildVirtualSlipInitialState } from "./virtual-slip-transformer.ts";
import {
  getRemovableOrangeHeaderTeeth,
  getToothStatusBoxDisplayMap,
  resolveRemovableStatusBoxSelectedTeeth,
} from "../components/case-design-center/utils/removableToothDisplay.ts";

test("buildVirtualSlipInitialState arch map uses grouped extractions only", () => {
  const apiProduct = {
    id: 1,
    type: "Upper",
    teeth_selection: "7,8,9,10",
    category: { name: "Removable Restorations" },
    product: {
      id: 100,
      name: "Metal Frame Acrylic",
      extractions: [
        {
          extraction_id: 10,
          code: "MT_L1_G2",
          name: "Missing teeth",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
        },
        {
          extraction_id: 11,
          code: "WEOD_L1_G3",
          name: "Will extract on delivery",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
        },
        {
          extraction_id: 9,
          code: "TIM1",
          name: "Teeth in mouth",
          is_tim: "Yes",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
        },
      ],
    },
    slip_product_teeth_selections: [
      {
        tooth_number: 7,
        selected_tooth_image_url: "https://example.com/tim-7.png",
        extraction: null,
      },
      {
        tooth_number: 8,
        selected_tooth_image_url: "https://example.com/tim-8.png",
        extraction: null,
      },
    ],
    extractions: [
      { extraction_id: 11, teeth_numbers: [1, 16] },
      { extraction_id: 10, teeth_numbers: [2, 15] },
    ],
  };

  const state = buildVirtualSlipInitialState([apiProduct]);

  assert.deepEqual(state.maxillaryTeeth.sort((a, b) => a - b), [7, 8, 9, 10]);
  assert.equal(state.maxillaryToothExtractionMap[1], "WEOD_L1_G3");
  assert.equal(state.maxillaryToothExtractionMap[2], "MT_L1_G2");
  assert.equal(state.maxillaryToothExtractionMap[15], "MT_L1_G2");
  assert.equal(state.maxillaryToothExtractionMap[16], "WEOD_L1_G3");
  assert.equal(state.maxillaryToothExtractionMap[7], undefined);
  assert.equal(state.maxillaryToothExtractionMap[8], undefined);
  assert.equal(state.maxillaryToothExtractionMap[9], undefined);
  assert.equal(state.maxillaryToothExtractionMap[10], undefined);
  assert.deepEqual(state.maxillaryNoActiveBoxTeeth, []);

  const assignedTeeth = [7, 8, 9, 10];
  const orangeHeader = getRemovableOrangeHeaderTeeth({
    selectedTeeth: assignedTeeth,
    toothExtractionMap: state.maxillaryToothExtractionMap,
    claspTeeth: state.maxillaryClaspTeeth,
    noActiveBoxTeeth: state.maxillaryNoActiveBoxTeeth,
    extractions: apiProduct.product.extractions,
    isFullDenture: false,
  });
  assert.deepEqual(orangeHeader, assignedTeeth);

  const statusScope = resolveRemovableStatusBoxSelectedTeeth({
    cardTeeth: assignedTeeth,
    toothExtractionMap: state.maxillaryToothExtractionMap,
    claspTeeth: state.maxillaryClaspTeeth,
    archTeeth: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
  });
  assert.ok(statusScope.includes(1));
  assert.ok(statusScope.includes(16));
  assert.ok(statusScope.includes(2));
  assert.ok(statusScope.includes(15));

  const displayByCode = getToothStatusBoxDisplayMap({
    extractions: apiProduct.product.extractions.filter((e) => e.status === "Active"),
    selectedTeeth: statusScope,
    toothExtractionMap: state.maxillaryToothExtractionMap,
    claspTeeth: state.maxillaryClaspTeeth,
    excludeTeeth: orangeHeader,
  });
  assert.deepEqual(displayByCode.WEOD_L1_G3, [1, 16]);
  assert.deepEqual(displayByCode.MT_L1_G2, [2, 15]);
});

test("buildVirtualSlipInitialState preloads fixed gum shade as GumShadePicker JSON", () => {
  const state = buildVirtualSlipInitialState([
    {
      type: "Upper",
      teeth_selection: "8,9",
      category: { name: "Fixed Restorations" },
      gum_shade: { id: 44, gum_shade_id: 44, name: "Light Pink", brand: { id: 7 } },
      product: {
        id: 501,
        name: "Zirconia Crown",
        has_retention: "Yes",
        has_gum_shade: "Yes",
        has_teeth_shade: "Yes",
        retention_options: [{ id: 1, name: "Prep" }],
        advance_fields: [],
      },
    },
  ]);

  const stump = JSON.parse(state.fieldValues.maxillary_8.fixed_stump_shade);
  assert.equal(stump.name, "Light Pink");
  assert.equal(stump.gum_shade_id, 44);
  assert.equal(stump.brand_id, 7);
  assert.equal(state.selectedShades["fixed_p_501_maxillary_stump_shade"], "Light Pink");
});

test("buildVirtualSlipInitialState keeps classic teeth/gum separate from named shade_guide fields", () => {
  const state = buildVirtualSlipInitialState([
    {
      type: "Upper",
      teeth_selection: "8",
      category: { name: "Fixed Restorations" },
      teeth_shade: { id: 12, name: "A2", brand: { id: 2 } },
      product: {
        id: 502,
        name: "Zirconia Crown",
        has_retention: "Yes",
        has_teeth_shade: "Yes",
        has_gum_shade: "Yes",
        retention_options: [{ id: 1, name: "Prep" }],
        advance_fields: [
          { id: 91, name: "Body Shade", field_type: "shade_guide", options: [] },
          { id: 92, name: "Gum Shade", field_type: "shade_guide", options: [] },
        ],
      },
      gum_shade: { id: 45, name: "Medium Pink", brand: { id: 3 } },
    },
  ]);

  // Classic removaables-style keys — not seeded onto named Body/Cervical advance-field ids.
  assert.equal(state.selectedShades["fixed_p_502_maxillary_tooth_shade"], "A2");
  assert.equal(state.selectedShades["fixed_p_502_maxillary_stump_shade"], "Medium Pink");
  assert.equal(state.selectedShades["fixed_p_502_maxillary_tooth_shade_91"], undefined);
  assert.equal(state.selectedShades["fixed_p_502_maxillary_stump_shade_92"], undefined);

  const teeth = JSON.parse(state.fieldValues.maxillary_8.fixed_shade_trio);
  assert.equal(teeth.name, "A2");
  assert.equal(teeth.teeth_shade_id, 12);
  const gum = JSON.parse(state.fieldValues.maxillary_8.fixed_stump_shade);
  assert.equal(gum.name, "Medium Pink");
});

test("buildVirtualSlipInitialState does not mark empty fixed shade steps complete", () => {
  const state = buildVirtualSlipInitialState([
    {
      type: "Upper",
      teeth_selection: "6",
      category: { name: "Fixed Restorations" },
      product: {
        id: 505,
        name: "Implant Supported Metal frame Acrylic",
        has_retention: "Yes",
        has_teeth_shade: "Yes",
        has_gum_shade: "Yes",
        retention_options: [{ id: 1, name: "Screwed" }],
        advance_fields: [],
      },
    },
  ]);

  assert.ok(!state.completedFields.maxillary_6.includes("fixed_shade_trio"));
  assert.ok(!state.completedFields.maxillary_6.includes("fixed_stump_shade"));
  assert.equal(state.fieldValues.maxillary_6?.fixed_shade_trio, undefined);
  assert.equal(state.fieldValues.maxillary_6?.fixed_stump_shade, undefined);
  assert.ok(state.completedFields.maxillary_6.includes("fixed_impression"));
});

test("buildVirtualSlipInitialState seeds named shade_guide only from saved advance_field values", () => {
  const state = buildVirtualSlipInitialState([
    {
      type: "Upper",
      teeth_selection: "8",
      category: { name: "Fixed Restorations" },
      teeth_shade: { id: 12, name: "A2" },
      product: {
        id: 504,
        name: "Zirconia Crown",
        has_retention: "Yes",
        retention_options: [{ id: 1, name: "Prep" }],
        advance_fields: [
          { id: 91, name: "Body Shade", field_type: "shade_guide", options: [] },
        ],
      },
      advance_fields: [
        {
          advance_field_id: 91,
          advance_field: { id: 91, name: "Body Shade", field_type: "shade_guide" },
          teeth_shade: { name: "B1" },
        },
      ],
    },
  ]);

  assert.equal(state.selectedShades["fixed_p_504_maxillary_tooth_shade_91"], "B1");
  assert.equal(state.selectedShades["fixed_p_504_maxillary_tooth_shade"], "A2");
});

test("buildVirtualSlipInitialState maps characterization into advanced field values", () => {
  const state = buildVirtualSlipInitialState([
    {
      type: "Upper",
      teeth_selection: "8,9",
      category: { name: "Fixed Restorations" },
      product: {
        id: 503,
        name: "Zirconia Crown",
        has_retention: "Yes",
        retention_options: [{ id: 1, name: "Prep" }],
        advance_fields: [
          {
            id: 77,
            name: "Characterization Intensity",
            field_type: "dropdown",
            options: [
              { id: 1, name: "Light" },
              { id: 2, name: "Heavy" },
            ],
          },
        ],
      },
      advance_fields: [
        {
          advance_field_id: 77,
          advance_field_value: "Heavy",
          advance_field: {
            id: 77,
            name: "Characterization Intensity",
            field_type: "dropdown",
            options: [
              { id: 1, name: "Light" },
              { id: 2, name: "Heavy" },
            ],
          },
        },
      ],
    },
  ]);

  const stored = JSON.parse(state.fieldValues.maxillary_8.fixed_characterization);
  assert.equal(stored["77"].name, "Heavy");
  assert.equal(stored["77"].optionId, 2);
  assert.deepEqual(
    JSON.parse(state.fieldValues.maxillary_9.fixed_characterization),
    stored
  );
});

test("buildVirtualSlipInitialState keeps implant catalog IDs for later name resolution", () => {
  const state = buildVirtualSlipInitialState([
    {
      type: "Upper",
      teeth_selection: "8",
      category: { name: "Fixed Restorations" },
      retentions: [{ tooth_number: 8, retention: { name: "Implant" } }],
      product: {
        id: 504,
        name: "Implant Crown",
        has_retention: "Yes",
        retention_options: [{ id: 1, name: "Implant" }],
      },
      implant_details: [
        {
          tooth_number: 8,
          implant_id: 11,
          implant_platform_id: 22,
          implant_platform_size_id: 33,
        },
      ],
      abutment_details: [
        {
          tooth_number: 8,
          abutment_id: 5,
          abutment_option_id: 6,
          abutment_type_id: 9,
        },
      ],
    },
  ]);

  const implant = state.maxillaryImplantDetailsByTooth[8];
  assert.equal(implant.implantId, 11);
  assert.equal(implant.platformId, 22);
  assert.equal(implant.sizeId, 33);
  assert.equal(implant.abutmentId, 5);
  assert.equal(implant.abutmentOptionId, 6);
});
