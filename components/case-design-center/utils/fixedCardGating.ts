/**
 * Single source of truth for fixed-restoration card gating.
 *
 * A fixed card is rendered by two separate code paths in each arch panel: card 0
 * (the product chosen during slip creation) and added-product cards (products added
 * later). Those paths were copy-pasted and drifted, so a fix applied to one — the
 * "Done" gate, the stage auto-open, the gum shade auto-open — silently left the other
 * behaving differently. Every gating decision now comes from here so both paths, on
 * both arches, are answering the same questions with the same rules.
 */

import type {
  Arch,
  ProductAdvanceField,
  ProductApiData,
  ShadeFieldType,
} from "../types";
import type { FieldStep } from "../hooks/useToothFieldProgress";
import { getRetentionFieldChain } from "../hooks/useToothFieldProgress";
import { isSingleStageNoStages } from "./categoryHelpers";
import { getActiveGrades, isGradeStepCompleteForDisplay } from "./gradeHelpers";
import {
  areFixedProductShadesComplete,
  getFirstMissingShadeGuideField,
  getShadeFieldType,
  getShadeGuideAdvanceFields,
  resolveFixedShadeProductId,
  shouldUseAccordionOnlyFixedShades,
} from "./shadeGuideAdvanceFields";

type FixedCardProduct = Partial<ProductApiData> | null | undefined;

type GetSelectedShade = (
  productId: string,
  arch: Arch,
  fieldType: ShadeFieldType,
  advanceFieldId?: number | null
) => string;

export interface FixedCardGatingInput {
  arch: Arch;
  /** Product driving the field chain — the tooth product, falling back to the card product. */
  product: FixedCardProduct;
  /**
   * Product the card was created with. Drives whether a retention "Done"
   * acknowledgement is required at all; may lag behind `product` while details load.
   */
  cardProduct: FixedCardProduct;
  /** 0 for the initial (create-slip) product card, AddedProduct.id otherwise. */
  cardId: number;
  /** Teeth currently assigned to this card. */
  toothNumbers: readonly number[];
  /** Tooth the group's field progress is stored against. */
  stageToothNumber: number;
  /** Shade state is keyed per product, not per tooth; card 0 keys off the group tooth. */
  shadeToothNumber?: number;
  caseSubmitted: boolean;
  /** A full-screen modal (stage / impression / add-ons) is open. */
  isAnyModalOpen: boolean;
  /** shadeSelectionState.fieldType — non-null means a shade picker is already open. */
  openShadeFieldType: ShadeFieldType | null;
  /** Stage selection recorded outside field progress (selectedStages[stageProductId]). */
  hasSelectedStage: boolean;

  getSelectedShade: GetSelectedShade;
  isFieldCompleted: (arch: Arch, toothNumber: number, step: FieldStep) => boolean;
  getFieldValue: (arch: Arch, toothNumber: number, step: FieldStep) => string | undefined;
  isFieldVisible: (
    arch: Arch,
    toothNumber: number,
    step: FieldStep,
    chain?: readonly FieldStep[]
  ) => boolean;
  /** From useExtractionsAcknowledged — per-card retention "Done" state. */
  isFixedRetentionSetupComplete: (
    product: FixedCardProduct,
    caseSubmitted?: boolean,
    cardId?: number
  ) => boolean;
}

export interface FixedCardGating {
  fixedChain: readonly FieldStep[];
  isFixedStep: (step: FieldStep) => boolean;
  fixedShadeProductId: string;

  namedShadeFields: ProductAdvanceField[];
  firstMissingShadeField: { id: number; name: string; fieldType: ShadeFieldType } | null;
  needsStumpShade: boolean;
  needsToothShade: boolean;
  shadeRequired: boolean;
  stumpShadeFieldDone: boolean;
  toothShadeSatisfiedForGum: boolean;
  fixedShadesComplete: boolean;
  fixedShadeIncomplete: boolean;
  usesAccordionShadePicker: boolean;

  /**
   * The retention "Done" acknowledgement has been given (or isn't required) AND the
   * card is actually ready to configure. Gates every auto-open: an unhydrated product
   * or a card with no teeth must never pull the user into the field chain.
   */
  retentionFieldsVisible: boolean;

  stageVisible: boolean;
  stageEmpty: boolean;

