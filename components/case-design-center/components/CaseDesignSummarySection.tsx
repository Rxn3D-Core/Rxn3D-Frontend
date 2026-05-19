"use client";

import { CenterActionIcons } from "./CenterActionIcons";
import { CaseSummaryNotes } from "./CaseSummaryNotes";
import { shouldShowCaseSummaryNotes } from "../utils/caseSummaryVisibility";
import { useCaseDesignState } from "../hooks/useCaseDesignState";

type CaseDesignState = ReturnType<typeof useCaseDesignState>;

interface CaseDesignSummarySectionProps {
  state: CaseDesignState;
  caseSubmitted?: boolean;
  rushCasesEnabled?: boolean;
  allProductsComplete: boolean;
  maxillaryHasRemovables: boolean;
  mandibularHasRemovables: boolean;
}

export function CaseDesignSummarySection({
  state,
  caseSubmitted,
  rushCasesEnabled,
  allProductsComplete,
  maxillaryHasRemovables,
  mandibularHasRemovables,
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
            onEdit={() => {}}
            onAddProduct={() => {
              const maxTeeth = Object.keys(state.maxillaryRetentionTypes).map(Number);
              const mandTeeth = Object.keys(state.mandibularRetentionTypes || {}).map(Number);
              if (maxTeeth.length > 0) {
                state.handleOpenAddOnsModal("maxillary", `prep_${Math.min(...maxTeeth)}`, Math.min(...maxTeeth));
              } else if (maxillaryHasRemovables && state.maxillaryTeeth.length > 0) {
                state.handleOpenAddOnsModal("maxillary", `prep_${state.maxillaryTeeth[0]}`, state.maxillaryTeeth[0]);
              } else if (mandTeeth.length > 0) {
                state.handleOpenAddOnsModal("mandibular", `prep_${Math.min(...mandTeeth)}`, Math.min(...mandTeeth));
              } else if (mandibularHasRemovables && state.mandibularTeeth.length > 0) {
                state.handleOpenAddOnsModal("mandibular", `prep_${state.mandibularTeeth[0]}`, state.mandibularTeeth[0]);
              } else {
                state.handleOpenAddOnsModal("maxillary", "prep_0");
              }
            }}
            onRush={rushCasesEnabled === false ? undefined : () => {
              const maxTeeth = Object.keys(state.maxillaryRetentionTypes).map(Number);
              const mandTeeth = Object.keys(state.mandibularRetentionTypes || {}).map(Number);
              const maxPid = maxTeeth.length > 0
                ? `prep_${Math.min(...maxTeeth)}`
                : (maxillaryHasRemovables && state.maxillaryTeeth.length > 0)
                  ? `prep_${state.maxillaryTeeth[0]}`
                  : "";
              const mandPid = mandTeeth.length > 0
                ? `prep_${Math.min(...mandTeeth)}`
                : (mandibularHasRemovables && state.mandibularTeeth.length > 0)
                  ? `prep_${state.mandibularTeeth[0]}`
                  : "";
              if (maxPid) {
                state.handleOpenRushModal("maxillary", maxPid, maxPid, mandPid);
              } else if (mandPid) {
                state.handleOpenRushModal("mandibular", mandPid, maxPid, mandPid);
              } else {
                state.setShowRushModal(true);
              }
            }}
            onAttach={() => state.setShowAttachModal(true)}
            onPhoto={() => state.setShowAttachModal(true)}
            onStlFile={() => state.setShowAttachModal(true)}
            hasPhotos={state.attachedPhotoCount > 0}
            hasStlFiles={state.attachedStlCount > 0}
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
      />
    </div>
  );
}
