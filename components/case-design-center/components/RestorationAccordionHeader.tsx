"use client";

import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { DeleteProductConfirmModal } from "./DeleteProductConfirmModal";
import {
  caseDesignInter,
  removableHeaderTitleClass,
  removableHeaderToothClass,
} from "../case-design-inter-font";
import {
  AccordionBadge,
  CurrentlyActiveProductBadge,
  EstDaysLabel,
  removableProductTitleBoxClassName,
} from "./AccordionBadge";
import { AccordionHeaderActions, ExtractionsDoneAcknowledgement } from "./ExtractionsDoneAcknowledgement";
import { DoneTransitionButton } from "./DoneTransitionButton";
import { ProductImagePreview, productAccordionLargeImageContainerClass } from "./ProductImagePreview";
import { RushIcon } from "./CenterActionIcons";
import { isDisplayableStageValue, shouldSkipStageSelection } from "../utils/categoryHelpers";
import type { ProductApiData } from "../types";

export interface RestorationAccordionHeaderProps {
  isExpanded: boolean;
  caseSubmitted?: boolean;
  hasRush?: boolean;
  onToggleExpand: () => void;
  expandEnabled?: boolean;

  productImageUrl: string | null | undefined;
  productName: string;
  toothDisplay: string;
  categoryName?: string;
  subcategoryName?: string;
  stageName?: string;
  stageProduct?: ProductApiData | null;
  estDaysText: string;
  canDelete?: boolean;
  onDelete?: () => void;

  isCurrentlyActive?: boolean;
  confirmDetailsChecked?: boolean;
  showHeaderContent?: boolean;

  showExtractionsDone?: boolean;
  extractionsAcknowledged?: boolean;
  onExtractionsAcknowledgedChange?: (value: boolean) => void;

  showRetentionDone?: boolean;
  retentionDoneAcknowledged?: boolean;
  onRetentionDoneChange?: (value: boolean) => void;

  /** e.g. ToothStatusBoxes below title box, above Est days */
  middleContent?: ReactNode;
  /** Splinted teeth groups summary, e.g. "6-7-8, 11-12". Shown below Est days when non-empty. */
  splintSummary?: string;
  /** Callback when the plus icon is clicked to activate product tooth selection */
  onPlusClick?: () => void;
  /** When true, standard product selection mode is active and we render a distinct thick border */
  isProductSelectionActive?: boolean;
  /** When true, an extraction box is active — always show the Plus icon regardless of extraction acknowledgement state */
  isExtractionActive?: boolean;
  /** Custom tooltip label for the plus icon (e.g. "Click tooth to mark as Will extract on delivery") */
  plusTooltipLabel?: string;
}

/**
 * Removable-style accordion header (large image, category tags, active product box).
 * Used for both removables and fixed restoration product cards.
 */
