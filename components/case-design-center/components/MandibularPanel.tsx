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
  Settings,
} from "lucide-react";
import { MandibularTeethSVG } from "@/components/mandibular-teeth-svg";
import { ToothShadeSelectionSVG } from "@/components/tooth-shade-selection-svg";
import {
  FieldInput,
  ShadeField,
  IconField,
  SelectField,
  ImplantInclusionsField,
  CardSelectorField,
  CardGallery,
} from "./fields";
import { ShadeSelectionGuide } from "./ShadeSelectionGuide";
import { ToothStatusBoxes } from "./ToothStatusBoxes";
import type {
  AddedProduct,
  Arch,
  ShadeFieldType,
  ShadeSelectionState,
  RetentionPopoverState,
  ActiveCardType,
  RetentionType,
} from "../types";
import { implantBrandPlatforms, implantBrandList } from "../constants";

interface MandibularPanelProps {
  showMandibular: boolean;
  setShowMandibular: (v: boolean) => void;
  onAddProduct?: (arch: "maxillary" | "mandibular") => void;

  // Teeth
  mandibularTeeth: number[];
  handleMandibularToothClick: (tooth: number) => void;
  handleMandibularToothDeselect: (tooth: number) => void;
  mandibularRetentionTypes: Record<number, RetentionType>;

  // Retention popover
  retentionPopoverState: RetentionPopoverState;
  setRetentionPopoverState: (state: RetentionPopoverState) => void;
  handleSelectRetentionType: (arch: Arch, tooth: number, type: RetentionType) => void;

  // Shade selection
  shadeSelectionState: ShadeSelectionState;
  setShadeSelectionState: (state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)) => void;
  selectedShadeGuide: string;
  showShadeGuideDropdown: boolean;
  setShowShadeGuideDropdown: (v: boolean) => void;
  setSelectedShadeGuide: (v: string) => void;
  shadeGuideOptions: string[];
  getSelectedShade: (productId: string, arch: Arch, fieldType: ShadeFieldType) => string;
  handleShadeSelect: (shade: string) => void;
  handleShadeFieldClick: (arch: Arch, fieldType: ShadeFieldType, productId: string) => void;

  // Card expand
  expandedCard: boolean;
  setExpandedCard: (v: boolean) => void;

  // Implant detail (right1)
  right1Brand: string;
  setRight1Brand: (v: string) => void;
  right1Platform: string;
  setRight1Platform: (v: string) => void;
  right1Inclusion: string;
  setRight1Inclusion: (v: string) => void;
  right1InclusionQty: number;
  setRight1InclusionQty: (v: number) => void;
  activeCardType: ActiveCardType;
  setActiveCardType: (v: ActiveCardType | ((prev: ActiveCardType) => ActiveCardType)) => void;

  // Stage
  selectedStages: Record<string, string>;
  handleOpenStageModal: (productId: string) => void;

  // Impression
  getImpressionDisplayText: (productId: string, arch: Arch) => string;
  handleOpenImpressionModal: (arch: Arch, productId: string) => void;

  // Add-ons
  handleOpenAddOnsModal: (arch: Arch, productId: string) => void;

  // Attach files
  setShowAttachModal: (v: boolean) => void;

  // Rush
  rushedProducts: Record<string, boolean>;
  handleOpenRushModal: (arch: Arch, productId: string) => void;

  // Added products
  addedProducts: AddedProduct[];
  toggleAddedProductExpanded: (id: number) => void;
  handleRemoveAddedProduct: (id: number) => void;
}

