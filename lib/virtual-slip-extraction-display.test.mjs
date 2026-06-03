import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExtractionDisplayFromSlipProduct,
  buildOpposingArchVM,
  buildOpposingExtractionDisplayFromSlipProduct,
  chartStatusTeethFromExtractionDisplay,
  extractionChipTeethFromDisplay,
  extractionChipTeethFromSlipProduct,
  hasExtractionChartOverlay,
  isGroupedSlipExtractions,
} from "./virtual-slip-extraction-display.ts";

test("isGroupedSlipExtractions detects grouped payload rows", () => {
  assert.equal(isGroupedSlipExtractions([{ extraction_id: 11, teeth_numbers: [3, 15] }]), true);
  assert.equal(isGroupedSlipExtractions([3, 15]), false);
});

test("buildExtractionDisplayFromSlipProduct maps visibility and clasp overlay", () => {
  const display = buildExtractionDisplayFromSlipProduct({
    product: {
      extractions: [
        {
          id: 1,
          extraction_id: 11,
          code: "WED",
          name: "Will extract on delivery",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
          images: [{ tooth_number: 3, image_url: "https://example.com/wed-3.png" }],
        },
        {
          id: 2,
          extraction_id: 15,
          code: "CLASP_L1_G6",
          name: "Clasps",
          visibility_type: "Image",
          overlay: "Yes",
          status: "Active",
          images: [{ tooth_number: 8, image_url: "https://example.com/clasp-8.png" }],
        },
        {
          id: 3,
          extraction_id: 10,
          code: "MT",
          name: "Missing teeth",
          visibility_type: "Color",
          overlay: "No",
          color: "#D3D3D3",
          status: "Active",
        },
      ],
    },
    extractions: [
      { extraction_id: 11, teeth_numbers: [3, 15] },
      { extraction_id: 15, teeth_numbers: [8, 13] },
      { extraction_id: 10, teeth_numbers: [1, 16] },
    ],
  });

  assert.equal(display.toothExtractionMap[3], "WED");
  assert.equal(display.toothExtractionMap[15], "WED");
  assert.deepEqual(display.claspTeeth, [8, 13]);
  assert.equal(display.extractionsByCode.WED.visibility_type, "Image");
  assert.equal(display.extractionsByCode.CLASP_L1_G6.overlay, "Yes");
  assert.equal(
    display.extractionImagesByCode.CLASP_L1_G6[8],
    "https://example.com/clasp-8.png",
  );
  assert.equal(hasExtractionChartOverlay(display), true);

  const chips = extractionChipTeethFromDisplay(display);
  assert.deepEqual(chips.missingTeeth, [1, 16]);
  assert.deepEqual(chips.willExtractTeeth, [3, 15]);
  assert.deepEqual(chips.claspTeeth, [8, 13]);
});

test("overlay extractions go to claspTeeth not toothExtractionMap", () => {
  const display = buildExtractionDisplayFromSlipProduct({
    product: {
      extractions: [
        {
          extraction_id: 15,
          code: "CLASP_L1_G6",
          name: "Clasps",
          visibility_type: "Image",
          overlay: "Yes",
          status: "Active",
        },
      ],
    },
    extractions: [{ extraction_id: 15, teeth_numbers: [8] }],
  });

  assert.deepEqual(display.claspTeeth, [8]);
  assert.equal(display.toothExtractionMap[8], undefined);
});

