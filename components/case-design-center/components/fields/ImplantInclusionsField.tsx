"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check } from "@/components/ui/custom-check";

export function ImplantInclusionsField({
  label,
  value,
  quantity,
  onChange,
  onQuantityChange,
  options,
  autoOpenWhenVisible = false,
  caseSubmitted = false,
}: {
  label: string;
  value: string;
  quantity: number;
  onChange: (v: string) => void;
  onQuantityChange: (qty: number) => void;
  /** Dynamic options from advance_fields. When provided, replaces internal hardcoded options. */
  options?: string[];
  autoOpenWhenVisible?: boolean;
  caseSubmitted?: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLFieldSetElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isNoInclusion = value === "No inclusion";
  const isComplete = value.trim().length > 0;
  const borderColor = isComplete && !caseSubmitted ? "border-[#34a853]" : isComplete ? "border-[#b4b0b0]" : "border-[#cf0202]";
  const legendColor = isComplete && !caseSubmitted ? "text-[#34a853]" : isComplete ? "text-[#7f7f7f]" : "text-[#cf0202]";

  // Fall back to the legacy hardcoded option when no API options supplied
  const inclusionOptions: string[] = options && options.length > 0 ? options : ["Model with Tissue + QTY"];

  useEffect(() => {
    if (autoOpenWhenVisible && !value.trim()) {
      setShowDropdown(true);
    }
  }, [autoOpenWhenVisible, value]);

  useEffect(() => {
    if (showDropdown && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const footerHeight = 60;
      const estimatedDropdownHeight = 120;
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

  const displayValue = () => {
    if (!value.trim() || isNoInclusion) return value || "Select...";
    const isQtyOption = inclusionOptions.includes(value);
    if (isQtyOption && quantity >= 1) return `${quantity} X ${value}`;
    return value;
  };

  const dropdown = showDropdown ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-[#b4b0b0] rounded shadow-lg"
    >
      {/* No inclusion */}
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

      {/* Dynamic options — each gets inline quantity controls */}
      {inclusionOptions.map((opt) => (
        <div
          key={opt}
          className="flex items-center justify-between px-3 py-2.5 hover:bg-[#DFEEFB] transition-colors cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (value !== opt) {
              onChange(opt);
              if (quantity === 0) onQuantityChange(1);
            }
          }}
        >
          <span className="text-xs text-[#1d1d1b]">{opt}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (value !== opt) onChange(opt);
                onQuantityChange(Math.max(0, quantity - 1));
              }}
              className="w-8 h-8 rounded border border-[#b4b0b0] bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <span className="text-base text-[#7f7f7f]">−</span>
            </button>
            <span className="text-sm font-semibold text-[#1d1d1b] min-w-[24px] text-center">
              {value === opt ? quantity : 0}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (value !== opt) onChange(opt);
                onQuantityChange(quantity + 1);
              }}
              className="w-8 h-8 rounded border border-[#b4b0b0] bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <span className="text-base text-[#7f7f7f]">+</span>
            </button>
          </div>
        </div>
      ))}
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
            {displayValue()}
          </span>
          {isComplete && !caseSubmitted && (
            <Check size={16} className="text-[#34a853] flex-shrink-0" />
          )}
        </div>
      </fieldset>
      {createPortal(dropdown, document.body)}
    </>
  );
}
