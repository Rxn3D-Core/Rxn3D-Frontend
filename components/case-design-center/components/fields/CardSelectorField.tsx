"use client";

import { Check } from "lucide-react";

export function CardSelectorField({
  label,
  value,
  required = false,
  isActive = false,
  onClick,
  caseSubmitted = false,
}: {
  label: string;
  value: string;
  required?: boolean;
  isActive?: boolean;
  onClick?: () => void;
  caseSubmitted?: boolean;
}) {
  const hasValue = value.trim().length > 0;
  const borderColor = hasValue && !caseSubmitted ? "border-[#34a853]" : hasValue ? "border-[#b4b0b0]" : "border-[#cf0202]";
  const legendColor = hasValue && !caseSubmitted ? "text-[#34a853]" : hasValue ? "text-[#7f7f7f]" : "text-[#cf0202]";

  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${borderColor}`}
      onClick={onClick}
    >
      <legend className={`text-sm px-1 leading-none whitespace-nowrap ${legendColor}`}>
        {label}
      </legend>
      <div className="flex items-center gap-2 w-full">
        <span className="text-[14px] sm:text-lg leading-tight text-[#000000] flex-1 min-w-0 truncate">{value}</span>
        {hasValue && !caseSubmitted && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