test("slip-details nested extraction object supplies visibility_type, overlay, and images", () => {
  const display = buildExtractionDisplayFromSlipProduct({
    extractions: [
      {
        id: 79,
        extraction_id: 10,
        teeth_numbers: [1, 9, 10, 16],
        extraction: {
          name: "Missing teeth",
          code: "MT_L1_G2",
          color: "#D3D3D3",
          is_image_extraction: "Yes",
          overlay: "No",
          visibility_type: "Image",
          images: [
            { tooth_number: 1, image_url: "https://example.com/mt-1.png" },
            { tooth_number: 16, image_url: "https://example.com/mt-16.png" },
          ],
        },
      },
      {
        id: 80,
        extraction_id: 11,
        teeth_numbers: [3, 15],
        extraction: {
          name: "Will extract on delivery",
          code: "WED",
          visibility_type: "Image",
          overlay: "No",
          images: [{ tooth_number: 3, image_url: "https://example.com/wed-3.png" }],
        },
      },
      {
        id: 81,
        extraction_id: 15,
        teeth_numbers: [8, 13],
        extraction: {
          name: "Clasps",
          code: "CLASP_L1_G6",
          visibility_type: "Image",
          overlay: "Yes",
          images: [{ tooth_number: 8, image_url: "https://example.com/clasp-8.png" }],
        },
      },
    ],
  });

  assert.equal(display.extractionsByCode.MT_L1_G2.visibility_type, "Image");
  assert.equal(display.extractionsByCode.MT_L1_G2.overlay, "No");
  assert.equal(display.extractionImagesByCode.MT_L1_G2[1], "https://example.com/mt-1.png");
  assert.equal(display.toothExtractionMap[1], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[10], "MT_L1_G2");
  assert.deepEqual(display.claspTeeth, [8, 13]);

  const chips = extractionChipTeethFromDisplay(display);
  assert.deepEqual(chips.missingTeeth, [1, 9, 10, 16]);

  const timImages = [
    { tooth_number: 9, image_url: "https://example.com/tim-9.png" },
    { tooth_number: 10, image_url: "https://example.com/tim-10.png" },
    { tooth_number: 11, image_url: "https://example.com/tim-11.png" },
    { tooth_number: 12, image_url: "https://example.com/tim-12.png" },
  ];
  const nestedPayload = {
    teeth_selection: "9,10,11,12",
    product: {
      extractions: [
        {
          extraction_id: 101,
          code: "TIM",
          name: "Teeth in mouth",
          is_tim: "Yes",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
          images: timImages,
        },
      ],
    },
    extractions: [
      {
        id: 79,
        extraction_id: 10,
        teeth_numbers: [1, 9, 10, 16],
        extraction: {
          name: "Missing teeth",
          code: "MT_L1_G2",
          color: "#D3D3D3",
          is_image_extraction: "Yes",
          overlay: "No",
          visibility_type: "Image",
          images: [
            { tooth_number: 1, image_url: "https://example.com/mt-1.png" },
            { tooth_number: 16, image_url: "https://example.com/mt-16.png" },
          ],
        },
      },
      {
        id: 80,
        extraction_id: 11,
        teeth_numbers: [3, 15],
        extraction: {
          name: "Will extract on delivery",
          code: "WED",
          visibility_type: "Image",
          overlay: "No",
          images: [{ tooth_number: 3, image_url: "https://example.com/wed-3.png" }],
        },
      },
      {
        id: 81,
        extraction_id: 15,
        teeth_numbers: [8, 13],
        extraction: {
          name: "Clasps",
          code: "CLASP_L1_G6",
          visibility_type: "Image",
          overlay: "Yes",
          images: [{ tooth_number: 8, image_url: "https://example.com/clasp-8.png" }],
        },
      },
    ],
  };
  const scopedDisplay = buildExtractionDisplayFromSlipProduct(nestedPayload);
  const productChips = extractionChipTeethFromSlipProduct(nestedPayload, scopedDisplay, "maxillary");
  assert.deepEqual(productChips.missingTeeth, [1, 16]);
  assert.deepEqual(productChips.willExtractTeeth, [3, 15]);
  assert.deepEqual(productChips.claspTeeth, [8, 13]);

  assert.equal(scopedDisplay.toothExtractionMap[1], "MT_L1_G2");
  assert.equal(scopedDisplay.toothExtractionMap[9], "MT_L1_G2");
  assert.equal(scopedDisplay.toothExtractionMap[10], "MT_L1_G2");
  assert.equal(scopedDisplay.toothExtractionMap[11], "TIM");
  assert.equal(scopedDisplay.toothExtractionMap[12], "TIM");
  assert.equal(scopedDisplay.extractionImagesByCode.TIM[11], "https://example.com/tim-11.png");
});

test("slip extractions with code and color only (no images) drive chart status teeth", () => {
  const apiProduct = {
    teeth_selection: "9,10,11,12",
    extractions: [
      {
        id: 83,
        extraction_id: 10,
        teeth_numbers: [1, 10, 11, 12, 16],
        extraction: {
          name: "Missing teeth",
          code: "MT_L1_G2",
          color: "#D3D3D3",
        },
      },
      {
        id: 84,
        extraction_id: 11,
        teeth_numbers: [2, 9, 15],
        extraction: {
          name: "Will extract on delivery",
          code: "WEOD_L1_G3",
          color: "#E92520",
        },
      },
    ],
  };
  const display = buildExtractionDisplayFromSlipProduct(apiProduct);
  const chartStatus = chartStatusTeethFromExtractionDisplay(display);

  assert.equal(display.extractionsByCode.MT_L1_G2.visibility_type, "Image");
  assert.equal(display.extractionsByCode.WEOD_L1_G3.visibility_type, "Image");
  assert.equal(display.toothExtractionMap[1], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[10], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[11], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[12], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[16], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[2], "WEOD_L1_G3");
  assert.equal(display.toothExtractionMap[9], "WEOD_L1_G3");
  assert.equal(display.toothExtractionMap[15], "WEOD_L1_G3");
  assert.deepEqual(chartStatus.missingTeeth, [1, 10, 11, 12, 16]);
  assert.deepEqual(chartStatus.willExtractTeeth, [2, 9, 15]);

  const chips = extractionChipTeethFromSlipProduct(apiProduct, display, "maxillary");
  assert.deepEqual(chips.missingTeeth, [1, 16]);
  assert.deepEqual(chips.willExtractTeeth, [2, 15]);
});

