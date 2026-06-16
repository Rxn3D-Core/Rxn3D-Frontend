"use client";

import React from "react";
import { ChevronDown, Trash2, Plus } from "lucide-react";
import { DeleteProductConfirmModal } from "./DeleteProductConfirmModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AccordionBadge, EstDaysLabel } from "./AccordionBadge";
import { ExtractionsDoneAcknowledgement } from "./ExtractionsDoneAcknowledgement";
import { ProductImagePreview } from "./ProductImagePreview";
import { RushIcon } from "./CenterActionIcons";
import { caseDesignInter, productAccordionTitleClass, productAccordionToothClass } from "../case-design-inter-font";

export interface ProductAccordionCardProps {
  slotId: string;
  arch: "maxillary" | "mandibular";
  isExpanded: boolean;
  onToggle: () => void;

  productName: string;
  productImageUrl: string | null | undefined;
  toothDisplay: string;
  categoryName?: string;
  subcategoryName?: string;
  stageName?: string;
  estDaysText: string;
  hasRush: boolean;
  canDelete: boolean;
  onDelete?: () => void;

  confirmDetailsChecked?: boolean;
  caseSubmitted?: boolean;

  /** Highlights this accordion as the product receiving chart / tooth-status input (blue card ring). */
  isCurrentlyActive?: boolean;

  /** Removable multi-extraction: Done control before chevron (same slot as fixed retention Done). */
  showExtractionsDone?: boolean;
  extractionsAcknowledged?: boolean;
  onExtractionsAcknowledgedChange?: (value: boolean) => void;

  /**
   * Optional block below the compact header row (e.g. ToothStatusBoxes).
   * Clicks do not toggle expand/collapse.
   */
  headerExtension?: React.ReactNode;

  /** When false, accordion is dimmed and cannot be expanded (another arch/product is active). */
  interactionEnabled?: boolean;

  /** Fixed restoration: Done after tooth-chart retention selection (same UX as removable extractions). */
  showRetentionDone?: boolean;
  retentionDoneAcknowledged?: boolean;
  onRetentionDoneChange?: (value: boolean) => void;

  /** Removable/fixed layout: large image, tags, active product box (replaces default compact header). */
  customHeader?: React.ReactNode;

  /** When set, shows a + icon with this text as a tooltip next to the tooth display (hints the user to click a tooth). */
  toothSelectHintLabel?: string;

  children?: React.ReactNode;
}

export function ProductAccordionCard({
  isExpanded,
  onToggle,
  productName,
  productImageUrl,
  toothDisplay,
  categoryName,
  subcategoryName,
  stageName,
  estDaysText,
  hasRush,
  canDelete,
  onDelete,
  caseSubmitted = false,
  isCurrentlyActive = false,
  interactionEnabled = true,
  showRetentionDone = false,
  retentionDoneAcknowledged = false,
  onRetentionDoneChange,
  showExtractionsDone = false,
  extractionsAcknowledged = false,
  onExtractionsAcknowledgedChange,
  headerExtension,
  customHeader,
  toothSelectHintLabel,
  children,
}: ProductAccordionCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  return (
    <div className={`relative mt-2 ${!interactionEnabled ? "opacity-45 pointer-events-none" : ""}`}>
      <DeleteProductConfirmModal
        open={showDeleteConfirm}
        productName={productName}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete?.();
        }}
      />
      <div className="rounded-lg bg-white overflow-hidden">
        {customHeader ? (
          <div className={headerExtension || isExpanded ? "" : "rounded-b-[5.4px]"}>
            {customHeader}
          </div>
        ) : (
          <button
            type="button"
            disabled={!interactionEnabled}
            onClick={interactionEnabled ? onToggle : undefined}
            className={`${caseDesignInter.className} w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] ${
              !interactionEnabled
                ? "cursor-not-allowed bg-white"
                : hasRush
                  ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]"
                  : "bg-white hover:bg-gray-50"
            } ${headerExtension ? "" : isExpanded ? "" : "rounded-b-[5.4px]"}`}
          >
            <ProductImagePreview imageUrl={productImageUrl} altText={productName} />
            <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
              <p className="flex items-center gap-1 truncate min-w-0">
                <span className={`${productAccordionTitleClass} truncate`}>{productName}</span>
                {toothDisplay && (
                  <span className={`${productAccordionToothClass} flex-shrink-0`}>{toothDisplay}</span>
                )}
                {toothSelectHintLabel && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 cursor-default" onClick={(e) => e.stopPropagation()}>
                          <Plus size={12} className="text-white" strokeWidth={3} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">{toothSelectHintLabel}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {hasRush && <RushIcon className="w-[20px] h-[20px] flex-shrink-0" />}
              </p>
              <div className="flex items-center gap-[5px] flex-wrap">
                {categoryName && <AccordionBadge>{categoryName}</AccordionBadge>}
                {subcategoryName && <AccordionBadge>{subcategoryName}</AccordionBadge>}
                {/* Hidden: stage badge — set to true to restore */}
                {false && stageName && <AccordionBadge>{stageName}</AccordionBadge>}
                <EstDaysLabel rushed={hasRush} text={hasRush ? "5 work days after submission" : estDaysText} />
                {canDelete && !caseSubmitted && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }
                    }}
                    className="inline-flex items-center justify-center flex-shrink-0 cursor-pointer hover:text-red-500 transition-colors"
                    title="Remove product"
                  >
                    <Trash2 size={18} className="text-[#999999] hover:text-red-500" />
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {showExtractionsDone && onExtractionsAcknowledgedChange && (
                <div onClick={(e) => e.stopPropagation()}>
                  <ExtractionsDoneAcknowledgement
                    acknowledged={extractionsAcknowledged}
                    onAcknowledgedChange={onExtractionsAcknowledgedChange}
                    caseSubmitted={caseSubmitted}
                  />
                </div>
              )}
              {showRetentionDone && onRetentionDoneChange && (
                <div onClick={(e) => e.stopPropagation()}>
                  <ExtractionsDoneAcknowledgement
                    acknowledged={retentionDoneAcknowledged}
                    onAcknowledgedChange={onRetentionDoneChange}
                    caseSubmitted={caseSubmitted}
                  />
                </div>
              )}
              <ChevronDown
                size={21.6}
                className={`text-black flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </div>
          </button>
        )}

        {headerExtension && (
          <div
            className="px-2 pb-2 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            {headerExtension}
          </div>
        )}

        {/* Body */}
        {isExpanded && children && (
          <div
            className={`bg-white space-y-3 min-w-0 overflow-x-hidden${caseSubmitted ? " pointer-events-none select-none" : ""}`}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
