"use client";

import {
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  Zap,
  Trash2,
  Check,
  Paperclip,
} from "lucide-react";
import { MaxillaryTeethSVG } from "@/components/maxillary-teeth-svg";
import { FieldInput, ShadeField } from "./fields";
import { ShadeSelectionGuide } from "./ShadeSelectionGuide";
import { ToothStatusBoxes } from "./ToothStatusBoxes";
import type {
  AddedProduct,
  Arch,
  ShadeFieldType,
  ShadeSelectionState,
  RetentionPopoverState,
} from "../types";
import { shadeGuideOptions as defaultShadeGuideOptions } from "../constants";

/* ------------------------------------------------------------------ */
/*  Articulator icon (Stage field)                                     */
/*  The original file contains a large base64-encoded PNG image here.  */
/*  It is extracted as a constant so the JSX stays readable.           */
/* ------------------------------------------------------------------ */
function ArticulatorIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <rect
        width="31.5133"
        height="31.5133"
        rx="1.28103"
        fill="url(#pattern0_1_1236)"
      />
      <defs>
        <pattern
          id="pattern0_1_1236"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlinkHref="#image0_1_1236"
            transform="translate(0 -0.166667) scale(0.000326797)"
          />
        </pattern>
        {/* NOTE: The original file includes a very large base64 <image> element here.
            Reference: <image id="image0_1_1236" width="3060" height="4080" .../>
            For production, paste the full base64 data from the original CaseDesignCenterTest.tsx line 1412,
            or move the image to a public asset and reference it via src. */}
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Diamond SVG icons (Grade field)                                    */
/* ------------------------------------------------------------------ */
function BlueDiamond() {
  return (
    <svg width="30" height="24" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 6.84708L14.9998 23.4212L0 6.84708L6.93035 0H23.07L30 6.84708Z" fill="#45B2EF" />
      <path d="M7.96094 6.84708H0L6.93035 0L7.96094 6.84708Z" fill="#45B2EF" />
      <path d="M14.9996 23.4212L-0.000244141 6.84708H7.96069L14.9996 23.4212Z" fill="#3B9FE2" />
      <path d="M14.9996 23.4212L7.96068 6.84708H22.0388L14.9996 23.4212Z" fill="#45B2EF" />
      <path d="M22.0388 6.84708H7.96068L14.9996 0L22.0388 6.84708Z" fill="#80D4FD" />
      <path d="M29.9998 6.84708H22.0388L23.0698 0L29.9998 6.84708Z" fill="#45B2EF" />
      <path d="M29.9998 6.84708L14.9996 23.4212L22.0389 6.84708H29.9998Z" fill="#3B9FE2" />
      <path d="M14.9996 0L7.96075 6.84708L6.93016 0H14.9996Z" fill="#4FC1F8" />
      <path d="M23.0698 0L22.0389 6.84708L14.9996 0H23.0698Z" fill="#4FC1F8" />
    </svg>
  );
}

