"use client";

import { CenterActionIcons } from "./CenterActionIcons";
import { CaseSummaryNotes } from "./CaseSummaryNotes";
import { shouldShowCaseSummaryNotes } from "../utils/caseSummaryVisibility";
import { useCaseDesignState } from "../hooks/useCaseDesignState";
import type { RushArchSlot } from "../utils/rushModalContext";

type CaseDesignState = ReturnType<typeof useCaseDesignState>;

import type { ImplantDetailData } from "./ImplantDetailSection";

interface CaseDesignSummarySectionProps {
  state: CaseDesignState;
  caseSubmitted?: boolean;
  rushCasesEnabled?: boolean;
  allProductsComplete: boolean;
  maxillaryHasRemovables: boolean;
  mandibularHasRemovables: boolean;
  maxillaryImplantDetailByTooth?: Record<number, ImplantDetailData>;
  mandibularImplantDetailByTooth?: Record<number, ImplantDetailData>;
  rushArchSlots?: RushArchSlot[];
  /** When false, hide the summary Add Addons action (no product in the case supports add-ons). */
  caseHasAddons?: boolean;
  onCaseSummaryNotesChange?: (text: string) => void;
}

export function CaseDesignSummarySection({
  state,
  caseSubmitted,
  rushCasesEnabled,
  allProductsComplete,
  maxillaryHasRemovables,
  mandibularHasRemovables,
  maxillaryImplantDetailByTooth,
  mandibularImplantDetailByTooth,
  rushArchSlots = [],
  caseHasAddons = false,
  onCaseSummaryNotesChange,
}: CaseDesignSummarySectionProps) {
  const showCaseSummaryNotes = shouldShowCaseSummaryNotes({
    caseSubmitted,
    allProductsComplete,
  });

  if (!showCaseSummaryNotes) return null;

  const showIcons = !caseSubmitted;

  return (
    <div className="relative mt-4">
      {showIcons && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 inline-flex">
          <CenterActionIcons
            visible={showCaseSummaryNotes}
            onAddProduct={
              caseHasAddons
                ? () => {
                    const maxTeeth = Object.keys(state.maxillaryRetentionTypes).map(Number);
                    const mandTeeth = Object.keys(state.mandibularRetentionTypes || {}).map(Number);
                    if (maxTeeth.length > 0) {
                      state.handleOpenAddOnsModal(
                        "maxillary",
                        `prep_${Math.min(...maxTeeth)}`,
                        Math.min(...maxTeeth)
                      );
                    } else if (maxillaryHasRemovables && state.maxillaryTeeth.length > 0) {
                      state.handleOpenAddOnsModal(
                        "maxillary",
                        `prep_${state.maxillaryTeeth[0]}`,
                        state.maxillaryTeeth[0]
                      );
                    } else if (mandTeeth.length > 0) {
                      state.handleOpenAddOnsModal(
                        "mandibular",
                        `prep_${Math.min(...mandTeeth)}`,
                        Math.min(...mandTeeth)
                      );
                    } else if (mandibularHasRemovables && state.mandibularTeeth.length > 0) {
                      state.handleOpenAddOnsModal(
                        "mandibular",
                        `prep_${state.mandibularTeeth[0]}`,
                        state.mandibularTeeth[0]
                      );
                    } else {
                      state.handleOpenAddOnsModal("maxillary", "prep_0");
                    }
                  }
                : undefined
            }
            onRush={rushCasesEnabled === false ? undefined : () => {
              const maxSlot = rushArchSlots.find((s) => s.arch === "maxillary");
              const mandSlot = rushArchSlots.find((s) => s.arch === "mandibular");
              if (maxSlot) {
                state.handleOpenRushModal(
                  "maxillary",
                  maxSlot.rushKey,
                  maxSlot.rushKey,
                  mandSlot?.rushKey ?? ""
                );
              } else if (mandSlot) {
                state.handleOpenRushModal(
                  "mandibular",
                  mandSlot.rushKey,
                  "",
                  mandSlot.rushKey
                );
              } else {
                state.setShowRushModal(true);
              }
            }}
            onAttach={() => state.setShowAttachModal(true)}
          />
        </div>
      )}
      <CaseSummaryNotes
        right1Brand={state.right1Brand}
        right1Platform={state.right1Platform}
        right2Brand={state.right2Brand}
        right2Platform={state.right2Platform}
        maxillaryRetentionTypes={state.maxillaryRetentionTypes}
        mandibularRetentionTypes={state.mandibularRetentionTypes}
        maxillaryTeeth={state.maxillaryTeeth}
        mandibularTeeth={state.mandibularTeeth}
        maxillaryToothExtractionMap={state.maxillaryToothExtractionMap}
        mandibularToothExtractionMap={state.mandibularToothExtractionMap}
        getToothProduct={state.getToothProduct}
        getFieldValue={state.getFieldValue}
        getSelectedShade={state.getSelectedShade}
        selectedStages={state.selectedStages}
        getImpressionDisplayText={state.getImpressionDisplayText}
        right1Inclusion={state.right1Inclusion}
        right2Inclusion={state.right2Inclusion}
        addedProducts={state.addedProducts}
        getToothProductCard={state.getToothProductCard}
        fieldValues={state.fieldValues}
        toothProducts={state.toothProducts}
        toothProductCardMap={state.toothProductCardMap}
        selectedShades={state.selectedShades}
        selectedImpressions={state.selectedImpressions}
        maxillaryImplantDetailByTooth={maxillaryImplantDetailByTooth}
        mandibularImplantDetailByTooth={mandibularImplantDetailByTooth}
        onNotesChange={onCaseSummaryNotesChange}
      />
    </div>
  );
}
