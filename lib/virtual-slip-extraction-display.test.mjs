import assert from "node:assert/strict";
import test from "node:test";
import {
  buildArchChartExtractionDisplayFromSlipProducts,
  buildExtractionDisplayFromSlipProduct,
  buildExtractionDisplayFromToothChartPreload,
  buildGroupedExtractionsChartDisplay,
  buildOpposingArchVM,
  buildOpposingExtractionDisplayFromSlipProduct,
  buildVirtualSlipStatusBoxProps,
  chartStatusTeethFromExtractionDisplay,
  extractionChipTeethFromDisplay,
  extractionChipTeethFromSlipProduct,
  hasExtractionChartOverlay,
  isGroupedSlipExtractions,
  mergeArchExtractionDisplays,
  mergePreloadExtractionDisplaysForArch,
  overlayPreloadExtractionsOnChartDisplay,
  overlayToothChartPreloadOnArchDisplay,
  scopeArchChartExtractionDisplay,
  scopeChartExtractionDisplayForProductTeeth,
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
  assert.equal(scopedDisplay.toothExtractionMap[16], "MT_L1_G2");
  // teeth_selection teeth skip grouped status-box codes; chart uses TIM catalog instead.
  assert.equal(scopedDisplay.toothExtractionMap[9], "TIM");
  assert.equal(scopedDisplay.toothExtractionMap[10], "TIM");
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
  assert.equal(display.toothExtractionMap[16], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[2], "WEOD_L1_G3");
  assert.equal(display.toothExtractionMap[15], "WEOD_L1_G3");
  assert.equal(display.toothExtractionMap[9], undefined);
  assert.equal(display.toothExtractionMap[10], undefined);
  assert.equal(display.toothExtractionMap[11], undefined);
  assert.equal(display.toothExtractionMap[12], undefined);
  assert.deepEqual(chartStatus.missingTeeth, [1, 16]);
  assert.deepEqual(chartStatus.willExtractTeeth, [2, 15]);

  const chips = extractionChipTeethFromSlipProduct(apiProduct, display, "maxillary");
  assert.deepEqual(chips.missingTeeth, [1, 16]);
  assert.deepEqual(chips.willExtractTeeth, [2, 15]);

  const statusBoxes = buildVirtualSlipStatusBoxProps(display, "maxillary", { apiProduct });
  assert.ok(statusBoxes);
  assert.deepEqual(statusBoxes.displayTeethByCode.MT_L1_G2, [1, 16]);
  assert.deepEqual(statusBoxes.displayTeethByCode.WEOD_L1_G3, [2, 15]);
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

test("chartStatusTeethFromExtractionDisplay excludes product teeth from status lists", () => {
  const display = {
    toothExtractionMap: {
      1: "WEOD_L1_G3",
      7: "WEOD_L1_G3",
      8: "WEOD_L1_G3",
      9: "MT_L1_G2",
      10: "MT_L1_G2",
      16: "WEOD_L1_G3",
      2: "MT_L1_G2",
      15: "MT_L1_G2",
    },
    claspTeeth: [],
    extractionsByCode: {
      MT_L1_G2: { name: "Missing teeth", code: "MT_L1_G2", visibility_type: "Color" },
      WEOD_L1_G3: { name: "Will extract on delivery", code: "WEOD_L1_G3", visibility_type: "Image" },
    },
    extractionImagesByCode: {},
  };
  const productTeeth = [7, 8, 9, 10];
  const chartStatus = chartStatusTeethFromExtractionDisplay(display, {
    excludeTeeth: productTeeth,
  });
  const scoped = scopeChartExtractionDisplayForProductTeeth(
    {
      ...display,
      extractionsByCode: {
        ...display.extractionsByCode,
        TIM1: { name: "Teeth in mouth", code: "TIM1", visibility_type: "Image" },
      },
      extractionImagesByCode: {
        TIM1: {
          7: "https://example.com/tim-7.png",
          8: "https://example.com/tim-8.png",
          9: "https://example.com/tim-9.png",
          10: "https://example.com/tim-10.png",
        },
      },
    },
    productTeeth,
  );

  assert.deepEqual(chartStatus.missingTeeth, [2, 15]);
  assert.deepEqual(chartStatus.willExtractTeeth, [1, 16]);
  assert.equal(scoped.toothExtractionMap[7], "TIM1");
  assert.equal(scoped.toothExtractionMap[9], "TIM1");
  assert.equal(scoped.toothExtractionMap[1], "WEOD_L1_G3");
});

test("scopeArchChartExtractionDisplay restores TIM after opposing merge overwrites product teeth", () => {
  const apiProduct = {
    teeth_selection: "7,8,9,10",
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
            { tooth_number: 7, image_url: "https://example.com/tim-7.png" },
            { tooth_number: 8, image_url: "https://example.com/tim-8.png" },
            { tooth_number: 9, image_url: "https://example.com/tim-9.png" },
            { tooth_number: 10, image_url: "https://example.com/tim-10.png" },
          ],
        },
      ],
    },
    extractions: [
      {
        extraction_id: 10,
        teeth_numbers: [2, 15],
        extraction: { code: "MT_L1_G2", name: "Missing teeth", visibility_type: "Image" },
      },
    ],
  };
  const productDisplay = buildExtractionDisplayFromSlipProduct(apiProduct);
  const opposingDisplay = buildExtractionDisplayFromSlipProduct({
    extractions: [
      {
        extraction_id: 11,
        teeth_numbers: [1, 7, 8, 9, 10, 16],
        extraction: {
          code: "WEOD_L1_G3",
          name: "Will extract on delivery",
          visibility_type: "Image",
          images: [{ tooth_number: 1, image_url: "https://example.com/weod-1.png" }],
        },
      },
    ],
  });
  const merged = mergeArchExtractionDisplays([productDisplay, opposingDisplay]);
  assert.equal(merged.toothExtractionMap[7], "WEOD_L1_G3");
  const scoped = scopeArchChartExtractionDisplay(merged, [apiProduct]);
  assert.equal(scoped.toothExtractionMap[1], "WEOD_L1_G3");
  assert.equal(scoped.toothExtractionMap[7], "TIM1");
  assert.equal(scoped.toothExtractionMap[10], "TIM1");
  assert.equal(scoped.extractionImagesByCode.TIM1[8], "https://example.com/tim-8.png");
});

