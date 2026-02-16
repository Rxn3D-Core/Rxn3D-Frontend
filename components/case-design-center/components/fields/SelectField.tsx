"use client";

import { Check } from "lucide-react";

export function SelectField({
  label,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const hasValue = value.trim().length > 0;
  const borderColor = required && !value ? "border-[#cf0202]" : hasValue ? "border-[#34a853]" : "border-[#b4b0b0]";
  const legendColor = required && !value ? "text-[#cf0202] font-semibold" : hasValue ? "text-[#34a853]" : "text-[#7f7f7f]";
  return (
    <fieldset className={`border rounded px-3 pb-2 pt-0 relative min-w-0 ${borderColor}`}>
      <legend className={`text-[11px] px-1 leading-none whitespace-nowrap ${legendColor}`}>
        {label}
      </legend>
      <div className="flex items-center gap-1 min-w-0 w-full">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-[13px] text-[#1d1d1b] bg-transparent outline-none leading-tight cursor-pointer min-w-0 truncate"
        >
          {!value && <option value="">Select {label.replace("Select ", "")}</option>}
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