function GrayDiamond() {
  return (
    <svg width="30" height="24" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 6.84708L14.9998 23.4212L0 6.84708L6.93035 0H23.07L30 6.84708Z" fill="#575756" />
      <path d="M7.96094 6.84708H0L6.93035 0L7.96094 6.84708Z" fill="#575756" />
      <path d="M14.9996 23.4212L-0.000244141 6.84708H7.96069L14.9996 23.4212Z" fill="#706F6F" />
      <path d="M14.9995 23.4212L7.96066 6.84708H22.0388L14.9995 23.4212Z" fill="#575756" />
      <path d="M22.0388 6.84708H7.96066L14.9995 0L22.0388 6.84708Z" fill="#3C3C3B" />
      <path d="M29.9998 6.84708H22.0388L23.0698 0L29.9998 6.84708Z" fill="#575756" />
      <path d="M29.9998 6.84708L14.9996 23.4212L22.0389 6.84708H29.9998Z" fill="#706F6F" />
      <path d="M14.9996 0L7.96073 6.84708L6.93015 0H14.9996Z" fill="#1D1D1B" />
      <path d="M23.0698 0L22.0389 6.84708L14.9996 0H23.0698Z" fill="#1D1D1B" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface MaxillaryPanelProps {
  // Visibility
  showMaxillary: boolean;
  setShowMaxillary: (v: boolean) => void;

  // Add product callback
  onAddProduct?: (arch: Arch) => void;

  // Tooth selection
  maxillaryTeeth: number[];
  handleMaxillaryToothClick: (toothNumber: number) => void;
  maxillaryRetentionTypes: Record<number, Array<"Implant" | "Prep" | "Pontic">>;
  retentionPopoverState: RetentionPopoverState;
  setRetentionPopoverState: (state: RetentionPopoverState) => void;
  handleSelectRetentionType: (
    arch: Arch,
    toothNumber: number,
    type: "Implant" | "Prep" | "Pontic"
  ) => void;
  handleMaxillaryToothDeselect: (toothNumber: number) => void;

  // Shade selection
  shadeSelectionState: ShadeSelectionState;
  setShadeSelectionState: (
    state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)
  ) => void;
  selectedShadeGuide: string;
  setSelectedShadeGuide: (v: string) => void;
  showShadeGuideDropdown: boolean;
  setShowShadeGuideDropdown: (v: boolean) => void;
  shadeGuideOptions: string[];
  getSelectedShade: (
    productId: string,
    arch: Arch,
    fieldType: ShadeFieldType
  ) => string;
  handleShadeSelect: (shade: string) => void;
  handleShadeFieldClick: (
    arch: Arch,
    fieldType: ShadeFieldType,
    productId: string
  ) => void;

  // Expansion
  expandedLeft: boolean;
  setExpandedLeft: (v: boolean) => void;

  // Rush
  rushedProducts: Record<string, any>;

  // Modal openers
  handleOpenImpressionModal: (arch: Arch, productId: string) => void;
  handleOpenAddOnsModal: (arch: Arch, productId: string) => void;
  handleOpenRushModal: (arch: Arch, productId: string) => void;
  handleOpenStageModal: (productId: string) => void;
  setShowAttachModal: (v: boolean) => void;
  getImpressionDisplayText: (productId: string, arch: Arch) => string;
  selectedStages: Record<string, string>;

  // Added products
  addedProducts: AddedProduct[];
  toggleAddedProductExpanded: (productId: number) => void;
  handleRemoveAddedProduct: (productId: number) => void;
}

/* ------------------------------------------------------------------ */
/*  MaxillaryPanel                                                     */
/* ------------------------------------------------------------------ */
export function MaxillaryPanel({
  showMaxillary,
  setShowMaxillary,
  onAddProduct,
  maxillaryTeeth,
  handleMaxillaryToothClick,
  maxillaryRetentionTypes,
  retentionPopoverState,
  setRetentionPopoverState,
  handleSelectRetentionType,
  handleMaxillaryToothDeselect,
  shadeSelectionState,
  setShadeSelectionState,
  selectedShadeGuide,
  setSelectedShadeGuide,
  showShadeGuideDropdown,
  setShowShadeGuideDropdown,
  shadeGuideOptions,
  getSelectedShade,
  handleShadeSelect,
  handleShadeFieldClick,
  expandedLeft,
  setExpandedLeft,
  rushedProducts,
  handleOpenImpressionModal,
  handleOpenAddOnsModal,
  handleOpenRushModal,
  handleOpenStageModal,
  setShowAttachModal,
  getImpressionDisplayText,
  selectedStages,
  addedProducts,
  toggleAddedProductExpanded,
  handleRemoveAddedProduct,
}: MaxillaryPanelProps) {
  return (
    <div className="flex-1 min-w-0 px-0 md:px-3 order-1 lg:order-none">
      {/* Maxillary header - centered */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-3">
        <h3 className="text-[12px] md:text-[14px] font-bold text-[#1d1d1b] tracking-wide">
          MAXILLARY
        </h3>
        <button
          onClick={() => onAddProduct?.("maxillary")}
          className="flex items-center gap-1.5 bg-[#1162A8] hover:bg-[#0d4a85] shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-center px-2.5 py-0 rounded-md"
        >
          <Plus size={13} strokeWidth={1.5} />
          Add Product
        </button>
      </div>

      {/* Eye toggle - always visible */}
      <div className="flex justify-start mb-1">
        <button
          onClick={() => setShowMaxillary(!showMaxillary)}
          className="flex-shrink-0 w-[28.5px] h-[28.5px] flex items-center justify-center bg-white rounded-full shadow-[0.75px_0.75px_3px_rgba(0,0,0,0.25)] hover:shadow-[0.75px_0.75px_5px_rgba(0,0,0,0.35)] transition-shadow"
          title={showMaxillary ? "Hide Maxillary" : "Show Maxillary"}
        >
          {showMaxillary ? (
            <Eye size={13.5} className="text-[#b4b0b0]" />
          ) : (
            <EyeOff size={13.5} className="text-[#b4b0b0]" />
          )}
        </button>
      </div>

      {/* Maxillary section - conditionally shown */}
      {showMaxillary && (
        <>
          {/* Teeth row */}
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <MaxillaryTeethSVG
                selectedTeeth={maxillaryTeeth}
                onToothClick={handleMaxillaryToothClick}
                className="w-full"
                retentionTypesByTooth={maxillaryRetentionTypes}
                showRetentionPopover={
                  retentionPopoverState.arch === "maxillary"
                }
                retentionPopoverTooth={retentionPopoverState.toothNumber}
                onSelectRetentionType={(tooth, type) =>
                  handleSelectRetentionType("maxillary", tooth, type)
                }
                onClosePopover={() =>
                  setRetentionPopoverState({
                    arch: null,
                    toothNumber: null,
                  })
                }
                onDeselectTooth={handleMaxillaryToothDeselect}
              />
            </div>
          </div>

          {/* Shade Selection Guide - Maxillary */}
          {shadeSelectionState.arch === "maxillary" && (
            <ShadeSelectionGuide
              arch="maxillary"
              shadeSelectionState={shadeSelectionState}
              setShadeSelectionState={setShadeSelectionState}
              selectedShadeGuide={selectedShadeGuide}
              showShadeGuideDropdown={showShadeGuideDropdown}
              setShowShadeGuideDropdown={setShowShadeGuideDropdown}
              setSelectedShadeGuide={setSelectedShadeGuide}
              shadeGuideOptions={shadeGuideOptions}
              getSelectedShade={getSelectedShade}
              handleShadeSelect={handleShadeSelect}
            />
          )}

          {/* Status boxes */}
          <ToothStatusBoxes />

          {/* Restoration product card (Metal frame acrylic) - full accordion */}
          <div
            className={`rounded-lg bg-white overflow-hidden ${
              rushedProducts["maxillary_removable_1"]
                ? "border-2 border-[#CF0202]"
                : "border border-[#d9d9d9]"
            }`}
          >
            {/* Accordion header */}
            <button
              type="button"
              onClick={() => setExpandedLeft(!expandedLeft)}
              className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${
                rushedProducts["maxillary_removable_1"]
                  ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]"
                  : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"
              }`}
            >
              <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src="/placeholder.svg?height=48&width=48&query=dental+partial+denture+tooth"
                  alt="Restoration"
                  className="w-[61.58px] h-[28.79px] object-contain"
                />
              </div>
              <div className="flex-1 min-w-0 text-left flex flex-col">
                <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black flex items-center gap-1">
                  Metal frame acrylic
                  {rushedProducts["maxillary_removable_1"] && (
                    <Zap
                      className="w-[14px] h-[14px] text-[#CF0202] flex-shrink-0"
                      strokeWidth={2}
                      fill="#CF0202"
                    />
                  )}
                </p>
                <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                  #4,5
                </p>
                <div className="flex items-center gap-[5px] flex-wrap">
                  <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                    Removable Restoration
                  </span>
                  <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                    Partial denture
                  </span>
                  <span
                    className={`font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] ${
                      rushedProducts["maxillary_removable_1"]
                        ? "text-[#CF0202] font-medium"
                        : "text-[#B4B0B0]"
                    }`}
                  >
                    Est days:{" "}
                    {rushedProducts["maxillary_removable_1"]
                      ? "5 work days after submission"
                      : "10 work days after submission"}
                  </span>
                  <Trash2 size={9} className="text-[#999999]" />
                </div>
              </div>
              <ChevronDown
                size={21.6}
                className={`text-black flex-shrink-0 transition-transform ${
                  expandedLeft ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Accordion body */}
            {expandedLeft && (
              <div className="border-t border-[#d9d9d9] p-4 bg-white space-y-3">
                {/* Grade / Stage */}
                <div className="grid grid-cols-2 gap-3">
                  <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                    <legend className="text-[11px] text-[#34a853] px-1 leading-none">
                      Grade
                    </legend>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#1d1d1b]">
                        Standard
                      </span>
                      <div className="flex gap-1 ml-auto">
                        {/* Diamond icons: 2 blue, 2 gray */}
                        <BlueDiamond />
                        <BlueDiamond />
                        <GrayDiamond />
                        <GrayDiamond />
                      </div>
                      <Check size={16} className="text-[#34a853]" />
                    </div>
                  </fieldset>
                  <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                    <legend className="text-[11px] text-[#34a853] px-1 leading-none">
                      Stage
                    </legend>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#1d1d1b]">
                        Try in with teeth
                      </span>
                      <Check size={16} className="text-[#34a853]" />
                      <div className="ml-auto">
                        {/* Articulator icon */}
                        <ArticulatorIcon />
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* Teeth shade / Gum Shade */}
                <div className="grid grid-cols-2 gap-3">
                  <ShadeField
                    label="Teeth shade"
                    value="Vita Classical"
                    shade={
                      getSelectedShade(
                        "removable_metal_frame",
                        "maxillary",
                        "tooth_shade"
                      ) || "A2"
                    }
                    onClick={() =>
                      handleShadeFieldClick(
                        "maxillary",
                        "tooth_shade",
                        "removable_metal_frame"
                      )
                    }
                  />
                  <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                    <legend className="text-[11px] text-[#34a853] px-1 leading-none">
                      Gum Shade
                    </legend>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue="GC Initial Gingiva, G-Intense"
                        className="flex-1 text-[13px] text-[#1d1d1b] bg-transparent outline-none leading-tight min-w-0"
                      />
                      <svg
                        width="29"
                        height="29"
                        viewBox="0 0 29 29"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          width="28.0391"
                          height="28.0391"
                          rx="6"
                          fill="#E58D8D"
                        />
                      </svg>
                      <Check size={16} className="text-[#34a853]" />
                    </div>
                  </fieldset>
                </div>

                {/* Impression / Add ons */}
                <div className="grid grid-cols-2 gap-3">
                  <FieldInput
                    label="Impression"
                    value={
                      getImpressionDisplayText("removable_1", "maxillary") ||
                      "1x Clean impression, 1x STL"
                    }
                    onClick={() =>
                      handleOpenImpressionModal("maxillary", "removable_1")
                    }
                  />
                  <FieldInput
                    label="Add ons"
                    value="1x Gold tooth, 2x clasps, 1x custom tray..."
                    onClick={() =>
                      handleOpenAddOnsModal("maxillary", "removable_1")
                    }
                  />
                </div>

                {/* Bottom action buttons */}
                <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                  <button
                    onClick={() =>
                      handleOpenAddOnsModal("maxillary", "removable_1")
                    }
                    className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                  >
                    <Plus
                      size={10}
                      className="text-[#1E1E1E]"
                      strokeWidth={1.5}
                    />
                    <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                      Add ons (3 selected)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAttachModal(true)}
                    className="flex-none order-1 flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                  >
                    <Paperclip
                      size={10}
                      className="text-[#1E1E1E]"
                      strokeWidth={1.5}
                    />
                    <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                      Attach Files (15 uploads)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenRushModal("maxillary", "removable_1")
                    }
                    className={`relative flex-none order-3 flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] shadow-[0_0_2.9px_rgba(207,2,2,0.67)] flex items-center justify-center gap-1.5 hover:bg-[#f0f0f0] transition-colors ${
                      rushedProducts["maxillary_removable_1"]
                        ? "bg-[#CF0202]"
                        : "bg-[#F9F9F9]"
                    }`}
                  >
                    <span
                      className={`font-["Verdana"] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] whitespace-nowrap ${
                        rushedProducts["maxillary_removable_1"]
                          ? "text-white"
                          : "text-black"
                      }`}
                    >
                      {rushedProducts["maxillary_removable_1"]
                        ? "Rushed"
                        : "Request Rush"}
                    </span>
                    <Zap
                      className={`w-[8.78px] h-[10.54px] flex-shrink-0 ${
                        rushedProducts["maxillary_removable_1"]
                          ? "text-white"
                          : "text-[#CF0202]"
                      }`}
                      strokeWidth={0.878154}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dynamically added maxillary products */}
          {addedProducts
            .filter((ap) => ap.arch === "maxillary")
            .map((ap) => (
              <div
                key={ap.id}
                className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3"
              >
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => toggleAddedProductExpanded(ap.id)}
                  className="w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] bg-[#DFEEFB] hover:bg-[#d4e8f8]"
                >
                  <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {ap.product.image_url ? (
                      <img
                        src={ap.product.image_url}
                        alt={ap.product.name || "Product"}
                        className="w-[61.58px] h-[28.79px] object-contain"
                      />
                    ) : (
                      <div className="w-[61.58px] h-[28.79px] bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-[10px] text-gray-400">
                          No img
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left flex flex-col">
                    <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                      {ap.product.name || "Untitled Product"}
                    </p>
                    <div className="flex items-center gap-[5px] flex-wrap">
                      {ap.product.category_name && (
                        <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                          {ap.product.category_name}
                        </span>
                      )}
                      {ap.product.subcategory_name && (
                        <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                          {ap.product.subcategory_name}
                        </span>
                      )}
                      <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-[#B4B0B0]">
                        Est days: 10 work days after submission
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAddedProduct(ap.id);
                        }}
                        className="ml-1 hover:text-red-500 transition-colors"
                        title="Remove product"
                      >
                        <Trash2
                          size={9}
                          className="text-[#999999] hover:text-red-500"
                        />
                      </button>
                    </div>
                  </div>
                  <ChevronDown
                    size={21.6}
                    className={`text-black flex-shrink-0 transition-transform ${
                      ap.expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Accordion body */}
                {ap.expanded && (
                  <div className="border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FieldInput
                        label="Product - Material"
                        value={ap.product.name || ""}
                      />
                      <FieldInput
                        label="Category"
                        value={
                          ap.product.category_name ||
                          ap.product.category?.name ||
                          ""
                        }
                      />
                    </div>
                    {ap.product.code && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldInput
                          label="Product Code"
                          value={ap.product.code}
                        />
                        <FieldInput
                          label="Arch"
                          value={
                            ap.arch === "maxillary"
                              ? "Maxillary (Upper)"
                              : "Mandibular (Lower)"
                          }
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenAddOnsModal(
                            "maxillary",
                            `added_${ap.id}`
                          )
                        }
                        className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                      >
                        <Plus
                          size={10}
                          className="text-[#1E1E1E]"
                          strokeWidth={1.5}
                        />
                        <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                          Add ons
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAttachModal(true)}
                        className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                      >
                        <Paperclip
                          size={10}
                          className="text-[#1E1E1E]"
                          strokeWidth={1.5}
                        />
                        <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">
                          Attach Files
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </>
      )}
    </div>
  );
}
