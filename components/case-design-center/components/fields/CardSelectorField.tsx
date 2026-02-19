"use client";

import { Check } from "lucide-react";

export function CardSelectorField({
  label,
  value,
  required = false,
  isActive = false,
  onClick,
}: {
  label: string;
  value: string;
  required?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const hasValue = value.trim().length > 0;
  const borderColor = required && !value ? "border-[#cf0202]" : hasValue ? "border-[#34a853]" : "border-[#b4b0b0]";
  const legendColor = required && !value ? "text-[#cf0202] font-semibold" : hasValue ? "text-[#34a853]" : "text-[#7f7f7f]";

  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${borderColor}`}
      onClick={onClick}
    >
      <legend className={`text-[11px] px-1 leading-none whitespace-nowrap ${legendColor}`}>
        {label}
      </legend>
      <div className="flex items-center gap-2 w-full">
        <span className="text-[13px] text-[#1d1d1b] flex-1 truncate">{value || `Select ${label}`}</span>
        {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
