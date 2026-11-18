import test from "node:test";
import assert from "node:assert/strict";

import { hidesStagePricing, skipsStagePriceValidation } from "./stage-pricing-visibility.ts";
import { collectStagesStepErrors } from "./stages-step-validation.ts";
import {
  mergeStageGradeDetailsIntoStages,
  validateStageAllocationPercents,
} from "./library-product-api-mapping.ts";

test("only a loaded product mode hides stage pricing", () => {
  assert.equal(hidesStagePricing("product"), true);
  assert.equal(hidesStagePricing("stage"), false);
  // loading / failed settings call -> current stage-mode UI
  assert.equal(hidesStagePricing(undefined), false);
  assert.equal(hidesStagePricing(null), false);
});

test("stage price validation is skipped for super-admins and product-mode labs only", () => {
  assert.equal(skipsStagePriceValidation("lab_admin", "product"), true);
  assert.equal(skipsStagePriceValidation("superadmin", undefined), true);
  assert.equal(skipsStagePriceValidation("lab_admin", "stage"), false);
  assert.equal(skipsStagePriceValidation("lab_admin", undefined), false);
});

const form = () => ({
  has_grade_based_pricing: "Yes",
  is_teeth_based_price: "No",
  is_single_stage: "No",
  grades: [
    { grade_id: 2, price: "300" },
    // No grade price either, so an empty stage cell has nothing to fall back to.
    { grade_id: 3, price: "" },
  ],
  stages: [
    { stage_id: 11, days: "3", is_default: "Yes", economy_price: "", grade_prices: { 2: "120", 3: "180" } },
    // A stage whose prices were never filled: hidden in product mode, must not block saving.
    { stage_id: 12, days: "2", is_default: "No", economy_price: "", grade_prices: {} },
  ],
});

test("product mode: hidden empty stage prices do not block the Stages step, stage mode still requires them", () => {
  const opts = { stagesSectionEnabled: true, isSingleStage: false };
  const productErrors = collectStagesStepErrors(form(), {
    ...opts,
    isSuperAdmin: skipsStagePriceValidation("lab_admin", "product"),
  });
  assert.deepEqual(productErrors, []);

  const stageErrors = collectStagesStepErrors(form(), {
    ...opts,
    isSuperAdmin: skipsStagePriceValidation("lab_admin", "stage"),
  });
  assert.ok(stageErrors.some((e) => e.field.startsWith("stages.1.grade_price")), JSON.stringify(stageErrors));

  // Days are still required in product mode.
  const noDays = form();
  noDays.stages[0].days = "";
  const dayErrors = collectStagesStepErrors(noDays, { ...opts, isSuperAdmin: true });
  assert.deepEqual(dayErrors.map((e) => e.field), ["stages.0.days"]);
});

test("product mode keeps existing stage prices in the save payload unchanged", () => {
  const values = form();
  const before = JSON.parse(JSON.stringify(values.stages));

  // Teeth-based allocation check is skipped (inputs hidden) and does not touch the rows.
  assert.equal(
    validateStageAllocationPercents(values.stages, {
      isTeethBased: true,
      isSuperAdmin: skipsStagePriceValidation("lab_admin", "product"),
    }),
    null,
  );
  collectStagesStepErrors(values, { stagesSectionEnabled: true, isSingleStage: false, isSuperAdmin: true });

  // Update path: the API's stage x grade matrix is folded into the payload, existing cells are kept.
  const payloadStages = mergeStageGradeDetailsIntoStages(values.stages, [
    { stage_id: 11, grade_id: 2, price: "120" },
    { stage_id: 11, grade_id: 3, price: "180" },
  ]);

  assert.deepEqual(values.stages, before, "validation must not mutate form state");
  assert.equal(String(payloadStages[0].grade_prices[2]), "120");
  assert.equal(String(payloadStages[0].grade_prices[3]), "180");
  assert.deepEqual(payloadStages[1].grade_prices, {});
});
