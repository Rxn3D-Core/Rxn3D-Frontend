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
  const borderColor = hasValue ? "border-[#34a853]" : "border-[#cf0202]";
  const legendColor = hasValue ? "text-[#34a853]" : "text-[#cf0202]";

  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${borderColor}`}
      onClick={onClick}
    >
      <legend className={`text-[11px] px-1 leading-none whitespace-nowrap ${legendColor}`}>
        {label}
      </legend>
      <div className="flex items-center gap-2 w-full">
        <span className="text-[13px] leading-tight text-[#1d1d1b] flex-1 min-w-0 truncate">{value}</span>
        {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
