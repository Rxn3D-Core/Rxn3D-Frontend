import test from "node:test";
import assert from "node:assert/strict";

import {
  areAllImplantDetailsComplete,
  isImplantDetailFilled,
} from "./implantDetailHelpers.ts";

test("areAllImplantDetailsComplete accepts filled detail data when complete flag missing", () => {
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
});

test("areAllImplantDetailsComplete is false when neither flag nor data is complete", () => {
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
