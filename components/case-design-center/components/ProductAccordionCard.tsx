"use client";

import React from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { AccordionBadge, EstDaysLabel } from "./AccordionBadge";
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

  /**
   * When provided, replaces the default compact header button entirely.
   * Used for removable products that need the large-image header with
   * ToothStatusBoxes, bordered title box, and interactive extraction UI.
   * The caller is responsible for rendering the chevron and wiring onToggle.
   */
  customHeader?: React.ReactNode;

  /** Highlights this accordion as the product receiving chart / tooth-status input. */
  isCurrentlyActive?: boolean;

  /** When false, accordion is dimmed and cannot be expanded (another arch/product is active). */
  interactionEnabled?: boolean;

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
  customHeader,
  isCurrentlyActive = false,
  interactionEnabled = true,
  children,
}: ProductAccordionCardProps) {
  const outerBorderClass = isCurrentlyActive
    ? "border-2 border-[#1162A8] ring-2 ring-[#1162A8]/15"
    : hasRush
      ? "border-2 border-[#CF0202]"
      : "border border-[#d9d9d9]";

  return (
    <div className={`relative mt-2 ${!interactionEnabled ? "opacity-45 pointer-events-none" : ""}`}>
      <div className={`rounded-lg bg-white overflow-hidden ${outerBorderClass}`}>
        {customHeader ?? (
          /* Default compact header — fixed restoration style */
          <button
            type="button"
            disabled={!interactionEnabled}
            onClick={interactionEnabled ? onToggle : undefined}
            className={`${caseDesignInter.className} w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${
              !interactionEnabled
                ? "cursor-not-allowed bg-white"
                : hasRush
                  ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]"
                  : "bg-white hover:bg-gray-50"
            }`}
          >
            <ProductImagePreview
              imageUrl={productImageUrl}
              altText={productName}
            />
            <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
              <p className="flex items-center gap-1 truncate min-w-0">
                <span className={`${productAccordionTitleClass} truncate`}>{productName}</span>
                {toothDisplay && (
                  <span className={`${productAccordionToothClass} flex-shrink-0`}>{toothDisplay}</span>
                )}
                {hasRush && <RushIcon className="w-[20px] h-[20px] flex-shrink-0" />}
              </p>
              <div className="flex items-center gap-[5px] flex-wrap">
                {subcategoryName && <AccordionBadge>{subcategoryName}</AccordionBadge>}
                {categoryName && !subcategoryName && <AccordionBadge>{categoryName}</AccordionBadge>}
                {stageName && <AccordionBadge>{stageName}</AccordionBadge>}
                <EstDaysLabel rushed={hasRush} text={hasRush ? "5 work days after submission" : estDaysText} />
                {canDelete && !caseSubmitted && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onDelete?.(); }
                    }}
                    className="inline-flex items-center justify-center flex-shrink-0 cursor-pointer hover:text-red-500 transition-colors"
                    title="Remove product"
                  >
                    <Trash2 size={18} className="text-[#999999] hover:text-red-500" />
                  </span>
                )}
              </div>
            </div>
            <ChevronDown
              size={21.6}
              className={`text-black flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>
        )}

        {/* Body */}
        {isExpanded && children && (
          <div
            className={`border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3 min-w-0 overflow-x-hidden${caseSubmitted ? " pointer-events-none select-none" : ""}`}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