  /**
   * Product exposes selectable grades AND the grade step is not yet complete. Grade is
   * not part of the fixed field chain (it renders alongside stage), so the teeth-shade
   * auto-open must wait on this to keep the order Stage → Grade → Teeth Shade.
   */
  gradeIncomplete: boolean;

  /** Legacy gum shade picker (fixed_stump_shade slot) should open by itself. */
  gumAutoOpenVisible: boolean;
  gumAutoOpenHasValue: boolean;
}

function matchesShadeName(
  product: FixedCardProduct,
  predicate: (name: string) => boolean
): boolean {
  return (product?.advance_fields || []).some((f) =>
    predicate((f.name || "").toLowerCase())
  );
}

export function resolveFixedCardGating(input: FixedCardGatingInput): FixedCardGating {
  const {
    arch,
    product,
    cardProduct,
    cardId,
    toothNumbers,
    stageToothNumber,
    caseSubmitted,
    isAnyModalOpen,
    openShadeFieldType,
    hasSelectedStage,
    getSelectedShade,
    isFieldCompleted,
    getFieldValue,
    isFieldVisible,
    isFixedRetentionSetupComplete,
  } = input;
  const shadeToothNumber = input.shadeToothNumber ?? stageToothNumber;

  const fixedChain = getRetentionFieldChain(product?.advance_fields, product);
  const isFixedStep = (step: FieldStep) =>
    isFieldVisible(arch, stageToothNumber, step, fixedChain);

  const fixedShadeProductId = resolveFixedShadeProductId(product?.id, shadeToothNumber);
  const namedShadeFields = getShadeGuideAdvanceFields(product?.advance_fields);
  const firstMissingShadeField = getFirstMissingShadeGuideField(
    product?.advance_fields,
    fixedShadeProductId,
    arch,
    getSelectedShade
  );

  // Classic Teeth Shade / Gum Shade (has_* flags) are separate from named shade_guide
  // fields (Body / Cervical / …). Prefer the removaables-style classic flags whenever set.
  const needsClassicToothShade = product?.has_teeth_shade === "Yes";
  const needsClassicGumShade = product?.has_gum_shade === "Yes";
  const hasClassicShadeFlags = needsClassicToothShade || needsClassicGumShade;

  const needsNamedStumpShade = namedShadeFields.some(
    (field) => getShadeFieldType(field) === "stump_shade"
  );
  const needsNamedToothShade = namedShadeFields.some(
    (field) => getShadeFieldType(field) === "tooth_shade"
  );

  const hasLegacyToothShade =
    needsClassicToothShade ||
    matchesShadeName(
      product,
      (n) =>
        (n.includes("teeth") ||
          (n.includes("tooth") && !n.includes("stump") && !n.includes("gum"))) &&
        n.includes("shade")
    );
  const hasLegacyTrioShade =
    needsClassicToothShade ||
    matchesShadeName(
      product,
      (n) =>
        (n.includes("cervical") ||
          n.includes("incisal") ||
          n.includes("body") ||
          n.includes("crown") ||
          (n.includes("tooth") && !n.includes("stump"))) &&
        n.includes("shade")
    );

  const needsStumpShade = hasClassicShadeFlags
    ? needsClassicGumShade
    : namedShadeFields.length > 0
      ? needsNamedStumpShade
      : fixedChain.includes("fixed_stump_shade") &&
        (needsClassicGumShade ||
          matchesShadeName(
            product,
            (n) => (n.includes("stump") || n.includes("gum")) && n.includes("shade")
          ));

  const needsToothShade = hasClassicShadeFlags
    ? needsClassicToothShade
    : namedShadeFields.length > 0
      ? needsNamedToothShade
      : (fixedChain.includes("fixed_stump_shade") && hasLegacyToothShade) ||
        (fixedChain.includes("fixed_shade_trio") && hasLegacyTrioShade);

  const shadeRequired = needsStumpShade || needsToothShade || !!firstMissingShadeField;

  // Gum shade may live only in the fixed_stump_shade field value (picked via the panel
  // gum picker) rather than in shade state — accept either, at the card's rep tooth or
  // the group stage tooth, which diverge once extraction teeth join the group.
  // Do not treat "completed with empty/placeholder value" as done (edit preload used to
  // mark the whole chain complete even when no shade was saved).
  const isRealShadeValue = (raw: string | undefined) => {
    const trimmed = raw?.trim() ?? "";
    if (!trimmed) return false;
    if (
      trimmed === "shade-sync" ||
      trimmed === "shade-sync-skip-stump" ||
      trimmed === "selected"
    ) {
      return false;
    }
    try {
      if (trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed?.name === "string" && parsed.name.trim()) {
          const name = parsed.name.trim().toLowerCase();
          return (
            name !== "shade-sync" &&
            name !== "shade-sync-skip-stump" &&
            name !== "selected"
          );
        }
        return false;
      }
    } catch {
      /* plain */
    }
    return true;
  };

  const stumpShadeFieldDone =
    !!getSelectedShade(fixedShadeProductId, arch, "stump_shade") ||
    isRealShadeValue(getFieldValue(arch, stageToothNumber, "fixed_stump_shade")) ||
    isRealShadeValue(getFieldValue(arch, shadeToothNumber, "fixed_stump_shade"));

  const toothShadeFieldDone =
    !!getSelectedShade(fixedShadeProductId, arch, "tooth_shade") ||
    isRealShadeValue(getFieldValue(arch, stageToothNumber, "fixed_shade_trio")) ||
    isRealShadeValue(getFieldValue(arch, shadeToothNumber, "fixed_shade_trio"));

  // Trivially satisfied when the product needs no tooth shade at all, otherwise the gum
  // picker would wait forever on a shade that is never going to be selected.
  const toothShadeSatisfiedForGum = !needsToothShade || toothShadeFieldDone;

  const fixedShadesComplete = areFixedProductShadesComplete(
    product?.advance_fields,
    fixedShadeProductId,
    arch,
    getSelectedShade,
    {
      needsStumpShade: needsStumpShade && !stumpShadeFieldDone,
      needsToothShade: needsToothShade && !toothShadeFieldDone,
      classicShadeFlags: hasClassicShadeFlags,
    }
  );
  // Named shade_guide fields still use the accordion picker; classic Teeth/Gum render
  // alongside them and gate completeness via classicShadeFlags.
  const usesAccordionShadePicker = shouldUseAccordionOnlyFixedShades(product?.advance_fields);

  // isFixedRetentionSetupComplete answers "true" for a null product ("nothing to
  // acknowledge"), so a card whose details are still loading would unlock the field
  // chain and auto-open stage/grade before the Done button has even rendered.
  const retentionFieldsVisible =
    isFixedRetentionSetupComplete(cardProduct, caseSubmitted, cardId) &&
    (caseSubmitted || (!!cardProduct && toothNumbers.length > 0));

  const stageVisible = !isSingleStageNoStages(product) && isFixedStep("fixed_stage");
  const stageEmpty =
    !isFieldCompleted(arch, stageToothNumber, "fixed_stage") &&
    !getFieldValue(arch, stageToothNumber, "fixed_stage")?.trim() &&
    !hasSelectedStage;

  // Grade renders (and is required) only when the product carries selectable grades —
  // the same condition the Grade field itself uses to render. Keyed off the stage tooth
  // where RetentionProductFields stores the grade. Gate off `getActiveGrades` (not the
  // has_grade flag) so a flag-only product with no grade list can't deadlock the shade.
  const gradeIncomplete =
    getActiveGrades(product?.grades).length > 0 &&
    !isGradeStepCompleteForDisplay(
      getFieldValue(arch, stageToothNumber, "grade") ?? "",
      isFieldCompleted(arch, stageToothNumber, "grade"),
      product as ProductApiData | null | undefined
    );

  const gumShadePicked =
    !!getSelectedShade(fixedShadeProductId, arch, "stump_shade") || stumpShadeFieldDone;

  return {
    fixedChain,
    isFixedStep,
    fixedShadeProductId,
    namedShadeFields,
    firstMissingShadeField,
    needsStumpShade,
    needsToothShade,
    shadeRequired,
    stumpShadeFieldDone,
    toothShadeSatisfiedForGum,
    fixedShadesComplete,
    fixedShadeIncomplete: !fixedShadesComplete,
    usesAccordionShadePicker,
    retentionFieldsVisible,
    stageVisible,
    stageEmpty,
    gradeIncomplete,
    gumAutoOpenVisible:
      needsStumpShade &&
      !isAnyModalOpen &&
      openShadeFieldType === null &&
      toothShadeSatisfiedForGum &&
      !gumShadePicked,
    gumAutoOpenHasValue: gumShadePicked,
  };
}
