"use client";

import { useEffect } from "react";
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

  // True when any arch has a Removables/Removables Restoration product
  const isRemovablesCategory = (arch: "maxillary" | "mandibular") =>
    (props.addedProducts ?? []).some((ap) => {
      if (ap.arch !== arch) return false;
      const name = (ap.product?.subcategory?.category?.name || ap.product?.category_name || "").toLowerCase();
      return name === "removables" || name === "removables restoration" || name === "removable restoration" || name === "orthodontics";
    });

  // Show panels/accordion as soon as a removables product exists (no teeth required)
  // Include both addedProducts and the initial active product (card 0)
  const maxillaryHasRemovables = isRemovablesCategory("maxillary") || state.activeProductIsRemovablesMaxillary;
  const mandibularHasRemovables = isRemovablesCategory("mandibular") || state.activeProductIsRemovablesMandibular;

  const maxillaryHasRemovablesTeeth =
    maxillaryHasRemovables && state.maxillaryTeeth.length > 0;

  const mandibularHasRemovablesTeeth =
    mandibularHasRemovables && state.mandibularTeeth.length > 0;

  // True only when at least one tooth exists AND every tooth has impression complete
  const hasAnyTooth =
    Object.keys(state.maxillaryRetentionTypes).length > 0 ||
    Object.keys(state.mandibularRetentionTypes || {}).length > 0 ||
    maxillaryHasRemovablesTeeth ||
    mandibularHasRemovablesTeeth;

  // Check removable teeth impression completion.
  // For Removables, fields (grade, stage, shade, impression) are stored under the representative
  // tooth (first tooth per product card), NOT every individual tooth. So we check completion
  // per product card rather than per tooth.
  const MAXILLARY_ALL = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
  const MANDIBULAR_ALL = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32];

  const getRemovablesRepTeeth = (arch: "maxillary" | "mandibular") => {
    const allTeeth = arch === "maxillary" ? MAXILLARY_ALL : MANDIBULAR_ALL;
    const cardToRepTooth = new Map<number, number>();
    for (const tn of allTeeth) {
      if (!state.getToothProduct(arch, tn)) continue;
      const card = state.getToothProductCard(arch, tn);
      if (card != null && !cardToRepTooth.has(card)) {
        cardToRepTooth.set(card, tn);
      }
    }
    return [...cardToRepTooth.values()];
  };

  const maxillaryRemovablesRepTeeth = maxillaryHasRemovablesTeeth ? getRemovablesRepTeeth("maxillary") : [];
  const mandibularRemovablesRepTeeth = mandibularHasRemovablesTeeth ? getRemovablesRepTeeth("mandibular") : [];

  const allMaxillaryRemovablesComplete =
    !maxillaryHasRemovablesTeeth ||
    maxillaryRemovablesRepTeeth.every((tn) => state.isFieldCompleted("maxillary", tn, "impression"));

  const allMandibularRemovablesComplete =
    !mandibularHasRemovablesTeeth ||
    mandibularRemovablesRepTeeth.every((tn) => state.isFieldCompleted("mandibular", tn, "impression"));

  // For Fixed Restoration, impression is stored under the first tooth of the product group.
  // This helper resolves the effective tooth number to check for impression completion.
  const getImpressionOwnerTooth = (arch: "maxillary" | "mandibular", toothNum: number): number => {
    const product = state.getToothProduct(arch, toothNum);
    const isFixed = product?.subcategory?.category?.name === "Fixed Restoration";
    if (!isFixed) return toothNum;
    const allTeeth = arch === "maxillary"
      ? Object.keys(state.maxillaryRetentionTypes).map(Number)
      : Object.keys(state.mandibularRetentionTypes || {}).map(Number);
    const productKey = product?.id ?? toothNum;
    const groupTeeth = allTeeth.filter(
      (t) => (state.getToothProduct(arch, t)?.id ?? t) === productKey
    );
    return groupTeeth.length > 0 ? Math.min(...groupTeeth) : toothNum;
  };

  const allTeethImpressionComplete =
    hasAnyTooth &&
    Object.keys(state.maxillaryRetentionTypes).every((toothNum) => {
      const n = getImpressionOwnerTooth("maxillary", Number(toothNum));
      return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
    }) &&
    Object.keys(state.mandibularRetentionTypes || {}).every((toothNum) => {
      const n = getImpressionOwnerTooth("mandibular", Number(toothNum));
      return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
    }) &&
    allMaxillaryRemovablesComplete &&
    allMandibularRemovablesComplete;

  // True if ANY tooth has a retention type but hasn't completed impression yet
  const hasIncompleteAccordion =
    Object.keys(state.maxillaryRetentionTypes).some((toothNum) => {
      const n = getImpressionOwnerTooth("maxillary", Number(toothNum));
      return !IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
    }) ||
    Object.keys(state.mandibularRetentionTypes || {}).some((toothNum) => {
      const n = getImpressionOwnerTooth("mandibular", Number(toothNum));
      return !IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
    }) ||
    (maxillaryHasRemovablesTeeth && !allMaxillaryRemovablesComplete) ||
    (mandibularHasRemovablesTeeth && !allMandibularRemovablesComplete);

  // Compute a human-readable label for the first incomplete required field across all teeth.
  // For Fixed Restoration, shades are stored per product group (under fixed_${firstToothNumber}), not per tooth — validate once per group.
  const incompleteFieldLabel = (() => {
    const allArchTeeth: Array<{ arch: "maxillary" | "mandibular"; toothNum: number }> = [
      ...Object.keys(state.maxillaryRetentionTypes).map((t) => ({ arch: "maxillary" as const, toothNum: Number(t) })),
      ...Object.keys(state.mandibularRetentionTypes || {}).map((t) => ({ arch: "mandibular" as const, toothNum: Number(t) })),
    ];
    // Group teeth by arch and product so we check shade once per group (using first tooth in group)
    const processedGroups = new Set<string>();
    for (const { arch, toothNum } of allArchTeeth) {
      const product = state.getToothProduct(arch, toothNum);
      const isFixedRestoration = product?.subcategory?.category?.name === "Fixed Restoration";
      const productKey = product?.id ?? toothNum;
      const groupKey = `${arch}_${productKey}`;

      if (isFixedRestoration && !processedGroups.has(groupKey)) {
        processedGroups.add(groupKey);
        // Find all teeth in this arch with the same product; shade is stored under fixed_${firstTooth}
        const teethInGroup = allArchTeeth.filter(
          (t) => t.arch === arch && (state.getToothProduct(t.arch, t.toothNum)?.id ?? t.toothNum) === productKey
        ).map((t) => t.toothNum);
        const firstToothInGroup = Math.min(...teethInGroup);
        const shadeProductId = `fixed_${firstToothInGroup}`;
        if (!state.getSelectedShade(shadeProductId, arch, "stump_shade")) return "Stump Shade";
        if (!state.getSelectedShade(shadeProductId, arch, "tooth_shade")) return "Tooth Shade";
      }

      const impressionOwner = getImpressionOwnerTooth(arch, toothNum);
      const hasImpression = IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted(arch, impressionOwner, step));
      if (!hasImpression) return "Impression";
    }
    return null;
  })();

  // True when any maxillary tooth has an incomplete required field (shade or impression).
  // For Fixed Restoration, shades are per product group (fixed_${firstToothInGroup}).
  const maxillaryIncomplete = (() => {
    const maxillaryTeeth = Object.keys(state.maxillaryRetentionTypes).map(Number);
    const processedShadeGroups = new Set<string>();
    for (const n of maxillaryTeeth) {
      const product = state.getToothProduct("maxillary", n);
      if (product?.subcategory?.category?.name === "Fixed Restoration") {
        const productKey = String(product?.id ?? n);
        const firstToothInGroup = Math.min(
          ...maxillaryTeeth.filter(
            (t) => String(state.getToothProduct("maxillary", t)?.id ?? t) === productKey
          )
        );
        if (!processedShadeGroups.has(productKey)) {
          processedShadeGroups.add(productKey);
          const shadeId = `fixed_${firstToothInGroup}`;
          if (!state.getSelectedShade(shadeId, "maxillary", "stump_shade")) return true;
          if (!state.getSelectedShade(shadeId, "maxillary", "tooth_shade")) return true;
        }
      }
      const impressionOwner = getImpressionOwnerTooth("maxillary", n);
      if (!IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", impressionOwner, step))) return true;
    }
    return false;
  })();

  const hasMaxillaryProducts =
    Object.keys(state.maxillaryRetentionTypes).length > 0 || maxillaryHasRemovablesTeeth;

  const hasMandibularProducts =
    Object.keys(state.mandibularRetentionTypes || {}).length > 0 || mandibularHasRemovablesTeeth;

  // True when the arch has products AND all of them have completed their accordion fields.
  // The "+ Add Product" button only shows after the first product accordion is fully complete.
  const allMaxillaryAccordionsComplete =
    hasMaxillaryProducts &&
    Object.keys(state.maxillaryRetentionTypes).every((toothNum) => {
      const n = getImpressionOwnerTooth("maxillary", Number(toothNum));
      return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
    }) &&
    allMaxillaryRemovablesComplete;

  const allMandibularAccordionsComplete =
    hasMandibularProducts &&
    Object.keys(state.mandibularRetentionTypes || {}).every((toothNum) => {
      const n = getImpressionOwnerTooth("mandibular", Number(toothNum));
      return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
    }) &&
    allMandibularRemovablesComplete;

  // Notify parent whenever readiness changes
  useEffect(() => {
    props.onReadinessChange?.(allTeethImpressionComplete);
  }, [allTeethImpressionComplete]);

  useEffect(() => {
    props.onIncompleteFieldChange?.(incompleteFieldLabel);
  }, [incompleteFieldLabel]);

  return (
    <div className="px-2 md:px-4 py-2">
      {/* Title row - Back to Products | MAXILLARY | CASE DESIGN CENTER | MANDIBULAR */}
      <div className="relative flex items-center mb-1 md:mb-2 px-4 sm:px-16 md:px-32 lg:px-64">
        {props.onBackToProducts && !props.caseSubmitted && (
          <button
            onClick={!hasIncompleteAccordion ? props.onBackToProducts : undefined}
            title={hasIncompleteAccordion ? "Complete all required fields before going back" : undefined}
            className={`absolute left-3 text-sm font-semibold ${hasIncompleteAccordion ? "text-[#b4b0b0] cursor-not-allowed" : "text-[#1162A8] hover:underline cursor-pointer"}`}
          >
            ← Back to Products
          </button>
        )}
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="text-[16px] sm:text-xl text-[#1d1d1b] tracking-wide">MAXILLARY</span>
          {!props.caseSubmitted && allMaxillaryAccordionsComplete && (
            <button
              onClick={() => state.onAddProduct?.("maxillary")}
              className="flex items-center gap-1 shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-xs font-semibold px-2 py-0.5 rounded-md bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer"
            >
              + Add Product
            </button>
          )}
        </div>
        <h2 className="flex-1 text-center text-xl font-bold text-[#1d1d1b] tracking-wide">
          CASE DESIGN CENTER
        </h2>
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="text-[16px] sm:text-xl text-[#1d1d1b] tracking-wide">MANDIBULAR</span>
          {!props.caseSubmitted && allMandibularAccordionsComplete && (
            <button
              onClick={() => state.onAddProduct?.("mandibular")}
              className="flex items-center gap-1 shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-xs font-semibold px-2 py-0.5 rounded-md bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer"
            >
              + Add Product
            </button>
          )}
        </div>
      </div>

        {/* Main two-panel layout - responsive */}
        <div className="relative">
        <div className="flex flex-col lg:flex-row lg:gap-0 gap-4">
          {/* LEFT PANEL - MAXILLARY */}
          <MaxillaryPanel
            showMaxillary={state.showMaxillary}
            setShowMaxillary={state.setShowMaxillary}
            showDetails={maxillaryHasImpression || mandibularHasImpression || maxillaryHasRemovables || mandibularHasRemovables}
          caseSubmitted={props.caseSubmitted}
          // Tooth selection
          maxillaryTeeth={state.maxillaryTeeth}
          handleMaxillaryToothClick={state.handleMaxillaryToothClick}
          maxillaryRetentionTypes={state.maxillaryRetentionTypes}
          retentionPopoverState={state.retentionPopoverState}
          setRetentionPopoverState={state.setRetentionPopoverState}
          activeProductIsRemovables={state.activeProductIsRemovablesMaxillary}
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
          // Active product card tracking
          activeProductCardId={state.activeProductCardId}
          setActiveProductCardId={state.setActiveProductCardId}
          getToothProductCard={state.getToothProductCard}
          // Tooth field progress (Prep/Pontic step-by-step)
          isFieldVisible={state.isFieldVisible}
          isFieldCompleted={state.isFieldCompleted}
          completeFieldStep={state.completeFieldStep}
          storeFieldValue={state.storeFieldValue}
          uncompleteFieldStep={state.uncompleteFieldStep}
          getFieldValue={state.getFieldValue}
          clearToothProgress={state.clearToothProgress}
          setToothProduct={state.setToothProduct}
          getToothProduct={state.getToothProduct}
          isProductLoading={state.isProductLoading}
          fetchAndAssignProduct={state.fetchAndAssignProduct}
          maxillaryToothExtractionMap={state.maxillaryToothExtractionMap}
          maxillaryClaspTeeth={state.maxillaryClaspTeeth}
          handleToothExtractionToggle={state.handleToothExtractionToggle}
          selectAllMaxillaryTeeth={state.selectAllMaxillaryTeeth}
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
          showDetails={maxillaryHasImpression || mandibularHasImpression || maxillaryHasRemovables || mandibularHasRemovables}
          caseSubmitted={props.caseSubmitted}
          disabled={maxillaryIncomplete}
          // Tooth selection
          mandibularTeeth={state.mandibularTeeth}
          handleMandibularToothClick={state.handleMandibularToothClick}
          mandibularRetentionTypes={state.mandibularRetentionTypes}
          retentionPopoverState={state.retentionPopoverState}
          setRetentionPopoverState={state.setRetentionPopoverState}
          activeProductIsRemovables={state.activeProductIsRemovablesMandibular}
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
          // Active product card tracking
          activeProductCardId={state.activeProductCardId}
          setActiveProductCardId={state.setActiveProductCardId}
          getToothProductCard={state.getToothProductCard}
          // Tooth field progress (Prep/Pontic step-by-step)
          isFieldVisible={state.isFieldVisible}
          isFieldCompleted={state.isFieldCompleted}
          completeFieldStep={state.completeFieldStep}
          storeFieldValue={state.storeFieldValue}
          uncompleteFieldStep={state.uncompleteFieldStep}
          getFieldValue={state.getFieldValue}
          clearToothProgress={state.clearToothProgress}
          setToothProduct={state.setToothProduct}
          getToothProduct={state.getToothProduct}
          isProductLoading={state.isProductLoading}
          fetchAndAssignProduct={state.fetchAndAssignProduct}
          mandibularToothExtractionMap={state.mandibularToothExtractionMap}
          mandibularClaspTeeth={state.mandibularClaspTeeth}
          handleToothExtractionToggle={state.handleToothExtractionToggle}
          selectAllMandibularTeeth={state.selectAllMandibularTeeth}
        />
      </div>

      </div>

      {/* Case Summary Notes - below product accordion */}
      {(() => {
        const hasImpressionCompleted =
          Object.entries(state.maxillaryRetentionTypes).some(([toothNum]) => {
            const n = Number(toothNum);
            return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("maxillary", n, step));
          }) ||
          Object.entries(state.mandibularRetentionTypes || {}).some(([toothNum]) => {
            const n = Number(toothNum);
            return IMPRESSION_STEP_NAMES.some((step) => state.isFieldCompleted("mandibular", n, step));
          }) ||
          (maxillaryHasRemovables && state.maxillaryTeeth.some((tn) =>
            state.isFieldCompleted("maxillary", tn, "impression")
          )) ||
          (mandibularHasRemovables && state.mandibularTeeth.some((tn) =>
            state.isFieldCompleted("mandibular", tn, "impression")
          ));
        if (!hasImpressionCompleted) return null;
        return (
          <CaseSummaryNotes
            right1Brand={state.right1Brand}
            right1Platform={state.right1Platform}
            right2Brand={state.right2Brand}
            right2Platform={state.right2Platform}
            maxillaryRetentionTypes={state.maxillaryRetentionTypes}
            mandibularRetentionTypes={state.mandibularRetentionTypes}
            maxillaryTeeth={state.maxillaryTeeth}
            mandibularTeeth={state.mandibularTeeth}
            getToothProduct={state.getToothProduct}
            getFieldValue={state.getFieldValue}
            getSelectedShade={state.getSelectedShade}
            selectedStages={state.selectedStages}
            getImpressionDisplayText={state.getImpressionDisplayText}
            right1Inclusion={state.right1Inclusion}
            right2Inclusion={state.right2Inclusion}
            addedProducts={state.addedProducts}
            getToothProductCard={state.getToothProductCard}
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
            // Show qty in front of each name: "1x Name, 2x Other"
            const addonLabels = addOns.map((a) => `${a.qty}x ${a.name}`);
            const maxShow = 2;
            let value: string;
            if (addonLabels.length === 0) {
              value = "0 selected";
            } else if (addonLabels.length <= maxShow) {
              value = addonLabels.join(", ");
            } else {
              value = addonLabels.slice(0, maxShow).join(", ") + ` +${addonLabels.length - maxShow} more`;
            }
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
