"use client";

import { useState, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Check } from "lucide-react";
import type { ProductGumShade } from "../types";

const ITEMS_PER_PAGE = 8;

interface GumShadePickerProps {
  selected?: string | null;
  onSelect: (shade: ProductGumShade) => void;
  gumShades: ProductGumShade[];
}

export function GumShadePicker({ selected, onSelect, gumShades }: GumShadePickerProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [localSelected, setLocalSelected] = useState<string | null>(selected ?? null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get unique brands for the dropdown
  const brands = useMemo(() => {
    const brandMap = new Map<number, ProductGumShade["brand"]>();
    for (const shade of gumShades) {
      if (!brandMap.has(shade.brand.id)) {
        brandMap.set(shade.brand.id, shade.brand);
      }
    }
    return Array.from(brandMap.values()).sort((a, b) => a.sequence - b.sequence);
  }, [gumShades]);

  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  // Filter shades by selected brand, or show all if none selected
  const filteredShades = useMemo(() => {
    if (selectedBrandId === null) return gumShades;
    return gumShades.filter((s) => s.brand.id === selectedBrandId);
  }, [gumShades, selectedBrandId]);

  const totalPages = Math.ceil(filteredShades.length / ITEMS_PER_PAGE);
  const safePageIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));
  const pagedShades = filteredShades.slice(safePageIndex * ITEMS_PER_PAGE, (safePageIndex + 1) * ITEMS_PER_PAGE);

  const canScrollLeft = safePageIndex > 0;
  const canScrollRight = safePageIndex < totalPages - 1;

  // Get current brand label for dropdown
  const currentBrandLabel = selectedBrandId === null
    ? "All Brands"
    : (brands.find((b) => b.id === selectedBrandId)?.system_name || brands.find((b) => b.id === selectedBrandId)?.name || "All Brands");

  if (!gumShades || gumShades.length === 0) return null;

  return (
    <div className="border border-[#1162A8] rounded-lg p-4 bg-white self-stretch flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Brand dropdown */}
        <div className="relative">
          <fieldset
            className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setShowBrandDropdown((v) => !v)}
          >
            <legend className="text-sm px-1 leading-none text-[#34a853]">Shade guide selected</legend>
            <div className="flex items-center gap-2 w-full">
              <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">
                {currentBrandLabel}
              </span>
              <ChevronDown size={16} className="text-[#7f7f7f] flex-shrink-0" />
            </div>
          </fieldset>
          {showBrandDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d9d9d9] rounded-lg shadow-lg z-20 overflow-hidden">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#EFF6FF] transition-colors ${
                  selectedBrandId === null ? "bg-[#EFF6FF] font-medium" : ""
                }`}
                onClick={() => {
                  setSelectedBrandId(null);
                  setPageIndex(0);
                  setShowBrandDropdown(false);
                }}
              >
                All Brands
              </button>
              {brands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[#EFF6FF] transition-colors ${
                    b.id === selectedBrandId ? "bg-[#EFF6FF] font-medium" : ""
                  }`}
                  onClick={() => {
                    setSelectedBrandId(b.id);
                    setPageIndex(0);
                    setShowBrandDropdown(false);
                  }}
                >
                  {b.system_name || b.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Select Gum shade field */}
        <fieldset
          className={`border rounded px-3 py-0 relative h-[42px] flex items-center transition-colors ${
            localSelected ? "border-[#34a853]" : "border-[#CF0202]"
          }`}
        >
          <legend
            className={`text-sm px-1 leading-none ${
              localSelected ? "text-[#34a853]" : "text-[#CF0202]"
            }`}
          >
            {localSelected ? "Gum shade" : "Select Gum shade"}
          </legend>
          <div className="flex items-center gap-2 w-full">
            <span className="text-[14px] sm:text-lg text-[#000000] truncate flex-1">
              {localSelected || ""}
            </span>
            {localSelected && (
              <Check size={16} className="text-[#34a853] ml-auto flex-shrink-0" />
            )}
          </div>
        </fieldset>
      </div>

      {/* Gum shade circles carousel */}
      <div className="relative flex flex-row items-center self-stretch">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center bg-white/90 shadow-md rounded-full border border-[#D9D9D9] hover:bg-gray-50"
          >
            <ChevronLeft size={16} className="text-[#555]" />
          </button>
        )}

        {/* Shade items */}
        <div className="flex flex-row items-start justify-center w-full px-5 py-3.5">
          {pagedShades.map((shade) => {
            const isSelected = localSelected === shade.name;
            return (
              <button
                key={shade.id}
                type="button"
                onClick={() => {
                  setLocalSelected(shade.name);
                  if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                  closeTimerRef.current = setTimeout(() => onSelect(shade), 500);
                }}
                className="flex flex-col items-center justify-center flex-1 min-w-0 py-[7px] gap-[7px]"
              >
                <div className="relative flex-shrink-0" style={{ width: "63px", height: "63px" }}>
                  <div
                    className={`absolute inset-0 rounded-full ${
                      isSelected ? "border-[2px] border-[#1162A8]" : "border-[1.4px] border-[#D9D9D9]"
                    }`}
                  />
                  <div
                    className="absolute rounded-full"
                    style={{
                      backgroundColor: shade.color_code_middle,
                      top: "4.92px",
                      left: "4.92px",
                      width: "53.72px",
                      height: "53.72px",
                    }}
                  />
                </div>
                <span
                  className="text-center text-black tracking-[-0.02em] leading-[15px] w-full px-1"
                  style={{
                    fontFamily: "Verdana, sans-serif",
                    fontSize: "11px",
                  }}
                >
                  {shade.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center bg-white/90 shadow-md rounded-full border border-[#D9D9D9] hover:bg-gray-50"
          >
            <ChevronRight size={16} className="text-[#555]" />
          </button>
        )}
      </div>
    </div>
  );
}