test("scopeArchChartExtractionDisplay restores TIM on product teeth after arch merge", () => {
  const apiProduct = {
    teeth_selection: "7,8,9,10",
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
            { tooth_number: 7, image_url: "https://example.com/tim-7.png" },
            { tooth_number: 8, image_url: "https://example.com/tim-8.png" },
            { tooth_number: 9, image_url: "https://example.com/tim-9.png" },
            { tooth_number: 10, image_url: "https://example.com/tim-10.png" },
          ],
        },
      ],
    },
    extractions: [
      {
        extraction_id: 11,
        teeth_numbers: [1, 7, 8, 9, 10, 16],
        extraction: {
          code: "WEOD_L1_G3",
          name: "Will extract on delivery",
          visibility_type: "Image",
          images: [
            { tooth_number: 1, image_url: "https://example.com/weod-1.png" },
            { tooth_number: 16, image_url: "https://example.com/weod-16.png" },
          ],
        },
      },
      {
        extraction_id: 10,
        teeth_numbers: [2, 7, 8, 9, 10, 15],
        extraction: {
          code: "MT_L1_G2",
          name: "Missing teeth",
          visibility_type: "Image",
          images: [{ tooth_number: 2, image_url: "https://example.com/mt-2.png" }],
        },
      },
    ],
  };
  const perProduct = buildExtractionDisplayFromSlipProduct(apiProduct);
  const merged = mergeArchExtractionDisplays([perProduct]);
  const scoped = scopeArchChartExtractionDisplay(merged, [apiProduct]);

  assert.equal(scoped.toothExtractionMap[1], "WEOD_L1_G3");
  assert.equal(scoped.toothExtractionMap[16], "WEOD_L1_G3");
  assert.equal(scoped.toothExtractionMap[2], "MT_L1_G2");
  assert.equal(scoped.toothExtractionMap[15], "MT_L1_G2");
  assert.equal(scoped.toothExtractionMap[7], "TIM1");
  assert.equal(scoped.toothExtractionMap[10], "TIM1");
  assert.equal(scoped.extractionImagesByCode.TIM1[8], "https://example.com/tim-8.png");
});

