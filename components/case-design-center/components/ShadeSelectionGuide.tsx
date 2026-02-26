"use client";

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

  // When opened directly as tooth_shade (e.g. removable products), stump shade is not required
  const toothShadeOnly = shadeSelectionState.fieldType === 'tooth_shade' && !stumpShade;

  const canClose = toothShadeOnly ? !!toothShade : !!(stumpShade && toothShade);

  // The active field is tracked by the hook; default to stump_shade if not yet set
  const activeField: ShadeFieldType = shadeSelectionState.fieldType ?? (toothShadeOnly ? 'tooth_shade' : 'stump_shade');

  const handleClose = () => {
    if (!canClose) return;
    setShadeSelectionState({ arch: null, fieldType: null, productId: null });
  };

  const activeShade = getSelectedShade(
    shadeSelectionState.productId || '',
    arch,
    activeField
  );

  return (
    <div className="mb-4 border border-[#1162A8] rounded-lg p-4 bg-white">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-base font-semibold text-[#1d1d1b]">
          Select {activeField === 'tooth_shade' ? 'Tooth' : 'Stump'} Shade
          <span className="text-[#cf0202]">*</span>
        </h4>
        <button
          onClick={handleClose}
          className={`text-xl leading-none ${canClose ? 'text-[#7f7f7f] hover:text-[#1d1d1b]' : 'text-[#b4b0b0] cursor-not-allowed'}`}
          title={canClose ? 'Close' : toothShadeOnly ? 'Select a Tooth Shade to close' : 'Fill both Stump Shade and Tooth Shade to close'}
          disabled={!canClose}
        >
          &times;
        </button>
      </div>

      {/* Fields grid */}
      <div className={`grid ${toothShadeOnly ? 'grid-cols-2' : stumpShade ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-3`}>
        {/* Shade Guide Selector Dropdown */}
        <div className="relative">
          <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
            <legend className="text-sm text-[#34a853] px-1 leading-none">
              Shade guide selected
            </legend>
            <button
              onClick={() => setShowShadeGuideDropdown(!showShadeGuideDropdown)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-lg text-[#000000]">{selectedShadeGuide}</span>
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
                  className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${
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

        {/* Tooth-shade-only mode (removable products): show Tooth Shade directly */}
        {toothShadeOnly ? (
          <fieldset
            className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
              toothShade ? 'border-[#34a853]' : 'border-[#cf0202]'
            } ${activeField === 'tooth_shade' ? 'ring-2 ring-[#1162A8] ring-offset-1' : ''}`}
            onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'tooth_shade' }))}
          >
            <legend className={`text-sm px-1 leading-none ${
              toothShade ? 'text-[#34a853]' : 'text-[#cf0202]'
            }`}>
              Tooth Shade
            </legend>
            <div className="flex items-center gap-2 w-full">
              <span className="text-lg text-[#000000]">
                {toothShade ? `${selectedShadeGuide} - ${toothShade}` : ''}
              </span>
              {toothShade && <Check size={16} className="text-[#34a853] ml-auto" />}
            </div>
          </fieldset>
        ) : (
          <>
            {/* Stump Shade Field — always visible for fixed products, clickable to re-select */}
            <fieldset
              className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                stumpShade ? 'border-[#34a853]' : 'border-[#cf0202]'
              } ${activeField === 'stump_shade' ? 'ring-2 ring-[#1162A8] ring-offset-1' : ''}`}
              onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'stump_shade' }))}
            >
              <legend className={`text-sm px-1 leading-none ${
                stumpShade ? 'text-[#34a853]' : 'text-[#cf0202]'
              }`}>
                Stump Shade
              </legend>
              <div className="flex items-center gap-2 w-full">
                <span className="text-lg text-[#000000]">
                  {stumpShade ? `${selectedShadeGuide} - ${stumpShade}` : ''}
                </span>
                {stumpShade && <Check size={16} className="text-[#34a853] ml-auto" />}
              </div>
            </fieldset>

            {/* Tooth Shade Field — only shown after stump shade is filled */}
            {stumpShade && (
              <fieldset
                className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                  toothShade ? 'border-[#34a853]' : 'border-[#cf0202]'
                } ${activeField === 'tooth_shade' ? 'ring-2 ring-[#1162A8] ring-offset-1' : ''}`}
                onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'tooth_shade' }))}
              >
                <legend className={`text-sm px-1 leading-none ${
                  toothShade ? 'text-[#34a853]' : 'text-[#cf0202]'
                }`}>
                  Tooth Shade
                </legend>
                <div className="flex items-center gap-2 w-full">
                  <span className="text-lg text-[#000000]">
                    {toothShade ? `${selectedShadeGuide} - ${toothShade}` : ''}
                  </span>
                  {toothShade && <Check size={16} className="text-[#34a853] ml-auto" />}
                </div>
              </fieldset>
            )}
          </>
        )}
      </div>

      {/* Shade guide image — always shown for the active field */}
      <ToothShadeSelectionSVG
        selectedShades={activeShade ? [activeShade] : []}
        onShadeClick={handleShadeSelect}
        className="w-full"
      />
    </div>
  );
}
