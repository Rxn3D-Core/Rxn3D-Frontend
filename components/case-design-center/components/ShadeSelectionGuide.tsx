"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { ToothShadeSelectionSVG } from "@/components/tooth-shade-selection-svg";
import type { Arch, ShadeFieldType, ShadeSelectionState } from "../types";

interface ShadeSelectionGuideProps {
  arch: Arch;
  shadeSelectionState: ShadeSelectionState;
  setShadeSelectionState: (state: ShadeSelectionState | ((prev: ShadeSelectionState) => ShadeSelectionState)) => void;
  selectedShadeGuide: string;
  showShadeGuideDropdown: boolean;
  setShowShadeGuideDropdown: (v: boolean) => void;
  setSelectedShadeGuide: (v: string) => void;
  shadeGuideOptions: string[];
  getSelectedShade: (productId: string, arch: Arch, fieldType: ShadeFieldType) => string;
  handleShadeSelect: (shade: string) => void;
}

export function ShadeSelectionGuide({
  arch,
  shadeSelectionState,
  setShadeSelectionState,
  selectedShadeGuide,
  showShadeGuideDropdown,
  setShowShadeGuideDropdown,
  setSelectedShadeGuide,
  shadeGuideOptions,
  getSelectedShade,
  handleShadeSelect,
}: ShadeSelectionGuideProps) {
  const currentShade = getSelectedShade(
    shadeSelectionState.productId || '',
    arch,
    shadeSelectionState.fieldType || 'tooth_shade'
  );

  const stumpShade = getSelectedShade(
    shadeSelectionState.productId || '',
    arch,
    'stump_shade'
  );

  const toothShade = getSelectedShade(
    shadeSelectionState.productId || '',
    arch,
    'tooth_shade'
  );

  const bothShadesFilled = !!(stumpShade && toothShade);

  const handleClose = () => {
    if (!bothShadesFilled) return;
    setShadeSelectionState({ arch: null, fieldType: null, productId: null });
  };

  return (
    <div className="mb-4 border border-[#1162A8] rounded-lg p-4 bg-white">
      {/* Header row: title (when no shade selected) + close button */}
      <div className="flex items-center justify-between mb-3">
        {!currentShade ? (
          <h4 className="text-[13px] font-semibold text-[#1d1d1b]">
            Select {shadeSelectionState.fieldType === 'tooth_shade' ? 'Tooth' : 'Stump'} Shade
            <span className="text-[#cf0202]">*</span>
          </h4>
        ) : (
          <div />
        )}
        <button
          onClick={handleClose}
          className={`text-[20px] leading-none ${bothShadesFilled ? 'text-[#7f7f7f] hover:text-[#1d1d1b]' : 'text-[#b4b0b0] cursor-not-allowed'}`}
          title={bothShadesFilled ? 'Close' : 'Fill both Stump Shade and Tooth Shade to close'}
          disabled={!bothShadesFilled}
        >
          &times;
        </button>
      </div>


      {/* Three fields side by side */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Shade Guide Selector Dropdown */}
        <div className="relative">
          <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
            <legend className="text-[11px] text-[#34a853] px-1 leading-none">
              Shade guide selected
            </legend>
            <button
              onClick={() => setShowShadeGuideDropdown(!showShadeGuideDropdown)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-[13px] text-[#1d1d1b]">{selectedShadeGuide}</span>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-[#34a853]" />
                <ChevronDown size={16} className={`text-[#7f7f7f] transition-transform ${showShadeGuideDropdown ? 'rotate-180' : ''}`} />
              </div>
            </button>
          </fieldset>

          {/* Dropdown Menu */}
          {showShadeGuideDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d9d9d9] rounded-lg shadow-lg z-10 overflow-hidden">
              {shadeGuideOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setSelectedShadeGuide(option);
                    setShowShadeGuideDropdown(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-[13px] hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                    selectedShadeGuide === option ? 'bg-gray-50' : ''
                  }`}
                >
                  {selectedShadeGuide === option && (
                    <Check size={16} className="text-[#34a853]" />
                  )}
                  <span className={selectedShadeGuide === option ? 'ml-0' : 'ml-6'}>
                    {option}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stump Shade Field Display */}
        <fieldset
          className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
            stumpShade ? 'border-[#34a853]' : 'border-[#cf0202]'
          }`}
          onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'stump_shade' }))}
        >
          <legend className={`text-[11px] px-1 leading-none ${
            stumpShade ? 'text-[#34a853]' : 'text-[#cf0202]'
          }`}>
            Stump Shade
          </legend>
          <div className="flex items-center gap-2 w-full">
            <span className="text-[13px] text-[#1d1d1b]">
              {stumpShade ? `${selectedShadeGuide} - ${stumpShade}` : ''}
            </span>
            {stumpShade && <Check size={16} className="text-[#34a853] ml-auto" />}
          </div>
        </fieldset>

        {/* Tooth Shade Field Display */}
        <fieldset
          className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
            toothShade ? 'border-[#34a853]' : 'border-[#cf0202]'
          }`}
          onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'tooth_shade' }))}
        >
          <legend className={`text-[11px] px-1 leading-none ${
            toothShade ? 'text-[#34a853]' : 'text-[#cf0202]'
          }`}>
            Tooth Shade
          </legend>
          <div className="flex items-center gap-2 w-full">
            <span className="text-[13px] text-[#1d1d1b]">
              {toothShade ? `${selectedShadeGuide} - ${toothShade}` : ''}
            </span>
            {toothShade && <Check size={16} className="text-[#34a853] ml-auto" />}
          </div>
        </fieldset>
      </div>

      <ToothShadeSelectionSVG
        selectedShades={shadeSelectionState.fieldType ? [getSelectedShade(
          shadeSelectionState.productId || '',
          arch,
          shadeSelectionState.fieldType
        )] : []}
        onShadeClick={handleShadeSelect}
        className="w-full"
      />
    </div>
  );
}