export function RestorationAccordionHeader({
  isExpanded,
  caseSubmitted = false,
  hasRush = false,
  onToggleExpand,
  expandEnabled = true,
  productImageUrl,
  productName,
  toothDisplay,
  categoryName,
  subcategoryName,
  stageName,
  stageProduct,
  estDaysText,
  canDelete = false,
  onDelete,
  isCurrentlyActive = false,
  confirmDetailsChecked = false,
  showHeaderContent = true,
  showExtractionsDone = false,
  extractionsAcknowledged = false,
  onExtractionsAcknowledgedChange,
  showRetentionDone = false,
  retentionDoneAcknowledged = false,
  onRetentionDoneChange,
  middleContent,
  splintSummary = "",
  onPlusClick,
  isProductSelectionActive = false,
  isExtractionActive = false,
  plusTooltipLabel,
}: RestorationAccordionHeaderProps) {
  const showStageBadge =
    isDisplayableStageValue(stageName) &&
    !shouldSkipStageSelection(stageProduct ?? undefined);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div
      className={`w-full flex flex-col transition-colors rounded-t-[5.4px] relative ${hasRush ? "bg-[#FCE4E4]" : "bg-white"
        }`}
    >
      <DeleteProductConfirmModal
        open={showDeleteConfirm}
        productName={productName}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete?.();
        }}
      />
      <AccordionHeaderActions
        isExpanded={isExpanded}
        caseSubmitted={caseSubmitted}
        showExtractionsDone={false}
        extractionsAcknowledged={extractionsAcknowledged}
        onExtractionsAcknowledgedChange={onExtractionsAcknowledgedChange}
        showRetentionDone={false}
        retentionDoneAcknowledged={retentionDoneAcknowledged}
        onRetentionDoneChange={onRetentionDoneChange}
        onToggleExpand={onToggleExpand}
        expandEnabled={expandEnabled}
      />
      <div
        className="flex items-stretch gap-[10px] px-[8px] pt-[14px]"
        onClick={(e) => e.stopPropagation()}
      >
        <ProductImagePreview
          imageUrl={productImageUrl}
          altText={productName}
          containerClassName={productAccordionLargeImageContainerClass}
          imgClassName="w-full h-full object-contain"
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[10px] text-gray-400">No img</span>
            </div>
          }
        />
        <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
          {showHeaderContent && (
            <>
              {/* Hidden: Currently active + category/subcategory badges — set to true to restore */}
              {false && (
                <div className="flex items-center gap-[4px] flex-wrap">
                  {isCurrentlyActive && <CurrentlyActiveProductBadge />}
                  {categoryName && <AccordionBadge>{categoryName}</AccordionBadge>}
                  {subcategoryName && <AccordionBadge>{subcategoryName}</AccordionBadge>}
                </div>
              )}
              <fieldset
                className={`${caseDesignInter.className} rounded-[6px] px-[12px] py-[10px] min-h-[48px] flex items-center justify-center text-center relative`}
                style={{
                  border: isProductSelectionActive
                    ? "2px solid rgb(211, 211, 211)"
                    : "1px solid rgb(217, 217, 217)",
                  boxShadow: isProductSelectionActive
                    ? "rgb(219, 234, 254) 0px 0px 0px 2px"
                    : "none"
                }}
              >
                {onPlusClick && (isExtractionActive || !(showExtractionsDone && !extractionsAcknowledged)) && (
                  <div
                    className="absolute left-[16px] top-1/2 transform -translate-y-1/2 flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlusClick();
                    }}
                    title={plusTooltipLabel || "Activate product tooth selections"}
                  >
                    <svg width="24" height="24" viewBox="0 0 248 248" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M127.118 20.6655C135.297 20.6656 141.928 27.2961 141.928 35.4751V105.36H212.524C220.704 105.36 227.334 111.99 227.334 120.169V126.307C227.334 134.486 220.704 141.118 212.524 141.118H141.928V212.525C141.927 220.704 135.297 227.334 127.118 227.334H120.98C112.801 227.334 106.171 220.704 106.171 212.525V141.118H35.4756C27.2964 141.118 20.666 134.486 20.666 126.307V120.169C20.6661 111.99 27.2965 105.36 35.4756 105.36H106.171V35.4751C106.171 27.2961 112.801 20.6655 120.98 20.6655H127.118Z"
                        fill="url(#paint0_linear_removable_plus)"
                      />
                      <defs>
                        <linearGradient
                          id="paint0_linear_removable_plus"
                          x1="283.36"
                          y1="23.4262"
                          x2="-14.7"
                          y2="260.838"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#2AA6DE" />
                          <stop offset="0.5" stopColor="#82298D" />
                          <stop offset="1" stopColor="#C9539F" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                )}
                <legend className={`${removableHeaderTitleClass} px-[8px] text-center text-[#555555] bg-white flex items-center justify-center gap-1`}>
                  {productName}
                  {hasRush && (
                    <RushIcon className="inline w-[14px] h-[14px] ml-1 text-[#CF0202]" />
                  )}
                </legend>
                {toothDisplay ? (
                  <p className={`${removableHeaderToothClass} text-[#666666]`}>{toothDisplay}</p>
                ) : null}
              </fieldset>
              {middleContent}
              <div className="flex justify-center items-center gap-2 w-full">
                <EstDaysLabel
                  rushed={hasRush}
                  text={hasRush ? "5 work days after submission" : estDaysText}
                />
                {canDelete && !caseSubmitted && onDelete ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    className="inline-flex items-center justify-center flex-shrink-0 cursor-pointer text-[#999999] hover:text-red-500 transition-colors"
                    title="Remove this product"
                    aria-label="Remove this product"
                  >
                    <Trash2 size={18} />
                  </button>
                ) : null}
              </div>
              {splintSummary ? (
                <div className="w-full flex justify-center mt-1">
                  <div className="inline-flex flex-col items-center justify-center leading-tight rounded-md border border-[#1162A8] bg-[#EAF3FB] px-3 py-1">
                    <span className="text-[12px] sm:text-[13px] font-semibold text-[#1162A8]">
                      Splinted
                    </span>
                    <span className="text-[12px] sm:text-[13px] text-[#1162A8]">
                      {splintSummary}
                    </span>
                  </div>
                </div>
              ) : null}
              {showRetentionDone && !retentionDoneAcknowledged && onRetentionDoneChange && (
                <div className="w-full flex justify-center mt-2 py-2 overflow-visible" onClick={(e) => e.stopPropagation()}>
                  <DoneTransitionButton onComplete={() => onRetentionDoneChange(true)} />
                </div>
              )}
              <div className="flex items-center gap-[4.97px] flex-wrap">
                {/* Hidden: stage badge — set to true to restore */}
                {false && showStageBadge && stageName && <AccordionBadge>{stageName}</AccordionBadge>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
