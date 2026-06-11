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
