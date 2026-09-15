import test from "node:test";
import assert from "node:assert/strict";

import {
  areAllImplantDetailsComplete,
  isImplantDetailFilled,
  isImplantDetailFormComplete,
} from "./implantDetailHelpers.ts";

test("areAllImplantDetailsComplete unlocks when data is filled even without complete flag", () => {
  const filled = {
    brand: "Nobel",
    systemName: "Active",
    platform: "NP",
    size: "4.3",
    inclusions: "No inclusion",
    inclusionQty: 0,
    abutmentType: "",
    abutmentDetail: "",
    dynamicFields: {},
  };
  assert.equal(
    areAllImplantDetailsComplete([4, 7], { 4: true }, { 7: filled }),
    true
  );
  assert.equal(
    areAllImplantDetailsComplete([4, 7], { 4: true, 7: true }, { 7: filled }),
    true
  );
});

test("areAllImplantDetailsComplete is false when neither flag nor data is filled", () => {
  assert.equal(
    areAllImplantDetailsComplete([4], {}, { 4: { brand: "", systemName: "", platform: "", size: "", inclusions: "", inclusionQty: 0, abutmentType: "", abutmentDetail: "", dynamicFields: {} } }),
    false
  );
});

test("isImplantDetailFilled detects minimal filled implant row", () => {
  assert.equal(
    isImplantDetailFilled({
      brand: "Straumann",
      systemName: "BLX",
      platform: "",
      size: "",
      inclusions: "",
      inclusionQty: 0,
      abutmentType: "",
      abutmentDetail: "",
      dynamicFields: {},
    }),
    true
  );
});

test("areAllImplantDetailsComplete unlocks later fields after lab recommendation", () => {
  assert.equal(
    areAllImplantDetailsComplete(
      [8],
      {},
      {
        8: {
          brand: "",
          systemName: "",
          platform: "",
          size: "",
          inclusions: "",
          inclusionQty: 0,
          abutmentType: "",
          abutmentDetail: "",
          dynamicFields: {},
          labRecommendationRequested: true,
        },
      }
    ),
    true
  );
});

test("isImplantDetailFormComplete requires photo for lab recommendation", () => {
  const base = {
    brand: "",
    systemName: "",
    platform: "",
    size: "",
    inclusions: "",
    inclusionQty: 0,
    abutmentType: "",
    abutmentDetail: "",
    dynamicFields: {},
    labRecommendationRequested: true,
  };
  assert.equal(isImplantDetailFormComplete(base), false);
  assert.equal(
    isImplantDetailFormComplete({ ...base, referencePhoto: "data:image/png;base64,abc" }),
    true
  );
});