export function MandibularPanel({
  showMandibular,
  setShowMandibular,
  onAddProduct,
  mandibularTeeth,
  handleMandibularToothClick,
  handleMandibularToothDeselect,
  mandibularRetentionTypes,
  retentionPopoverState,
  setRetentionPopoverState,
  handleSelectRetentionType,
  shadeSelectionState,
  setShadeSelectionState,
  selectedShadeGuide,
  showShadeGuideDropdown,
  setShowShadeGuideDropdown,
  setSelectedShadeGuide,
  shadeGuideOptions,
  getSelectedShade,
  handleShadeSelect,
  handleShadeFieldClick,
  expandedCard,
  setExpandedCard,
  right1Brand,
  setRight1Brand,
  right1Platform,
  setRight1Platform,
  right1Inclusion,
  setRight1Inclusion,
  right1InclusionQty,
  setRight1InclusionQty,
  activeCardType,
  setActiveCardType,
  selectedStages,
  handleOpenStageModal,
  getImpressionDisplayText,
  handleOpenImpressionModal,
  handleOpenAddOnsModal,
  setShowAttachModal,
  rushedProducts,
  handleOpenRushModal,
  addedProducts,
  toggleAddedProductExpanded,
  handleRemoveAddedProduct,
}: MandibularPanelProps) {
  return (
    <div className="flex-1 min-w-0 px-0 md:px-3 order-3 lg:order-none">
      {/* Mandibular header - centered */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-3">
        <button
          onClick={() => onAddProduct?.('mandibular')}
          className="flex items-center gap-1.5 bg-[#1162A8] hover:bg-[#0d4a85] shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-center px-2.5 py-0 rounded-md">
          <Plus size={13} strokeWidth={1.5} />
          Add Product
        </button>
        <h3 className="text-[12px] md:text-[14px] font-bold text-[#1d1d1b] tracking-wide">
          MANDIBULAR
        </h3>
      </div>

      {/* Eye toggle - always visible */}
      <div className="flex justify-end mb-1">
        <button
          onClick={() => setShowMandibular(!showMandibular)}
          className="flex-shrink-0 w-[28.5px] h-[28.5px] flex items-center justify-center bg-white rounded-full shadow-[0.75px_0.75px_3px_rgba(0,0,0,0.25)] hover:shadow-[0.75px_0.75px_5px_rgba(0,0,0,0.35)] transition-shadow"
          title={showMandibular ? "Hide Mandibular" : "Show Mandibular"}
        >
          {showMandibular
            ? <Eye size={13.5} className="text-[#b4b0b0]" />
            : <EyeOff size={13.5} className="text-[#b4b0b0]" />
          }
        </button>
      </div>

      {/* Mandibular section - conditionally shown */}
      {showMandibular && (
        <>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <MandibularTeethSVG
                selectedTeeth={mandibularTeeth}
                onToothClick={handleMandibularToothClick}
                className="w-full"
                retentionTypesByTooth={mandibularRetentionTypes}
                showRetentionPopover={retentionPopoverState.arch === 'mandibular'}
                retentionPopoverTooth={retentionPopoverState.toothNumber}
                onSelectRetentionType={(tooth, type) => handleSelectRetentionType('mandibular', tooth, type)}
                onClosePopover={() => setRetentionPopoverState({ arch: null, toothNumber: null })}
                onDeselectTooth={handleMandibularToothDeselect}
              />
            </div>
          </div>

          {/* Shade Selection Guide - Mandibular */}
          {shadeSelectionState.arch === 'mandibular' && (
            <ShadeSelectionGuide
              arch="mandibular"
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

          <ToothStatusBoxes />

          {/* ---- Case Detail Card for #19 ---- */}
          <div className={`rounded-lg bg-white overflow-hidden ${rushedProducts["mandibular_fixed_19"] ? "border-2 border-[#CF0202]" : "border border-[#d9d9d9]"}`}>
            {/* Card header - same style as left accordion */}
            <button
              type="button"
              onClick={() => setExpandedCard(!expandedCard)}
              className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${rushedProducts["mandibular_fixed_19"] ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]" : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"}`}
            >
              <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src="/placeholder.svg?height=48&width=48&query=dental+crown+implant+tooth"
                  alt="Tooth 19"
                  className="w-[61.58px] h-[28.79px] object-contain"
                />
              </div>
              <div className="flex-1 min-w-0 text-left flex flex-col">
                <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black flex items-center gap-1">
                  Full contour Zirconia
                  {rushedProducts["mandibular_fixed_19"] && <Zap className="w-[14px] h-[14px] text-[#CF0202] flex-shrink-0" strokeWidth={2} fill="#CF0202" />}
                </p>
                <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                  #19
                </p>
                <div className="flex items-center gap-[5px] flex-wrap">
                  <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                    Fixed Restoration
                  </span>
                  <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                    Single Crown
                  </span>
                  <span className={`font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] ${rushedProducts["mandibular_fixed_19"] ? "text-[#CF0202] font-medium" : "text-[#B4B0B0]"}`}>
                    Est days: {rushedProducts["mandibular_fixed_19"] ? "7 work days" : "10 work days after submission"}
                  </span>
                  <Trash2 size={9} className="text-[#999999]" />
                </div>
              </div>
              <ChevronDown
                size={21.6}
                className={`text-black flex-shrink-0 transition-transform ${expandedCard ? "rotate-180" : ""}`}
              />
            </button>

            {/* Card body - full expanded content */}
            {expandedCard && (
              <div className="border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3">
                {/* Product - Material / Select Retention type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput
                    label="Product - Material"
                    value="Full contour - Zirconia"
                  />
                  <FieldInput
                    label="Select Retention type"
                    value="Screwed retained"
                  />
                </div>

                {/* Implant Detail fieldset (nested) */}
                <fieldset className="border border-[#7f7f7f] rounded-[7.7px] p-0 bg-white">
                  <legend className="text-[12.8px] text-[#7f7f7f] px-1 leading-none ml-2">
                    Implant Detail
                  </legend>
                  <div className="flex flex-col sm:flex-row">
                    {/* Left section - tooth number */}
                    <div className="flex justify-center items-center sm:w-[90px] shrink-0 py-2 sm:py-0">
                      <span className="text-[20px] text-[#7f7f7f] text-center">
                        #19
                      </span>
                    </div>
                    {/* Right section - form fields */}
                    <div className="flex flex-col p-2.5 sm:pl-0 sm:pr-2.5 sm:py-2.5 gap-3 flex-1 min-w-0">
                      {/* Row 1: Implant Brand, Platform, Size - 3 columns */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <CardSelectorField
                          label="Implant Brand"
                          value={right1Brand}
                          isActive={activeCardType.right1 === 'brand'}
                          onClick={() => {
                            setActiveCardType(prev => ({
                              ...prev,
                              right1: prev.right1 === 'brand' ? null : 'brand'
                            }));
                          }}
                        />

                        <CardSelectorField
                          label="Implant Platform"
                          value={right1Platform}
                          required={!right1Platform}
                          isActive={activeCardType.right1 === 'platform'}
                          onClick={() => {
                            if (!right1Brand) return; // Can't select platform without brand
                            setActiveCardType(prev => ({
                              ...prev,
                              right1: prev.right1 === 'platform' ? null : 'platform'
                            }));
                          }}
                        />

                        <SelectField
                          label="Implant Size"
                          value="4.5mm"
                          options={["3.5mm", "4mm", "4.5mm", "5mm", "5.5mm", "6mm"]}
                          onChange={() => {}}
                        />

                        {/* Shared Card Gallery - appears below the 3 fields */}
                        {activeCardType.right1 === 'brand' && (
                          <CardGallery
                            options={implantBrandList}
                            value={right1Brand}
                            onChange={(v) => {
                              setRight1Brand(v);
                              setRight1Platform("");
                              // Auto-switch to platform selection after brand is selected
                              setActiveCardType(prev => ({ ...prev, right1: 'platform' }));
                            }}
                          />
                        )}

                        {activeCardType.right1 === 'platform' && (
                          <CardGallery
                            options={right1Brand ? (implantBrandPlatforms[right1Brand] || []) : []}
                            value={right1Platform}
                            onChange={(v) => {
                              setRight1Platform(v);
                              // Close cards after platform is selected
                              setActiveCardType(prev => ({ ...prev, right1: null }));
                            }}
                          />
                        )}
                      </div>

                      {/* Row 2: Implant Inclusions - full width */}
                      <ImplantInclusionsField
                        label="Implant inclusions"
                        value={right1Inclusion}
                        quantity={right1InclusionQty}
                        onChange={setRight1Inclusion}
                        onQuantityChange={setRight1InclusionQty}
                      />

                      {/* Row 3: Abutment Detail and Type - 2 columns */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <SelectField
                          label="Abutment Detail"
                          value="Office to provide"
                          options={["Office provided", "Lab provided", "Custom"]}
                          onChange={() => {}}
                        />
                        <SelectField
                          label="Abutment Type"
                          value="Custom Abutment"
                          options={["Stock Abutment", "Custom Abutment", "Multi-Unit abutment"]}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Stage / Stump Shade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput label="Stage" value={selectedStages["fixed_19"] || "Finish"} onClick={() => handleOpenStageModal("fixed_19")} />
                  <ShadeField
                    label="Stump Shade"
                    value="Vita Classical"
                    shade={getSelectedShade("fixed_19", "mandibular", "stump_shade")}
                    onClick={() => handleShadeFieldClick("mandibular", "stump_shade", "fixed_19")}
                  />
                </div>

                {/* Cervical / Incisal / Body Shade */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ShadeField
                    label="Cervical Shade"
                    value="Vita Classical"
                    shade={getSelectedShade("fixed_19", "mandibular", "tooth_shade") || "A2"}
                    onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", "fixed_19")}
                  />
                  <ShadeField
                    label="Incisal Shade"
                    value="Vita Classical"
                    shade={getSelectedShade("fixed_19", "mandibular", "tooth_shade") || "A2"}
                    onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", "fixed_19")}
                  />
                  <ShadeField
                    label="Body Shade"
                    value="Vita Classical"
                    shade={getSelectedShade("fixed_19", "mandibular", "tooth_shade") || "A2"}
                    onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", "fixed_19")}
                  />
                </div>

                {/* Characterization / Intensity / Surface finish */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FieldInput label="Characterization" value="Natural" />
                  <FieldInput label="Intensity" value="2" />
                  <FieldInput label="Surface finish" value="Natural" />
                </div>

                {/* Occlusal Contact / Pontic Design / Embrasures / Proximal Contact */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <IconField label="Occlusal Contact" value="In Occlusion" icon="occlusal" />
                  <IconField label="Pontic Design" value="Modified Ridge" icon="pontic" />
                  <IconField label="Embrasures" value="Type II" icon="embrasures" />
                  <IconField label="Proximal Contact" value="Open Contact" icon="proximal" />
                </div>

                {/* Margin Design / Margin Depth / Occlusal Reduction / Axial Reduction */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <FieldInput label="Margin Design" value="Chamfer" />
                  <FieldInput label="Margin Depth" value="0.1 mm" />
                  <FieldInput label="Occlusal Reduction" value="0.1 mm" />
                  <FieldInput label="Axial Reduction" value="0.1 mm" />
                </div>

                {/* Metal Design / Metal Thickness / Modification */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FieldInput label="Metal Design" value="1/4 metal cusps" />
                  <FieldInput label="Metal Thickness" value="0.2mm" />
                  <FieldInput label="Modification" value="Preserve Anatomy" />
                </div>

                {/* Proximal Contact Mesial / Distal / Functional Guidance */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FieldInput label="Proximal Contact – Mesial" value="Light" />
                  <FieldInput label="Proximal Contact – Distal" value="Light" />
                  <FieldInput label="Functional Guidance" value="Canine guidance" />
                </div>

                {/* Impression / Add ons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput
                    label="Impression"
                    value={getImpressionDisplayText("fixed_19", "mandibular") || "1x STL, 1x PVS, 1x Light body"}
                    onClick={() => handleOpenImpressionModal("mandibular", "fixed_19")}
                  />
                  <FieldInput label="Add ons" value="1x gold tooth, 1x characterization, 1x spe..." onClick={() => handleOpenAddOnsModal("mandibular", "fixed_19")} />
                </div>

                {/* Additional notes */}
                <fieldset className="border border-[#34a853] rounded px-3 pb-2 pt-0">
                  <legend className="text-[11px] text-[#34a853] px-1 leading-none flex items-center gap-1">
                    Additional notes
                    <Check size={12} className="text-[#34a853]" />
                  </legend>
                  <textarea
                    defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident. Sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci."
                    rows={5}
                    className="w-full text-[12px] text-[#1d1d1b] bg-transparent outline-none leading-relaxed resize-none"
                  />
                </fieldset>

                {/* Bottom action buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAttachModal(true)}
                    className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                  >
                    <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                    <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Attach Files (1 uploads)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenRushModal("mandibular", "fixed_19")}
                    className={`relative flex-none w-[123.04px] h-[46.22px] rounded-[5.27px] shadow-[0_0_2.9px_rgba(207,2,2,0.67)] flex items-center justify-center gap-1.5 hover:bg-[#f0f0f0] transition-colors ${rushedProducts["mandibular_fixed_19"] ? "bg-[#CF0202]" : "bg-[#F9F9F9]"}`}
                  >
                    <span className={`font-["Verdana"] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] whitespace-nowrap ${rushedProducts["mandibular_fixed_19"] ? "text-white" : "text-black"}`}>
                      {rushedProducts["mandibular_fixed_19"] ? "Rushed" : "Request Rush"}
                    </span>
                    <Zap className={`w-[8.78px] h-[10.54px] flex-shrink-0 ${rushedProducts["mandibular_fixed_19"] ? "text-white" : "text-[#CF0202]"}`} strokeWidth={0.878154} />
                  </button>
                  <button className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors">
                    <Settings size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                    <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Additional Setting</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dynamically added mandibular products */}
          {addedProducts
            .filter(ap => ap.arch === "mandibular")
            .map(ap => (
            <div key={ap.id} className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3">
              {/* Accordion header */}
              <button
                type="button"
                onClick={() => toggleAddedProductExpanded(ap.id)}
                className="w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] bg-[#DFEEFB] hover:bg-[#d4e8f8]"
              >
                <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {ap.product.image_url ? (
                    <img src={ap.product.image_url} alt={ap.product.name || "Product"} className="w-[61.58px] h-[28.79px] object-contain" />
                  ) : (
                    <div className="w-[61.58px] h-[28.79px] bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-[10px] text-gray-400">No img</span>
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
                      onClick={(e) => { e.stopPropagation(); handleRemoveAddedProduct(ap.id); }}
                      className="ml-1 hover:text-red-500 transition-colors"
                      title="Remove product"
                    >
                      <Trash2 size={9} className="text-[#999999] hover:text-red-500" />
                    </button>
                  </div>
                </div>
                <ChevronDown
                  size={21.6}
                  className={`text-black flex-shrink-0 transition-transform ${ap.expanded ? "rotate-180" : ""}`}
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
                      value={ap.product.category_name || ap.product.category?.name || ""}
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
                        value={ap.arch === "maxillary" ? "Maxillary (Upper)" : "Mandibular (Lower)"}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenAddOnsModal("mandibular", `added_${ap.id}`)}
                      className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                    >
                      <Plus size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                      <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Add ons</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAttachModal(true)}
                      className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                    >
                      <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                      <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Attach Files</span>
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
