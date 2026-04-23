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

  // The active field is tracked by the hook; default to stump_shade if not yet set
  const activeField: ShadeFieldType = shadeSelectionState.fieldType ?? (toothShadeOnly ? 'tooth_shade' : 'stump_shade');

  const activeShade = getSelectedShade(
    shadeSelectionState.productId || '',
    arch,
    activeField
  );

  return (
    <div className="mb-4 border border-[#1162A8] rounded-lg p-4 bg-white">
      <div className="relative">
        {/* Fields grid */}
        <div className={`grid ${!selectedShadeGuide ? 'grid-cols-1' : toothShadeOnly ? 'grid-cols-2' : stumpShade ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-3`}>
        {/* Shade Guide Selector Dropdown */}
        <div className="relative">
          <fieldset className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${selectedShadeGuide ? 'border-[#34a853]' : 'border-[#cf0202]'}`}>
            <legend className={`text-sm px-1 leading-none ${selectedShadeGuide ? 'text-[#34a853]' : 'text-[#cf0202]'}`}>
              {selectedShadeGuide ? 'Shade guide selected' : 'Select Shade Guide'}
            </legend>
            <button
              onClick={() => setShowShadeGuideDropdown(!showShadeGuideDropdown)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-lg text-[#000000]">{selectedShadeGuide || ''}</span>
              <div className="flex items-center gap-2">
                {selectedShadeGuide && <Check size={16} className="text-[#34a853]" />}
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

        {/* Only show shade fields after a shade guide is selected */}
        {selectedShadeGuide && (
          <>
            {/* Tooth-shade-only mode (removable products): show Tooth Shade directly */}
            {toothShadeOnly ? (
              toothShade ? (
                <div
                  className="relative border border-[#34a853] rounded h-[42px] flex items-center px-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'tooth_shade' }))}
                >
                  <label className="absolute left-3 top-0 -translate-y-1/2 text-xs bg-white px-1 pointer-events-none text-[#34a853]">
                    Tooth Shade
                  </label>
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-base text-[#000000]">{`${selectedShadeGuide} - ${toothShade}`}</span>
                    <Check size={16} className="text-[#34a853] ml-auto" />
                  </div>
                </div>
              ) : (
                <span
                  className="text-[#cf0202] text-base font-medium flex items-center cursor-pointer"
                  onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'tooth_shade' }))}
                >
                  Select tooth shade
                </span>
              )
            ) : (
              <>
                {/* Stump Shade Field — shown after shade guide selected */}
                {stumpShade ? (
                  <div
                    className="relative border border-[#34a853] rounded h-[42px] flex items-center px-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'stump_shade' }))}
                  >
                    <label className="absolute left-3 top-0 -translate-y-1/2 text-xs bg-white px-1 pointer-events-none text-[#34a853]">
                      Stump Shade
                    </label>
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-base text-[#000000]">{`${selectedShadeGuide} - ${stumpShade}`}</span>
                      <Check size={16} className="text-[#34a853] ml-auto" />
                    </div>
                  </div>
                ) : (
                  <span
                    className="text-[#cf0202] text-base font-medium flex items-center cursor-pointer"
                    onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'stump_shade' }))}
                  >
                    Select stump shade
                  </span>
                )}

                {/* Tooth Shade Field — only shown after stump shade is filled */}
                {stumpShade && (
                  toothShade ? (
                    <div
                      className="relative border border-[#34a853] rounded h-[42px] flex items-center px-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'tooth_shade' }))}
                    >
                      <label className="absolute left-3 top-0 -translate-y-1/2 text-xs bg-white px-1 pointer-events-none text-[#34a853]">
                        Tooth Shade
                      </label>
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-base text-[#000000]">{`${selectedShadeGuide} - ${toothShade}`}</span>
                        <Check size={16} className="text-[#34a853] ml-auto" />
                      </div>
                    </div>
                  ) : (
                    <span
                      className="text-[#cf0202] text-base font-medium flex items-center cursor-pointer"
                      onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'tooth_shade' }))}
                    >
                      Select tooth shade
                    </span>
                  )
                )}
              </>
            )}
          </>
        )}
      </div>

        {/* Shade guide image — only shown after user selects a shade guide */}
        {selectedShadeGuide && (
          <ToothShadeSelectionSVG
            selectedShades={activeShade ? [activeShade] : []}
            onShadeClick={handleShadeSelect}
            className="w-full"
          />
        )}
      </div>
    </div>
  );
}
