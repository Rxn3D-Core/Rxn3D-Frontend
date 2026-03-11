"use client";

import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SelectField({
  label,
  emptyLabel,
  value,
  options,
  onChange,
  required = false,
  open,
  onOpenChange,
  caseSubmitted = false,
  className = "",
}: {
  label: string;
  /** Label to show when no value is selected. Defaults to label. */
  emptyLabel?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  required?: boolean;
  /** When set, controls the dropdown open state (e.g. for auto-open when field appears). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  caseSubmitted?: boolean;
  className?: string;
}) {
  const hasValue = value.trim().length > 0;
  const borderColor = hasValue && !caseSubmitted ? "border-[#34a853]" : hasValue ? "border-[#b4b0b0]" : "border-[#cf0202]";
  const legendColor = hasValue && !caseSubmitted ? "text-[#34a853]" : hasValue ? "text-[#7f7f7f]" : "text-[#cf0202]";
  const displayLabel = !hasValue && emptyLabel ? emptyLabel : label;
  return (
    <fieldset className={`border rounded px-3 py-0 relative min-w-0 h-[42px] flex items-center ${borderColor} ${className}`}>
      <legend className={`text-sm px-1 leading-none whitespace-nowrap ${legendColor}`}>
        {displayLabel}
      </legend>
      <div className="flex items-center gap-1 min-w-0 w-full">
        <Select
          value={value || undefined}
          onValueChange={(v) => onChange(v)}
          open={open}
          onOpenChange={onOpenChange}
        >
          <SelectTrigger className="flex-1 text-[14px] sm:text-lg text-[#000000] bg-transparent border-0 shadow-none outline-none leading-tight cursor-pointer min-w-0 h-auto py-1 px-0 focus:ring-0 [&>span]:truncate [&>svg]:hidden">
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent className="z-[10050]">
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasValue && !caseSubmitted && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
