import test from "node:test";
import assert from "node:assert/strict";
import { getClaspOverlayImageUrl } from "./claspOverlayImage.ts";

test("returns null when tooth is not a clasp tooth", () => {
  const result = getClaspOverlayImageUrl({
    toothNumber: 7,
    claspTeeth: [],
    extractionsByCode: {
      CLASP_L1_G6: { code: "CLASP_L1_G6", name: "Clasps", visibility_type: "Image", overlay: "Yes" },
    },
    extractionImagesByCode: {
      CLASP_L1_G6: { 7: "https://example.com/clasp-7.png" },
    },
  });

  assert.equal(result, null);
});

test("falls back to the clasp extraction image even when toothExtractionMap points elsewhere", () => {
  const result = getClaspOverlayImageUrl({
    toothNumber: 7,
    claspTeeth: [7],
    toothExtractionMap: { 7: "MT_L1_G2" },
    extractionsByCode: {
      MT_L1_G2: { code: "MT_L1_G2", name: "Missing teeth", visibility_type: "Image", overlay: "No" },
      CLASP_L1_G6: { code: "CLASP_L1_G6", name: "Clasps", visibility_type: "Image", overlay: "Yes" },
    },
    extractionImagesByCode: {
      CLASP_L1_G6: { 7: "https://example.com/clasp-7.png" },
    },
  });

  assert.equal(result, "https://example.com/clasp-7.png");
});

test("uses the mapped clasp extraction when toothExtractionMap already points to clasp", () => {
  const result = getClaspOverlayImageUrl({
    toothNumber: 9,
    claspTeeth: [9],
    toothExtractionMap: { 9: "CLASP_L1_G6" },
    extractionsByCode: {
      CLASP_L1_G6: { code: "CLASP_L1_G6", name: "Clasps", visibility_type: "Image", overlay: "Yes" },
    },
    extractionImagesByCode: {
      CLASP_L1_G6: { 9: "https://example.com/clasp-9.png" },
    },
  });

  assert.equal(result, "https://example.com/clasp-9.png");
});

test("does not use clasp image when clasp extraction is not image overlay", () => {
  const result = getClaspOverlayImageUrl({
    toothNumber: 11,
    claspTeeth: [11],
    extractionsByCode: {
      CLASP_L1_G6: { code: "CLASP_L1_G6", name: "Clasps", visibility_type: "Color", overlay: "Yes" },
    },
    extractionImagesByCode: {
      CLASP_L1_G6: { 11: "https://example.com/clasp-11.png" },
    },
  });

  assert.equal(result, null);
});
