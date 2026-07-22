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

  const needsStumpShade =
    namedShadeFields.length > 0
      ? namedShadeFields.some((field) => getShadeFieldType(field) === "stump_shade")
      : fixedChain.includes("fixed_stump_shade") &&
        (product?.has_gum_shade === "Yes" ||
          matchesShadeName(
            product,
            (n) => (n.includes("stump") || n.includes("gum")) && n.includes("shade")
          ));

  const hasLegacyToothShade =
    product?.has_teeth_shade === "Yes" ||
    matchesShadeName(
      product,
      (n) =>
        (n.includes("teeth") ||
          (n.includes("tooth") && !n.includes("stump") && !n.includes("gum"))) &&
        n.includes("shade")
    );
  const hasLegacyTrioShade =
    product?.has_teeth_shade === "Yes" ||
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

  const needsToothShade =
    namedShadeFields.length > 0
      ? namedShadeFields.some((field) => getShadeFieldType(field) === "tooth_shade")
      : (fixedChain.includes("fixed_stump_shade") && hasLegacyToothShade) ||
        (fixedChain.includes("fixed_shade_trio") && hasLegacyTrioShade);

  const shadeRequired =
    namedShadeFields.length > 0 ? !!firstMissingShadeField : needsStumpShade || needsToothShade;

  // Gum shade may live only in the fixed_stump_shade field value (picked via the panel
  // gum picker) rather than in shade state — accept either, at the card's rep tooth or
  // the group stage tooth, which diverge once extraction teeth join the group.
  const stumpShadeFieldDone =
    isFieldCompleted(arch, stageToothNumber, "fixed_stump_shade") ||
    !!getFieldValue(arch, stageToothNumber, "fixed_stump_shade")?.trim() ||
    isFieldCompleted(arch, shadeToothNumber, "fixed_stump_shade") ||
    !!getFieldValue(arch, shadeToothNumber, "fixed_stump_shade")?.trim();

  // Trivially satisfied when the product needs no tooth shade at all, otherwise the gum
  // picker would wait forever on a shade that is never going to be selected.
  const toothShadeSatisfiedForGum =
    !needsToothShade ||
    !!getSelectedShade(fixedShadeProductId, arch, "tooth_shade") ||
    isFieldCompleted(arch, stageToothNumber, "fixed_shade_trio");

  const fixedShadesComplete = areFixedProductShadesComplete(
    product?.advance_fields,
    fixedShadeProductId,
    arch,
    getSelectedShade,
    { needsStumpShade: needsStumpShade && !stumpShadeFieldDone, needsToothShade }
  );
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
    gumAutoOpenVisible:
      namedShadeFields.length === 0 &&
      needsStumpShade &&
      !isAnyModalOpen &&
      openShadeFieldType === null &&
      toothShadeSatisfiedForGum &&
      !gumShadePicked,
    gumAutoOpenHasValue: gumShadePicked,
  };
}
