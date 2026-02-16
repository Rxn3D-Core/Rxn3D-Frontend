"use client";

import { Check } from "lucide-react";

export function FieldInput({
  label,
  value,
  className = "",
  onClick,
}: {
  label: string;
  value: string;
  className?: string;
  onClick?: () => void;
}) {
  const hasValue = value.trim().length > 0;
  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center min-w-0 ${hasValue ? "border-[#34a853]" : "border-[#b4b0b0]"} ${onClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""} ${className}`}
      onClick={onClick}
    >
      <legend className={`text-[11px] px-1 leading-none whitespace-nowrap ${hasValue ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
        {label}
      </legend>
      <div className="flex items-center gap-2 min-w-0 w-full">
        <input
          type="text"
          readOnly
          value={value}
          className={`text-[13px] text-[#1d1d1b] bg-transparent outline-none leading-tight min-w-0 flex-1 truncate ${onClick ? "cursor-pointer" : ""}`}
        />
        {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
