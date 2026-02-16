"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export function ImplantInclusionsField({
  label,
  value,
  quantity,
  onChange,
  onQuantityChange,
}: {
  label: string;
  value: string;
  quantity: number;
  onChange: (v: string) => void;
  onQuantityChange: (qty: number) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const hasValue = value.trim().length > 0;
  const borderColor = hasValue ? "border-[#34a853]" : "border-[#b4b0b0]";
  const legendColor = hasValue ? "text-[#34a853]" : "text-[#7f7f7f]";

  return (
    <div className="relative">
      <fieldset
        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${borderColor}`}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <legend className={`text-[11px] px-1 leading-none whitespace-nowrap ${legendColor}`}>
          {label}
        </legend>
        <div className="flex items-center gap-2 w-full">
          <span className="text-[13px] text-[#1d1d1b] flex-1 truncate">
            {value === "Model with Tissue + QTY" ? `${quantity}x Model with Tissue` : value || `Select ${label}`}
          </span>
          {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
          <ChevronDown size={16} className={`text-[#7f7f7f] transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`} />
        </div>
      </fieldset>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#b4b0b0] rounded shadow-lg z-50">
          {/* No inclusion option */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("No inclusion");
              setShowDropdown(false);
            }}
            className={`w-full text-left px-3 py-2.5 text-[13px] hover:bg-gray-50 transition-colors ${
              value === "No inclusion" ? 'bg-green-50 text-[#34a853]' : 'text-[#1d1d1b]'
            }`}
          >
            No inclusion
          </button>

          {/* Model with Tissue + inline quantity controls */}
          <div
            className={`flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer ${
              value === "Model with Tissue + QTY" ? 'bg-green-50' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (value !== "Model with Tissue + QTY") {
                onChange("Model with Tissue + QTY");
              }
            }}
          >
            <span className={`text-[13px] ${value === "Model with Tissue + QTY" ? 'text-[#34a853]' : 'text-[#1d1d1b]'}`}>
              Model with Tissue + QTY
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (value !== "Model with Tissue + QTY") onChange("Model with Tissue + QTY");
                  onQuantityChange(Math.max(0, quantity - 1));
                }}
                className="w-8 h-8 rounded border border-[#b4b0b0] bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <span className="text-[16px] text-[#7f7f7f]">−</span>
              </button>
              <span className="text-[14px] font-semibold text-[#1d1d1b] min-w-[24px] text-center">
                {value === "Model with Tissue + QTY" ? quantity : 0}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (value !== "Model with Tissue + QTY") onChange("Model with Tissue + QTY");
                  onQuantityChange(quantity + 1);
                }}
                className="w-8 h-8 rounded border border-[#b4b0b0] bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <span className="text-[16px] text-[#7f7f7f]">+</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
