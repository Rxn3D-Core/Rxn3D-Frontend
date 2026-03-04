"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

export function ImplantInclusionsField({
  label,
  value,
  quantity,
  onChange,
  onQuantityChange,
  autoOpenWhenVisible = false,
  caseSubmitted = false,
}: {
  label: string;
  value: string;
  quantity: number;
  onChange: (v: string) => void;
  onQuantityChange: (qty: number) => void;
  /** When true, open the dropdown automatically when the field is shown (e.g. when no value yet). */
  autoOpenWhenVisible?: boolean;
  caseSubmitted?: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLFieldSetElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasValue = value.trim().length > 0;
  const borderColor = hasValue && !caseSubmitted ? "border-[#34a853]" : hasValue ? "border-[#b4b0b0]" : "border-[#cf0202]";
  const legendColor = hasValue && !caseSubmitted ? "text-[#34a853]" : hasValue ? "text-[#7f7f7f]" : "text-[#cf0202]";

  // Auto-open dropdown when field is shown and has no value yet
  useEffect(() => {
    if (autoOpenWhenVisible && !value.trim()) {
      setShowDropdown(true);
    }
  }, [autoOpenWhenVisible, value]);

  useEffect(() => {
    if (showDropdown && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const footerHeight = 60;
      const estimatedDropdownHeight = 110;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < estimatedDropdownHeight + 8 || rect.bottom > window.innerHeight - footerHeight;

      setDropdownStyle({
        position: "fixed",
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width }
          : { top: rect.bottom + 4, left: rect.left, width: rect.width }),
        zIndex: 10050,
      });
    }
  }, [showDropdown]);

  // Close on outside click (don't close when clicking trigger or dropdown content)
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const dropdown = showDropdown ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-[#b4b0b0] rounded shadow-lg"
    >
          {/* No inclusion option */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("No inclusion");
              setShowDropdown(false);
            }}
            className="w-full text-left px-3 py-2.5 text-xs hover:bg-[#DFEEFB] transition-colors text-[#1d1d1b]"
          >
            No inclusion
          </button>

          {/* Model with Tissue + inline quantity controls */}
          <div
            className="flex items-center justify-between px-3 py-2.5 hover:bg-[#DFEEFB] transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (value !== "Model with Tissue + QTY") {
                onChange("Model with Tissue + QTY");
                if (quantity === 0) onQuantityChange(1);
              }
            }}
          >
            <span className="text-xs text-[#1d1d1b]">
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
                <span className="text-base text-[#7f7f7f]">−</span>
              </button>
              <span className="text-sm font-semibold text-[#1d1d1b] min-w-[24px] text-center">
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
                <span className="text-base text-[#7f7f7f]">+</span>
              </button>
            </div>
          </div>
        </div>
  ) : null;

  return (
    <>
      <fieldset
        ref={triggerRef}
        className={`border rounded px-3 py-0 relative min-w-0 cursor-pointer h-[42px] flex items-center ${borderColor}`}
        onClick={() => setShowDropdown((prev) => !prev)}
      >
        <legend className={`text-sm px-1 leading-none whitespace-nowrap ${legendColor}`}>
          {label}
        </legend>
        <div className="flex items-center gap-2 w-full min-h-0">
          <span className="text-[14px] sm:text-lg leading-tight text-[#000000] flex-1 min-w-0 truncate">
            {value === "Model with Tissue + QTY" && quantity >= 1
              ? `${quantity} X Model with Tissue + QTY`
              : value || "Select..."}
          </span>
          {hasValue && !caseSubmitted && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
        </div>
      </fieldset>
      {createPortal(dropdown, document.body)}
    </>
  );
}
