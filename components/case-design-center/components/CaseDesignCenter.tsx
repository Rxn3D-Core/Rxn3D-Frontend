"use client";

import type { CaseDesignProps } from "../types";
import { useCaseDesignState } from "../hooks/useCaseDesignState";
import { MaxillaryPanel } from "./MaxillaryPanel";
import { MandibularPanel } from "./MandibularPanel";
import { CenterNavigation } from "./CenterNavigation";
import { ModalOrchestrator } from "./ModalOrchestrator";

export function CaseDesignCenter(props: CaseDesignProps) {
  const state = useCaseDesignState(props);

  return (
    <div className="px-2 md:px-4 py-4">
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
          expandedCard={state.expandedCard}
          setExpandedCard={state.setExpandedCard}
          expandedRight2={state.expandedRight2}
          setExpandedRight2={state.setExpandedRight2}
          // Implant
          right1Brand={state.right1Brand}
          setRight1Brand={state.setRight1Brand}
          right1Platform={state.right1Platform}
          setRight1Platform={state.setRight1Platform}
          right2Brand={state.right2Brand}
          setRight2Brand={state.setRight2Brand}
          right2Platform={state.right2Platform}
          setRight2Platform={state.setRight2Platform}
          activeCardType={state.activeCardType}
          setActiveCardType={state.setActiveCardType}
          right1Inclusion={state.right1Inclusion}
          setRight1Inclusion={state.setRight1Inclusion}
          right1InclusionQty={state.right1InclusionQty}
          setRight1InclusionQty={state.setRight1InclusionQty}
          right2Inclusion={state.right2Inclusion}
          setRight2Inclusion={state.setRight2Inclusion}
          right2InclusionQty={state.right2InclusionQty}
          setRight2InclusionQty={state.setRight2InclusionQty}
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
        />
      </div>

      {/* All Modals */}
      <ModalOrchestrator
        showImpressionModal={state.showImpressionModal}
        setShowImpressionModal={state.setShowImpressionModal}
        currentImpressionArch={state.currentImpressionArch}
        currentImpressionProductId={state.currentImpressionProductId}
        selectedImpressions={state.selectedImpressions}
        setSelectedImpressions={state.setSelectedImpressions}
        showAddOnsModal={state.showAddOnsModal}
        setShowAddOnsModal={state.setShowAddOnsModal}
        currentAddOnsArch={state.currentAddOnsArch}
        currentAddOnsProductId={state.currentAddOnsProductId}
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
        handleStageSelect={state.handleStageSelect}
      />
    </div>
  );
}