test("grouped slip extractions skip teeth_selection; product teeth keep TIM chart", () => {
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
  assert.equal(display.toothExtractionMap[16], "MT_L1_G2");
  assert.equal(display.toothExtractionMap[9], "TIM1");
  assert.equal(display.toothExtractionMap[10], undefined);
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

test("buildOpposingArchVM returns null when target arch already has a product", () => {
  const opposing = buildOpposingArchVM("maxillary", [
    {
      type: "Upper",
      opposite_extractions: [
        {
          extraction_id: 10,
          teeth_numbers: [17, 32],
          extraction: { code: "MT_L1_G2", name: "Missing teeth" },
        },
      ],
    },
    {
      type: "Lower",
      teeth_selection: [17, 18],
    },
  ]);

  assert.equal(opposing, null);
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

test("buildExtractionDisplayFromToothChartPreload uses image_url not default_image_url", () => {
  const catalogExtractions = [
    {
      id: 1,
      extraction_id: 10,
      code: "MT",
      name: "Missing teeth",
      visibility_type: "Color",
      overlay: "No",
      color: "#D3D3D3",
      status: "Active",
    },
    {
      id: 2,
      extraction_id: 11,
      code: "WEOD",
      name: "Will extract on delivery",
      visibility_type: "Image",
      overlay: "No",
      status: "Active",
    },
    {
      id: 3,
      extraction_id: 20,
      code: "TIM",
      name: "Teeth in mouth",
      visibility_type: "Image",
      is_tim: "Yes",
      overlay: "No",
      status: "Active",
    },
  ];

  const display = buildExtractionDisplayFromToothChartPreload(
    {
      arch: "upper",
      tooth_numbers: [1, 2, 7, 8, 9, 10, 15, 16],
      teeth: [
        {
          tooth_number: 2,
          extraction_id: 10,
          default_image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-2.png",
          image_url:
            "https://rxn3d-media-files.s3.us-west-2.amazonaws.com/library/extractions/tooth-images/extraction_2_tooth_2.png",
          visibility_type: "Image",
          overlay: "No",
        },
        {
          tooth_number: 7,
          extraction_id: null,
          default_image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-7.png",
          image_url: "https://example.com/tim-tooth-7.png",
          visibility_type: "Image",
          overlay: "No",
        },
      ],
    },
    { product: { extractions: catalogExtractions } },
  );

  assert.equal(display.toothExtractionMap[2], "MT");
  assert.equal(
    display.extractionImagesByCode.MT[2],
    "https://rxn3d-media-files.s3.us-west-2.amazonaws.com/library/extractions/tooth-images/extraction_2_tooth_2.png",
  );
  assert.equal(display.toothExtractionMap[7], "TIM");
  assert.equal(display.extractionImagesByCode.TIM[7], "https://example.com/tim-tooth-7.png");
  assert.equal(hasExtractionChartOverlay(display), true);

  const chartStatus = chartStatusTeethFromExtractionDisplay(display, { excludeTeeth: [7, 8, 9, 10] });
  assert.deepEqual(chartStatus.missingTeeth, [2]);
});

test("buildExtractionDisplayFromToothChartPreload prefers catalog image over anatomical default image_url", () => {
  const display = buildExtractionDisplayFromToothChartPreload(
    {
      arch: "upper",
      teeth: [
        {
          tooth_number: 8,
          extraction_id: null,
          default_image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-8.png",
          image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-8.png",
          visibility_type: "Image",
          overlay: "No",
        },
      ],
    },
    {
      teeth_selection: [8],
      slip_product_teeth_selections: [
        {
          tooth_number: 8,
          selected_tooth_image_url: "https://example.com/metal-frame-tooth-8.png",
          extraction: { code: "TIM", name: "Teeth in mouth", is_tim: "Yes", status: "Active" },
        },
      ],
      product: {
        extractions: [
          {
            extraction_id: 20,
            code: "TIM",
            name: "Teeth in mouth",
            is_tim: "Yes",
            visibility_type: "Image",
            overlay: "No",
            status: "Active",
          },
        ],
      },
    },
  );

  assert.equal(display.toothExtractionMap[8], "TIM");
  assert.equal(
    display.extractionImagesByCode.TIM[8],
    "https://example.com/metal-frame-tooth-8.png",
  );
});

test("buildExtractionDisplayFromToothChartPreload maps product teeth without TIM catalog row", () => {
  const display = buildExtractionDisplayFromToothChartPreload(
    {
      arch: "upper",
      teeth: [
        {
          tooth_number: 9,
          extraction_id: null,
          image_url: "https://example.com/catalog-tooth-9.png",
          visibility_type: "Image",
          overlay: "No",
        },
      ],
    },
    { teeth_selection: [9] },
  );

  assert.equal(display.toothExtractionMap[9], "TIM");
  assert.equal(display.extractionImagesByCode.TIM[9], "https://example.com/catalog-tooth-9.png");
});

test("buildGroupedExtractionsChartDisplay maps grouped extractions only", () => {
  const display = buildGroupedExtractionsChartDisplay({
    teeth_selection: [7, 8, 9, 10],
    extractions: [
      { extraction_id: 10, teeth_numbers: [2, 15] },
      { extraction_id: 11, teeth_numbers: [1, 16] },
    ],
    slip_product_teeth_selections: [
      {
        tooth_number: 8,
        selected_tooth_image_url: "https://example.com/metal-frame-8.png",
        extraction: { code: "TIM", name: "Teeth in mouth", is_tim: "Yes", status: "Active" },
      },
    ],
    product: {
      extractions: [
        {
          extraction_id: 10,
          code: "MT",
          name: "Missing teeth",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
        },
        {
          extraction_id: 11,
          code: "WEOD",
          name: "Will extract on delivery",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
        },
      ],
    },
  });

  assert.equal(display.toothExtractionMap[2], "MT");
  assert.equal(display.toothExtractionMap[8], undefined);
  assert.equal(display.toothExtractionMap[7], undefined);
});

test("overlayPreloadExtractionsOnChartDisplay skips product teeth", () => {
  const chartDisplay = buildGroupedExtractionsChartDisplay({
    extractions: [{ extraction_id: 10, teeth_numbers: [2] }],
    product: {
      extractions: [
        {
          extraction_id: 10,
          code: "MT",
          name: "Missing teeth",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
        },
      ],
    },
  });
  const preloadDisplay = buildExtractionDisplayFromToothChartPreload(
    {
      arch: "upper",
      teeth: [
        { tooth_number: 2, extraction_id: 10, image_url: "https://example.com/missing-2.png" },
        { tooth_number: 8, extraction_id: null, image_url: "https://example.com/product-8.png" },
      ],
    },
    {
      teeth_selection: [8],
      product: {
        extractions: [
          {
            extraction_id: 10,
            code: "MT",
            name: "Missing teeth",
            visibility_type: "Image",
            overlay: "No",
            status: "Active",
          },
        ],
      },
    },
  );
  const merged = overlayPreloadExtractionsOnChartDisplay(chartDisplay, preloadDisplay, [
    { teeth_selection: [8] },
  ]);
  assert.equal(merged.extractionImagesByCode.MT[2], "https://example.com/missing-2.png");
  assert.equal(merged.toothExtractionMap[8], undefined);
});

test("product teeth use slip_product_teeth_selections image when TIM catalog has no images", () => {
  // Real removable-product shape: product-teeth rows carry no extraction object,
  // only `selected_tooth_image_url`, and the TIM catalog row has an empty images
  // array. The per-tooth selection image is the only source for the chart image.
  const apiProduct = {
    type: "Upper",
    category: { name: "Removable Restorations" },
    teeth_selection: "7,8,9,10",
    product: {
      extractions: [
        {
          extraction_id: 9,
          code: "TIM1",
          name: "Teeth in mouth",
          is_tim: "Yes",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
          images: [],
        },
      ],
    },
    slip_product_teeth_selections: [
      { tooth_number: 7, extraction_id: null, extraction: null, selected_tooth_image_url: "https://example.com/tim-7.png" },
      { tooth_number: 8, extraction_id: null, extraction: null, selected_tooth_image_url: "https://example.com/tim-8.png" },
    ],
  };

  const display = buildExtractionDisplayFromSlipProduct(apiProduct);

  assert.equal(display.toothExtractionMap[7], "TIM1");
  assert.equal(display.toothExtractionMap[8], "TIM1");
  assert.equal(display.extractionImagesByCode.TIM1[7], "https://example.com/tim-7.png");
  assert.equal(display.extractionImagesByCode.TIM1[8], "https://example.com/tim-8.png");
});

test("buildArchChartExtractionDisplayFromSlipProducts merges tooth chart and preload layers", () => {
  const apiProduct = {
    type: "Maxillary",
    teeth_selection: [7, 8, 9, 10],
    extractions: [{ extraction_id: 10, teeth_numbers: [2, 15] }],
    slip_product_teeth_selections: [
      {
        tooth_number: 8,
        selected_tooth_image_url: "https://example.com/metal-frame-8.png",
        extraction: { code: "TIM", name: "Teeth in mouth", is_tim: "Yes", status: "Active" },
      },
    ],
    product: {
      extractions: [
        {
          extraction_id: 10,
          code: "MT",
          name: "Missing teeth",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
        },
        {
          extraction_id: 20,
          code: "TIM",
          name: "Teeth in mouth",
          is_tim: "Yes",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
        },
      ],
    },
    tooth_chart_preload: {
      arch: "upper",
      teeth: [
        {
          tooth_number: 2,
          extraction_id: 10,
          image_url: "https://example.com/missing-2.png",
          visibility_type: "Image",
          overlay: "No",
        },
        {
          tooth_number: 8,
          extraction_id: null,
          default_image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-8.png",
          image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-8.png",
          visibility_type: "Image",
          overlay: "No",
        },
      ],
    },
  };

  const merged = buildArchChartExtractionDisplayFromSlipProducts([apiProduct], "maxillary");

  assert.equal(merged.toothExtractionMap[2], "MT");
  assert.equal(merged.extractionImagesByCode.MT[2], "https://example.com/missing-2.png");
  assert.equal(merged.toothExtractionMap[8], "TIM");
  assert.equal(
    merged.extractionImagesByCode.TIM[8],
    "https://example.com/metal-frame-8.png",
  );
});

test("overlayToothChartPreloadOnArchDisplay keeps slip catalog codes and applies preload images", () => {
  const apiProduct = {
    teeth_selection: [7, 8, 9, 10],
    extractions: [
      { extraction_id: 10, teeth_numbers: [2, 15] },
      { extraction_id: 11, teeth_numbers: [1, 16] },
    ],
    slip_product_teeth_selections: [
      {
        tooth_number: 8,
        selected_tooth_image_url: "https://example.com/metal-frame-8.png",
        extraction: { code: "TIM", name: "Teeth in mouth", is_tim: "Yes", status: "Active" },
      },
    ],
    product: {
      extractions: [
        {
          extraction_id: 10,
          code: "MT",
          name: "Missing teeth",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
        },
        {
          extraction_id: 20,
          code: "TIM",
          name: "Teeth in mouth",
          is_tim: "Yes",
          visibility_type: "Image",
          overlay: "No",
          status: "Active",
        },
      ],
    },
    tooth_chart_preload: {
      arch: "upper",
      teeth: [
        {
          tooth_number: 2,
          extraction_id: 10,
          image_url: "https://example.com/missing-2.png",
          visibility_type: "Image",
          overlay: "No",
        },
        {
          tooth_number: 8,
          extraction_id: null,
          default_image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-8.png",
          image_url: "http://dev-api.rxn3d.com/images/teeth/maxillary/tooth-8.png",
          visibility_type: "Image",
          overlay: "No",
        },
      ],
    },
  };

  let slipDisplay = buildExtractionDisplayFromSlipProduct(apiProduct);
  slipDisplay = scopeArchChartExtractionDisplay(slipDisplay, [apiProduct]);
  const preloadDisplay = buildExtractionDisplayFromToothChartPreload(
    apiProduct.tooth_chart_preload,
    apiProduct,
  );
  const merged = overlayToothChartPreloadOnArchDisplay(slipDisplay, preloadDisplay, [apiProduct]);

  assert.equal(merged.toothExtractionMap[2], "MT");
  assert.equal(merged.extractionImagesByCode.MT[2], "https://example.com/missing-2.png");
  assert.equal(merged.toothExtractionMap[8], "TIM");
  assert.equal(
    merged.extractionImagesByCode.TIM[8],
    "https://example.com/metal-frame-8.png",
  );
  assert.equal(merged.toothExtractionMap[7], undefined);
});

test("mergePreloadExtractionDisplaysForArch ignores preload for the wrong arch", () => {
  const merged = mergePreloadExtractionDisplaysForArch(
    [
      {
        type: "Maxillary",
        tooth_chart_preload: {
          arch: "lower",
          teeth: [{ tooth_number: 24, extraction_id: 10, image_url: "https://example.com/24.png" }],
        },
      },
    ],
    "maxillary",
  );
  assert.equal(merged, null);
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