test("TIM1 catalog images map product teeth without is_tim flag", () => {
  const timImages = [
    { tooth_number: 9, image_url: "https://example.com/tim1-9.png" },
    { tooth_number: 10, image_url: "https://example.com/tim1-10.png" },
    { tooth_number: 11, image_url: "https://example.com/tim1-11.png" },
    { tooth_number: 12, image_url: "https://example.com/tim1-12.png" },
  ];
  const display = buildExtractionDisplayFromSlipProduct({
    teeth_selection: "9,10,11,12",
    product: {
      extractions: [
        {
          extraction_id: 101,
          code: "TIM1",
          name: "Teeth in mouth",
          is_default: "Yes",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
          images: timImages,
        },
      ],
    },
    tooth_chart: [
      { tooth_number: 9, extraction_id: 101 },
      { tooth_number: 10, extraction_id: 101 },
      { tooth_number: 11, extraction_id: 101 },
      { tooth_number: 12, extraction_id: 101 },
    ],
  });

  assert.equal(display.toothExtractionMap[9], "TIM1");
  assert.equal(display.toothExtractionMap[12], "TIM1");
  assert.equal(display.extractionImagesByCode.TIM1[10], "https://example.com/tim1-10.png");
});

test("grouped slip extractions win over TIM for overlapping product teeth", () => {
  const display = buildExtractionDisplayFromSlipProduct({
    teeth_selection: "9,10,11,12",
    product: {
      extractions: [
        {
          extraction_id: 101,
          code: "TIM1",
          name: "Teeth in mouth",
          is_tim: "Yes",
          visibility_type: "Image",
          status: "Active",
          images: [
            { tooth_number: 9, image_url: "https://example.com/tim-9.png" },
            { tooth_number: 11, image_url: "https://example.com/tim-11.png" },
            { tooth_number: 12, image_url: "https://example.com/tim-12.png" },
          ],
        },
      ],
    },
    extractions: [
      {
        extraction_id: 10,
        teeth_numbers: [1, 9, 10, 16],
        extraction: {
          code: "MT_L1_G2",
          name: "Missing teeth",
          visibility_type: "Image",
          images: [{ tooth_number: 1, image_url: "https://example.com/mt-1.png" }],
        },
      },
    ],
  });

  assert.equal(display.toothExtractionMap[1], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[9], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[10], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[11], "TIM1");
  assert.equal(display.toothExtractionMap[12], "TIM1");
});

test("buildOpposingExtractionDisplayFromSlipProduct maps grouped opposite_extractions on opposing arch", () => {
  const display = buildOpposingExtractionDisplayFromSlipProduct(
    {
      type: "Upper",
      opposite_impression: "Yes",
      opposite_extractions: [
        {
          extraction_id: 10,
          teeth_numbers: [17, 18, 19],
          extraction: {
            name: "Missing teeth",
            code: "MT_L1_G2",
            color: "#D3D3D3",
          },
        },
        {
          extraction_id: 11,
          teeth_numbers: [25, 26],
          extraction: {
            name: "Will extract on delivery",
            code: "WEOD_L1_G3",
            color: "#E92520",
          },
        },
      ],
      product: {
        opposite_extractions: [
          { extraction_id: 10, code: "MT_L1_G2", name: "Missing teeth" },
          { extraction_id: 11, code: "WEOD_L1_G3", name: "Will extract on delivery" },
        ],
      },
    },
    "mandibular",
  );

  assert.equal(display.toothExtractionMap[18], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[25], "WEOD_L1_G3");
  assert.equal(display.extractionsByCode.MT_L1_G2.visibility_type, "Image");
  assert.equal(display.toothExtractionMap[10], undefined);

  const chartStatus = chartStatusTeethFromExtractionDisplay(display);
  assert.deepEqual(chartStatus.missingTeeth, [17, 18, 19]);
  assert.deepEqual(chartStatus.willExtractTeeth, [25, 26]);
});

test("buildOpposingArchVM builds opposing chart for host arch with impressions from opposite_impressions", () => {
  const opposing = buildOpposingArchVM("maxillary", [
    {
      type: "Upper",
      opposite_impression: "Yes",
      opposite_impressions: [{ quantity: 1, impression: { name: "Clean impression" } }],
      opposite_extractions: [
        {
          extraction_id: 10,
          teeth_numbers: [17, 32],
          extraction: { code: "MT_L1_G2", name: "Missing teeth", color: "#D3D3D3" },
        },
      ],
    },
  ]);

  assert.ok(opposing);
  assert.equal(opposing.arch, "mandibular");
  assert.equal(opposing.showImpression, true);
  assert.equal(opposing.impression, "1x Clean impression");
  assert.equal(opposing.extractionDisplay.toothExtractionMap[17], "MT_L1_G2");
  assert.equal(opposing.extractionDisplay.toothExtractionMap[32], "MT_L1_G2");
  assert.equal(opposing.extractionDisplay.toothExtractionMap[1], undefined);
});

test("buildOpposingArchVM formats opposite_impressions using impression_name without Yes flag", () => {
  const opposing = buildOpposingArchVM("maxillary", [
    {
      type: "Upper",
      opposite_impressions: [
        { quantity: 1, impression_name: "Light body", impression: { name: "Light body" } },
        { quantity: 1, impression_name: "Heavy body", impression: { name: "Heavy body" } },
      ],
    },
  ]);

  assert.ok(opposing);
  assert.equal(opposing.showImpression, true);
  assert.equal(opposing.impression, "1x Light body, 1x Heavy body");
});
