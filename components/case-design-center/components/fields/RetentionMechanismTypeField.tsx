"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function RetentionMechanismTypeField({
  label,
  options,
  selected,
  onChange,
  caseSubmitted = false,
  className = "",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  caseSubmitted?: boolean;
  className?: string;
}) {
  const hasSelection = selected.length > 0;
  const showGreen = hasSelection && !caseSubmitted;

  const toggle = (name: string) => {
    if (caseSubmitted) return;
    if (selected.includes(name)) {
      onChange(selected.filter((s) => s !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  return (
    <fieldset
      className={cn(
        "border rounded px-3 py-2 relative min-h-[42px] flex flex-col justify-center min-w-0",
        showGreen ? "border-[#34a853]" : "border-[#b4b0b0]",
        className
      )}
    >
      <legend
        className={cn(
          "text-sm px-1 leading-none whitespace-nowrap",
          showGreen ? "text-[#34a853]" : "text-[#7f7f7f]"
        )}
      >
        {label}
      </legend>
      <div className="flex items-center gap-2 w-full min-h-[26px]">
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {options.map((opt) => {
            const isOn = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                disabled={caseSubmitted}
                onClick={() => toggle(opt)}
                className={cn(
                  "px-2.5 py-0.5 rounded-md text-sm font-medium border transition-colors",
                  isOn
                    ? "bg-[#1162a8] border-[#1162a8] text-white"
                    : "bg-white border-[#b4b0b0] text-[#000000] hover:border-[#1162a8] hover:text-[#1162a8]",
                  caseSubmitted && "cursor-default opacity-90"
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {showGreen && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
