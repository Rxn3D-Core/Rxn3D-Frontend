import test from "node:test";
import assert from "node:assert/strict";

import {
  areExtractionRequirementsSatisfied,
  countTeethForExtractionStatus,
  effectiveRequiredMinTeeth,
  extractionStatusMeetsMinMax,
  isHardRequiredExtraction,
  isOrGroupRequiredExtraction,
} from "./extractionRequirementHelpers.ts";

const WED = {
  name: "Will extract on delivery",
  code: "WE_IFD",
  is_default: "Yes",
  is_tim: "No",
  is_required: "Yes",
  is_optional: "No",
  overlay: "No",
  status: "Active",
  min_teeth: null,
  max_teeth: null,
};

const MISSING_OPTIONAL_ONLY = {
  name: "Missing teeth",
  code: "MT_IFD",
  is_default: "No",
  is_tim: "No",
  is_required: "No",
  is_optional: "Yes",
  overlay: "No",
  status: "Active",
  min_teeth: null,
  max_teeth: null,
};

const MISSING_HARD = {
  ...MISSING_OPTIONAL_ONLY,
  is_required: "Yes",
  is_optional: "No",
  min_teeth: 1,
};

const MISSING_OR = {
  ...MISSING_OPTIONAL_ONLY,
  is_required: "Yes",
  is_optional: "Yes",
  min_teeth: 1,
};

const WED_OR = {
  ...WED,
  is_optional: "Yes",
};

test("flag helpers distinguish hard required vs OR-group", () => {
  assert.equal(isHardRequiredExtraction(WED), true);
  assert.equal(isOrGroupRequiredExtraction(WED), false);
  assert.equal(isHardRequiredExtraction(MISSING_OR), false);
  assert.equal(isOrGroupRequiredExtraction(MISSING_OR), true);
});

test("effectiveRequiredMinTeeth defaults to 1", () => {
  assert.equal(effectiveRequiredMinTeeth(WED), 1);
  assert.equal(effectiveRequiredMinTeeth({ ...WED, min_teeth: 3 }), 3);
});

test("extractionStatusMeetsMinMax respects max", () => {
  assert.equal(extractionStatusMeetsMinMax(2, { ...WED, min_teeth: 1, max_teeth: 2 }), true);
  assert.equal(extractionStatusMeetsMinMax(3, { ...WED, min_teeth: 1, max_teeth: 2 }), false);
});

test("default-stamped will-extract teeth count toward status", () => {
  const selected = [1, 2, 3, 4];
  const map = { 1: "WE_IFD", 2: "WE_IFD", 3: "WE_IFD", 4: "WE_IFD" };
  assert.equal(
    countTeethForExtractionStatus(WED, {
      selectedTeeth: selected,
      toothExtractionMap: map,
    }),
    4
  );
});

test("vacuous (no required flags): satisfied immediately", () => {
  assert.equal(
    areExtractionRequirementsSatisfied([MISSING_OPTIONAL_ONLY], {
      selectedTeeth: [],
      toothExtractionMap: {},
    }),
    true
  );
});

test("default required + stamped teeth: Done at start", () => {
  const selected = [1, 2, 3];
  const map = { 1: "WE_IFD", 2: "WE_IFD", 3: "WE_IFD" };
  assert.equal(
    areExtractionRequirementsSatisfied([WED, MISSING_OPTIONAL_ONLY], {
      selectedTeeth: selected,
      toothExtractionMap: map,
    }),
    true
  );
});

test("hard required missing empty: not satisfied", () => {
  assert.equal(
    areExtractionRequirementsSatisfied([WED, MISSING_HARD], {
      selectedTeeth: [1, 2],
      toothExtractionMap: { 1: "WE_IFD", 2: "WE_IFD" },
    }),
    false
  );
});

test("hard required missing with one tooth: satisfied", () => {
  assert.equal(
    areExtractionRequirementsSatisfied([WED, MISSING_HARD], {
      selectedTeeth: [1, 2],
      toothExtractionMap: { 1: "WE_IFD", 2: "MT_IFD" },
    }),
    true
  );
});

test("OR-group: one member with min teeth unlocks Done", () => {
  assert.equal(
    areExtractionRequirementsSatisfied([WED_OR, MISSING_OR], {
      selectedTeeth: [1, 2],
      toothExtractionMap: { 1: "MT_IFD", 2: "MT_IFD" },
    }),
    true
  );
  assert.equal(
    areExtractionRequirementsSatisfied([WED_OR, MISSING_OR], {
      selectedTeeth: [1, 2],
      toothExtractionMap: {},
    }),
    false
  );
});

test("multiple hard required: both must pass", () => {
  const clasp = {
    name: "Clasps",
    code: "CLASP1",
    is_default: "No",
    is_tim: "No",
    is_required: "Yes",
    is_optional: "No",
    overlay: "Yes",
    status: "Active",
    min_teeth: 1,
    max_teeth: null,
  };
  assert.equal(
    areExtractionRequirementsSatisfied([MISSING_HARD, clasp], {
      selectedTeeth: [1, 2],
      toothExtractionMap: { 1: "MT_IFD" },
      claspTeeth: [],
    }),
    false
  );
  assert.equal(
    areExtractionRequirementsSatisfied([MISSING_HARD, clasp], {
      selectedTeeth: [1, 2],
      toothExtractionMap: { 1: "MT_IFD" },
      claspTeeth: [2],
    }),
    true
  );
});
