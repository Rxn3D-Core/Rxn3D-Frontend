"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check } from "@/components/ui/custom-check";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImplantInclusionsField({
  label,
  value,
  quantity,
  onChange,
  options,
  autoOpenWhenVisible = false,
  caseSubmitted = false,
}: {
  label: string;
  value: string;
  quantity: number;
  /** Apply value + qty in one update so controlled parents never drop either field. */
  onChange: (next: { value: string; quantity: number }) => void;
  /** Dynamic options from advance_fields. When provided, replaces internal hardcoded options. */
  options?: string[];
  autoOpenWhenVisible?: boolean;
  caseSubmitted?: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLFieldSetElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isNoInclusion = value === "No inclusion" || !value.trim();
  const isComplete = value.trim().length > 0;
  const borderColor =
    isComplete && !caseSubmitted
      ? "border-[#34a853]"
      : isComplete
        ? "border-[#b4b0b0]"
        : "border-[#cf0202]";
  const legendColor =
    isComplete && !caseSubmitted
      ? "text-[#34a853]"
      : isComplete
        ? "text-[#7f7f7f]"
        : "text-[#cf0202]";

  const inclusionOptions: string[] =
    options && options.length > 0 ? options : ["Model with Tissue + QTY"];

  useEffect(() => {
    if (autoOpenWhenVisible && !value.trim()) {
      setShowDropdown(true);
    }
  }, [autoOpenWhenVisible, value]);

  useEffect(() => {
    if (showDropdown && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const footerHeight = 60;
      const estimatedDropdownHeight = 160;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward =
        spaceBelow < estimatedDropdownHeight + 8 ||
        rect.bottom > window.innerHeight - footerHeight;

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

  const qtyFor = (opt: string) => (value === opt ? Math.max(0, quantity) : 0);

  const displayValue = () => {
    if (!value.trim() || isNoInclusion) return value.trim() ? value : "Select...";
    const isQtyOption = inclusionOptions.includes(value);
    if (isQtyOption && quantity >= 1) return `${quantity} X ${value}`;
    return value;
  };

  const selectNoInclusion = () => {
    onChange({ value: "No inclusion", quantity: 0 });
    setShowDropdown(false);
  };

  const setOptionQty = (opt: string, nextQty: number) => {
    if (nextQty <= 0) {
      onChange({ value: "No inclusion", quantity: 0 });
      setShowDropdown(false);
      return;
    }
    const isFirstPick = value !== opt || quantity <= 0;
    onChange({ value: opt, quantity: nextQty });
    // Close after the first pick so the open menu cannot cover abutment/other
    // fields. Keep open while bumping qty on an already-selected option.
    if (isFirstPick) setShowDropdown(false);
  };

  const dropdown = showDropdown ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-[#b4b0b0] rounded shadow-lg"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Hide once a qty option is selected — Trash clears instead — so an
          open menu over other fields cannot reset inclusion on a mis-click. */}
      {isNoInclusion ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            selectNoInclusion();
          }}
          className="w-full text-left px-3 py-2.5 text-xs hover:bg-[#DFEEFB] transition-colors text-[#1d1d1b]"
        >
          No inclusion
        </button>
      ) : null}

      {inclusionOptions.map((opt) => {
        const qty = qtyFor(opt);
        return (
          <div
            key={opt}
            className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-[#DFEEFB] transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (qty === 0) setOptionQty(opt, 1);
            }}
          >
            <span className="text-xs text-[#1d1d1b] flex-1 min-w-0">{opt}</span>
            <div
              className="flex items-center gap-0.5 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {qty === 0 ? (
                <button
                  type="button"
                  className="font-['Verdana'] text-xs text-[#7F7F7F] px-1 py-1"
                  onClick={() => setOptionQty(opt, 1)}
                >
                  QTY +
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex items-center justify-center w-7 h-7"
                    aria-label="Remove inclusion"
                    onClick={() => setOptionQty(opt, 0)}
                  >
                    <Trash2 className="w-5 h-5 text-[#CF0202]" strokeWidth={1.83} />
                  </button>
                  {qty > 1 ? (
                    <button
                      type="button"
                      className="flex items-center justify-center w-7 h-7"
                      aria-label="Decrease quantity"
                      onClick={() => setOptionQty(opt, qty - 1)}
                    >
                      <span className="font-['Verdana'] text-sm text-black leading-none">−</span>
                    </button>
                  ) : null}
                  <span className="font-['Verdana'] text-sm text-black min-w-[18px] text-center">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="flex items-center justify-center w-7 h-7"
                    aria-label="Increase quantity"
                    onClick={() => setOptionQty(opt, qty + 1)}
                  >
                    <Plus className="w-5 h-5 text-[#1D1B20]" strokeWidth={1.83} />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <fieldset
        ref={triggerRef}
        className={cn(
          "border rounded px-3 py-0 relative min-w-0 cursor-pointer h-[42px] flex items-center",
          borderColor
        )}
        onClick={() => setShowDropdown((prev) => !prev)}
      >
        <legend className={`text-sm px-1 leading-none whitespace-nowrap ${legendColor}`}>
          {label}
        </legend>
        <div className="flex items-center gap-2 w-full min-w-0">
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
