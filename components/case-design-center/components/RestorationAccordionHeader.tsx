"use client";

import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
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
import { AccordionHeaderActions } from "./ExtractionsDoneAcknowledgement";
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

  /** e.g. ToothStatusBoxes between title box and footer badges */
  middleContent?: ReactNode;
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
}: RestorationAccordionHeaderProps) {
  const showStageBadge =
    isDisplayableStageValue(stageName) &&
    !shouldSkipStageSelection(stageProduct ?? undefined);

  return (
    <div
      className={`w-full flex flex-col transition-colors rounded-t-[5.4px] relative ${
        hasRush ? "bg-[#FCE4E4]" : "bg-white"
      }`}
    >
      <AccordionHeaderActions
        isExpanded={isExpanded}
        caseSubmitted={caseSubmitted}
        showExtractionsDone={showExtractionsDone}
        extractionsAcknowledged={extractionsAcknowledged}
        onExtractionsAcknowledgedChange={onExtractionsAcknowledgedChange}
        showRetentionDone={showRetentionDone}
        retentionDoneAcknowledged={retentionDoneAcknowledged}
        onRetentionDoneChange={onRetentionDoneChange}
        onToggleExpand={onToggleExpand}
        expandEnabled={expandEnabled}
      />
      <div
        className="flex items-stretch gap-[10px] px-[8px] py-[14px]"
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
        <div className="flex-1 min-w-0 flex flex-col gap-[9.94px]">
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
              <div
                className={`${caseDesignInter.className} ${removableProductTitleBoxClassName({
                  isCurrentlyActive,
                  confirmDetailsChecked,
                })}`}
              >
                <p
                  className={`${removableHeaderTitleClass} flex items-center gap-1 text-black`}
                >
                  {productName}
                  {hasRush && (
                    <RushIcon className="inline w-[14px] h-[14px] ml-1 text-[#CF0202]" />
                  )}
                </p>
                {toothDisplay ? (
                  <p className={`${removableHeaderToothClass} text-black`}>{toothDisplay}</p>
                ) : null}
              </div>
              {middleContent}
              <div className="flex items-center gap-[4.97px] flex-wrap">
                {/* Hidden: stage badge — set to true to restore */}
                {false && showStageBadge && stageName && <AccordionBadge>{stageName}</AccordionBadge>}
                <EstDaysLabel
                  rushed={hasRush}
                  text={hasRush ? "5 work days after submission" : estDaysText}
                />
                {canDelete && !caseSubmitted && onDelete && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") e.currentTarget.click();
                    }}
                    className="inline-flex items-center justify-center flex-shrink-0 cursor-pointer hover:text-red-500 transition-colors"
                    title="Remove product"
                  >
                    <Trash2 size={18} className="text-[#999999] hover:text-red-500" />
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
