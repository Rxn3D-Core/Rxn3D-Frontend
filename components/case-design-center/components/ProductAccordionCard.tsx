"use client";

import React from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { AccordionBadge, EstDaysLabel } from "./AccordionBadge";
import { ProductImagePreview } from "./ProductImagePreview";
import { RushIcon } from "./CenterActionIcons";

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
  children,
}: ProductAccordionCardProps) {
  return (
    <div className="relative mt-2">
      <div
        className={`rounded-lg bg-white overflow-hidden ${hasRush ? "border-2 border-[#CF0202]" : "border border-[#d9d9d9]"}`}
      >
        {customHeader ?? (
          /* Default compact header — fixed restoration style */
          <button
            type="button"
            onClick={onToggle}
            className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${
              hasRush ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]" : "bg-white hover:bg-gray-50"
            }`}
          >
            <ProductImagePreview
              imageUrl={productImageUrl}
              altText={productName}
            />
            <div className="flex-1 min-w-0 text-left flex flex-col gap-0.5">
              <p className="font-[Verdana] text-[14px] sm:text-lg font-bold leading-tight tracking-[-0.02em] text-black flex items-center gap-1 truncate">
                {productName}
                {toothDisplay && (
                  <span className="font-normal text-[13px] sm:text-base text-black">{toothDisplay}</span>
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
            className={`border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3 max-h-[600px] overflow-y-auto scrollbar-blue${caseSubmitted ? " pointer-events-none select-none" : ""}`}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
