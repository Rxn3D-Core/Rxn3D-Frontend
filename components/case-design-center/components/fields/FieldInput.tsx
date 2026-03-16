"use client";

import { Check } from "lucide-react";
import { useState } from "react";

/** Derives the dynamic hint text for the patient name field based on typed value. */
function getPatientNameHint(value: string, baseLabel: string): string {
  const trimmed = value.trimStart();
  const words = trimmed.split(/\s+/);
  const firstWord = words[0] ?? "";
  const secondWord = words[1] ?? "";

  // 3rd letter of 2nd word → back to base label
  if (secondWord.length >= 3) return baseLabel;

  // 3rd letter of first word → prompt for last name
  if (firstWord.length >= 3) return "enter patient's last name";

  // 1st letter of first word → prompt for full name
  if (firstWord.length >= 1) return "enter patient's full name";

  return baseLabel;
}

export function FieldInput({
  label,
  value,
  className = "",
  onClick,
  submitted = false,
  onChange,
  smartPatientLabel = false,
}: {
  label: string;
  value: string;
  className?: string;
  onClick?: () => void;
  submitted?: boolean;
  onChange?: (value: string) => void;
  /** When true, applies smart dynamic floating hint logic for the patient name input. */
  smartPatientLabel?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value.trim().length > 0;
  const showGreen = hasValue && !submitted;
  const isEditable = !!onChange && !submitted;

  // The legend (floating label) updates dynamically when smartPatientLabel is active
  const legendLabel = smartPatientLabel && !submitted
    ? getPatientNameHint(value, label)
    : label;

  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center min-w-0 ${showGreen ? "border-[#34a853]" : isFocused ? "border-[#1162a8]" : "border-[#b4b0b0]"} ${onClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""} ${className}`}
      onClick={onClick}
    >
      <legend className={`text-sm px-1 leading-none whitespace-nowrap transition-colors duration-150 ${showGreen ? "text-[#34a853]" : isFocused ? "text-[#1162a8]" : "text-[#7f7f7f]"}`}>
        {legendLabel}
      </legend>
      <div className="flex items-center gap-2 min-w-0 w-full">
        <input
          type="text"
          readOnly={!isEditable}
          value={value}
          onChange={isEditable ? (e) => onChange(e.target.value) : undefined}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`text-lg font-normal text-[#000000] bg-transparent outline-none leading-tight min-w-0 flex-1 truncate ${onClick ? "cursor-pointer" : ""}`}
        />
        {showGreen && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
