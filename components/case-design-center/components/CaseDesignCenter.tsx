"use client";

import type { CaseDesignProps } from "../types";
import { productImpressionsToModalOptions } from "../types";
import { useCaseDesignState } from "../hooks/useCaseDesignState";
import { IMPRESSION_STEP_NAMES } from "../hooks/useToothFieldProgress";
import { MaxillaryPanel } from "./MaxillaryPanel";
import { MandibularPanel } from "./MandibularPanel";
import { CenterNavigation } from "./CenterNavigation";
import { ModalOrchestrator } from "./ModalOrchestrator";
import { CaseSummaryNotes } from "./CaseSummaryNotes";
import { mockImpressions } from "../constants";

export function CaseDesignCenter(props: CaseDesignProps) {
  const state = useCaseDesignState(props);

  const maxillaryHasImpression = Object.keys(state.maxillaryRetentionTypes).some((toothNum) => {
    const n = Number(toothNum);
    return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
  });

  const mandibularHasImpression = Object.keys(state.mandibularRetentionTypes || {}).some((toothNum) => {
    const n = Number(toothNum);
    return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
  });

  return (
    <div className="px-2 md:px-4 py-4 pb-20">
      {props.onBackToProducts && !props.caseSubmitted && (
        <button
          onClick={props.onBackToProducts}
          className="text-[14px] font-semibold text-[#1162A8] hover:underline mb-2"
        >
          ← Back to Products
        </button>
      )}

      {/* Title */}
      <h2 className="text-center text-[14px] md:text-[16px] font-bold text-[#1d1d1b] tracking-wide mb-3 md:mb-4">
        CASE DESIGN CENTER
      </h2>

      {/* Main two-panel layout - responsive */}
      <div className="flex flex-col lg:flex-row lg:gap-0 gap-4">
        {/* LEFT PANEL - MAXILLARY */}
        <MaxillaryPanel
          showMaxillary={state.showMaxillary}
          setShowMaxillary={state.setShowMaxillary}
          showDetails={maxillaryHasImpression}
          caseSubmitted={props.caseSubmitted}
          onAddProduct={state.onAddProduct}
          // Tooth selection
          maxillaryTeeth={state.maxillaryTeeth}
          handleMaxillaryToothClick={state.handleMaxillaryToothClick}
          maxillaryRetentionTypes={state.maxillaryRetentionTypes}
          retentionPopoverState={state.retentionPopoverState}
          setRetentionPopoverState={state.setRetentionPopoverState}
          handleSelectRetentionType={state.handleSelectRetentionType}
          handleMaxillaryToothDeselect={state.handleMaxillaryToothDeselect}
          // Shade
          shadeSelectionState={state.shadeSelectionState}
          setShadeSelectionState={state.setShadeSelectionState}
          selectedShadeGuide={state.selectedShadeGuide}
          setSelectedShadeGuide={state.setSelectedShadeGuide}
          showShadeGuideDropdown={state.showShadeGuideDropdown}
          setShowShadeGuideDropdown={state.setShowShadeGuideDropdown}
          shadeGuideOptions={state.shadeGuideOptions}
          getSelectedShade={state.getSelectedShade}
          handleShadeSelect={state.handleShadeSelect}
          handleShadeFieldClick={state.handleShadeFieldClick}
          // Expansion
          expandedLeft={state.expandedLeft}
          setExpandedLeft={state.setExpandedLeft}
          isPrepPonticExpanded={state.isPrepPonticExpanded}
          togglePrepPonticExpanded={state.togglePrepPonticExpanded}
          // Rush
          rushedProducts={state.rushedProducts}
          // Modals
          handleOpenImpressionModal={state.handleOpenImpressionModal}
          handleOpenAddOnsModal={state.handleOpenAddOnsModal}
          handleOpenRushModal={state.handleOpenRushModal}
          handleOpenStageModal={state.handleOpenStageModal}
          setShowAttachModal={state.setShowAttachModal}
          getImpressionDisplayText={state.getImpressionDisplayText}
          selectedStages={state.selectedStages}
          // Added products
          addedProducts={state.addedProducts}
          toggleAddedProductExpanded={state.toggleAddedProductExpanded}
          handleRemoveAddedProduct={state.handleRemoveAddedProduct}
          // Tooth field progress (Prep/Pontic step-by-step)
          isFieldVisible={state.isFieldVisible}
          isFieldCompleted={state.isFieldCompleted}
          completeFieldStep={state.completeFieldStep}
          getFieldValue={state.getFieldValue}
          clearToothProgress={state.clearToothProgress}
          setToothProduct={state.setToothProduct}
          getToothProduct={state.getToothProduct}
          isProductLoading={state.isProductLoading}
          fetchAndAssignProduct={state.fetchAndAssignProduct}
          maxillaryToothExtractionMap={state.maxillaryToothExtractionMap}
          handleToothExtractionToggle={state.handleToothExtractionToggle}
          selectAllMaxillaryTeeth={state.selectAllMaxillaryTeeth}
          clearAllMaxillaryTeeth={state.clearAllMaxillaryTeeth}
        />

        {/* CENTER NAVIGATION */}
        <CenterNavigation
          showMaxillary={state.showMaxillary}
          setShowMaxillary={state.setShowMaxillary}
          showMandibular={state.showMandibular}
          setShowMandibular={state.setShowMandibular}
        />

        {/* RIGHT PANEL - MANDIBULAR */}
        <MandibularPanel
          showMandibular={state.showMandibular}
          setShowMandibular={state.setShowMandibular}
          showDetails={mandibularHasImpression}
          caseSubmitted={props.caseSubmitted}
          onAddProduct={state.onAddProduct}
          // Tooth selection
          mandibularTeeth={state.mandibularTeeth}
          handleMandibularToothClick={state.handleMandibularToothClick}
          mandibularRetentionTypes={state.mandibularRetentionTypes}
          retentionPopoverState={state.retentionPopoverState}
          setRetentionPopoverState={state.setRetentionPopoverState}
          handleSelectRetentionType={state.handleSelectRetentionType}
          handleMandibularToothDeselect={state.handleMandibularToothDeselect}
          // Shade
          shadeSelectionState={state.shadeSelectionState}
          setShadeSelectionState={state.setShadeSelectionState}
          selectedShadeGuide={state.selectedShadeGuide}
          setSelectedShadeGuide={state.setSelectedShadeGuide}
          showShadeGuideDropdown={state.showShadeGuideDropdown}
          setShowShadeGuideDropdown={state.setShowShadeGuideDropdown}
          shadeGuideOptions={state.shadeGuideOptions}
          getSelectedShade={state.getSelectedShade}
          handleShadeSelect={state.handleShadeSelect}
          handleShadeFieldClick={state.handleShadeFieldClick}
          // Expansion
          isPrepPonticExpanded={state.isPrepPonticExpanded}
          togglePrepPonticExpanded={state.togglePrepPonticExpanded}
          // Rush
          rushedProducts={state.rushedProducts}
          // Modals
          handleOpenImpressionModal={state.handleOpenImpressionModal}
          getImpressionDisplayText={state.getImpressionDisplayText}
          handleOpenAddOnsModal={state.handleOpenAddOnsModal}
          selectedStages={state.selectedStages}
          handleOpenRushModal={state.handleOpenRushModal}
          handleOpenStageModal={state.handleOpenStageModal}
          setShowAttachModal={state.setShowAttachModal}
          // Added products
          addedProducts={state.addedProducts}
          toggleAddedProductExpanded={state.toggleAddedProductExpanded}
          handleRemoveAddedProduct={state.handleRemoveAddedProduct}
          // Tooth field progress (Prep/Pontic step-by-step)
          isFieldVisible={state.isFieldVisible}
          isFieldCompleted={state.isFieldCompleted}
          completeFieldStep={state.completeFieldStep}
          getFieldValue={state.getFieldValue}
          clearToothProgress={state.clearToothProgress}
          setToothProduct={state.setToothProduct}
          getToothProduct={state.getToothProduct}
          isProductLoading={state.isProductLoading}
          fetchAndAssignProduct={state.fetchAndAssignProduct}
          mandibularToothExtractionMap={state.mandibularToothExtractionMap}
          handleToothExtractionToggle={state.handleToothExtractionToggle}
          selectAllMandibularTeeth={state.selectAllMandibularTeeth}
          clearAllMandibularTeeth={state.clearAllMandibularTeeth}
        />
      </div>

      {/* Case Summary Notes - shown when any tooth has any impression-type advance field completed (dynamic list) */}
      {(() => {
        const hasImpressionCompleted =
          Object.entries(state.maxillaryRetentionTypes).some(([toothNum]) => {
            const n = Number(toothNum);
            return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
          }) ||
          Object.entries(state.mandibularRetentionTypes || {}).some(([toothNum]) => {
            const n = Number(toothNum);
            return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
          });
        if (!hasImpressionCompleted) return null;
        return (
          <CaseSummaryNotes
            right1Brand={state.right1Brand}
            right1Platform={state.right1Platform}
            right2Brand={state.right2Brand}
            right2Platform={state.right2Platform}
          />
        );
      })()}

      {/* All Modals */}
      <ModalOrchestrator
        showImpressionModal={state.showImpressionModal}
        setShowImpressionModal={state.setShowImpressionModal}
        currentImpressionArch={state.currentImpressionArch}
        currentImpressionProductId={state.currentImpressionProductId}
        currentImpressionToothNumber={state.currentImpressionToothNumber}
        impressionOptions={
          (() => {
            const toothNum = state.currentImpressionToothNumber;
            const arch = state.currentImpressionArch;
            if (toothNum === null) return mockImpressions;
            const product = state.getToothProduct(arch, toothNum);
            const options = productImpressionsToModalOptions(product?.impressions);
            return options.length > 0 ? options : mockImpressions;
          })()
        }
        selectedImpressions={state.selectedImpressions}
        setSelectedImpressions={state.setSelectedImpressions}
        onImpressionConfirm={(displayText) => {
          const toothNum = state.currentImpressionToothNumber;
          const arch = state.currentImpressionArch;
          if (toothNum !== null) {
            const product = state.getToothProduct(arch, toothNum);
            const isFixed = product?.subcategory?.category?.name === "Fixed Restoration";
            if (isFixed) {
              state.completeFieldStep(arch, toothNum, "fixed_impression", displayText);
            } else {
              state.completeFieldStep(arch, toothNum, "impression", displayText);
            }
          }
        }}
        showAddOnsModal={state.showAddOnsModal}
        setShowAddOnsModal={state.setShowAddOnsModal}
        currentAddOnsArch={state.currentAddOnsArch}
        currentAddOnsProductId={state.currentAddOnsProductId}
        currentAddOnsToothNumber={state.currentAddOnsToothNumber}
        onAddOnsConfirm={(addOns) => {
          const toothNum = state.currentAddOnsToothNumber;
          const arch = state.currentAddOnsArch;
          if (toothNum !== null) {
            const totalCount = addOns.reduce((sum, a) => sum + a.qty, 0);
            const names = addOns.map((a) => `${a.qty}x ${a.name}`).join(", ");
            const value = names || `${totalCount} selected`;
            const product = state.getToothProduct(arch, toothNum);
            const isFixed = product?.subcategory?.category?.name === "Fixed Restoration";
            if (isFixed) {
              state.completeFieldStep(arch, toothNum, "fixed_addons", value);
            } else {
              state.completeFieldStep(arch, toothNum, "addons", value);
            }
          }
        }}
        showAttachModal={state.showAttachModal}
        setShowAttachModal={state.setShowAttachModal}
        showRushModal={state.showRushModal}
        setShowRushModal={state.setShowRushModal}
        currentRushArch={state.currentRushArch}
        currentRushProductId={state.currentRushProductId}
        handleRushConfirm={state.handleRushConfirm}
        isStageModalOpen={state.isStageModalOpen}
        setIsStageModalOpen={state.setIsStageModalOpen}
        selectedStages={state.selectedStages}
        currentStageProductId={state.currentStageProductId}
        currentStageArch={state.currentStageArch}
        currentStageToothNumber={state.currentStageToothNumber}
        currentStageOptions={(() => {
          const toothNum = state.currentStageToothNumber;
          const arch = state.currentStageArch;
          if (toothNum === null) return null;
          const product = state.getToothProduct(arch, toothNum);
          if (!product?.stages?.length) return null;
          return product.stages.map((s) => ({
            name: s.name,
            letter: s.code?.charAt(0)?.toUpperCase() || s.name.charAt(0).toUpperCase(),
          }));
        })()}
        handleStageSelect={state.handleStageSelect}
        onStageConfirm={(stageName) => {
          const toothNum = state.currentStageToothNumber;
          const arch = state.currentStageArch;
          if (toothNum !== null) {
            const product = state.getToothProduct(arch, toothNum);
            const isFixed = product?.subcategory?.category?.name === "Fixed Restoration";
            if (isFixed) {
              state.completeFieldStep(arch, toothNum, "fixed_stage", stageName);
            } else {
              state.completeFieldStep(arch, toothNum, "stage", stageName);
            }
          }
        }}
      />
    </div>
  );
}
