"use client";

import { Check } from "@/components/ui/custom-check";
import { getShadePreviewCode } from "../../utils/shadeFieldDisplay";
import { TeethShadePreviewIcon } from "../TeethShadePreviewIcon";

export function ShadeField({
  label,
  value,
  shade,
  onClick,
  submitted = false,
  required = false,
  isActive = false,
  className = "",
}: {
  label: string;
  value: string;
  shade?: string;
  onClick?: () => void;
  submitted?: boolean;
  required?: boolean;
  /** Highlight when this field is the one open in the shade picker */
  isActive?: boolean;
  className?: string;
}) {
  const displayShade = shade || "";
  const previewCode = getShadePreviewCode(displayShade || value) || displayShade || value;
  // While the shade guide is open, show only the shade code (e.g. "C1") —
  // brand/system name is already on the adjacent "Shade guide selected" field.
  const displayText = isActive && previewCode ? previewCode : value;
  const hasValue = value.trim().length > 0 || displayShade.trim().length > 0;
  const showGreen = hasValue && !submitted && !isActive;
  const showRed = required && !hasValue && !submitted && !isActive;
  const borderColor = isActive
    ? "border-[#1162A8] border-2 shadow-[0_0_0_2px_rgba(17,98,168,0.2)] bg-[#f0f7fc]"
    : showGreen
      ? "border-[#34a853]"
      : showRed
        ? "border-[#CF0202]"
        : "border-[#b4b0b0]";
  const legendColor = isActive
    ? "text-[#1162A8] font-semibold"
    : showGreen
      ? "text-[#34a853]"
      : showRed
        ? "text-[#CF0202]"
        : "text-[#7f7f7f]";
  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center min-w-0 w-full overflow-hidden ${borderColor} ${onClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""} ${isActive ? "hover:bg-[#f0f7fc]" : ""} ${className}`}
      onClick={onClick}
      aria-current={isActive ? "true" : undefined}
    >
      <legend className={`text-sm px-1 leading-none ${legendColor}`}>
        {isActive ? `${label} — selecting` : label}
      </legend>
      <div className="flex items-center gap-2 w-full min-w-0">
        <span
          className={`text-lg leading-tight truncate flex-1 min-w-0 ${isActive ? "text-[#1162A8] font-medium" : "text-[#000000]"}`}
          title={value || undefined}
        >
          {displayText}
        </span>
        {previewCode && <TeethShadePreviewIcon shadeCode={previewCode} />}

        {showGreen && <Check size={16} className="text-[#34a853] flex-shrink-0 ml-auto" />}
      </div>
    </fieldset>
  );
}
