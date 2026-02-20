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
  const borderColor = hasValue ? "border-[#34a853]" : "border-[#cf0202]";
  const legendColor = hasValue ? "text-[#34a853]" : "text-[#cf0202]";
  return (
    <fieldset className={`border rounded px-3 pb-2 pt-0 relative min-w-0 ${borderColor}`}>
      <legend className={`text-[11px] px-1 leading-none whitespace-nowrap ${legendColor}`}>
        {label}
      </legend>
      <div className="flex items-center gap-1 min-w-0 w-full">
        <Select
          value={value || "__empty__"}
          onValueChange={(v) => onChange(v === "__empty__" ? "" : v)}
        >
          <SelectTrigger className="flex-1 text-[13px] text-[#1d1d1b] bg-transparent border-0 shadow-none outline-none leading-tight cursor-pointer min-w-0 h-auto py-1 px-0 focus:ring-0 [&>span]:truncate">
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent className="z-[10050]">
            <SelectItem value="__empty__">
              {" "}
            </SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
