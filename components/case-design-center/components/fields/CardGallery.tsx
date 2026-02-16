"use client";

import { ChevronDown } from "lucide-react";

export function CardGallery({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="col-span-full mt-3 mb-3">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button
          type="button"
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-shadow"
        >
          <ChevronDown size={20} className="text-[#7f7f7f] rotate-90" />
        </button>

        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(option);
            }}
            className={`flex-shrink-0 w-[160px] h-[180px] rounded-xl border-2 transition-all ${
              value === option
                ? 'border-[#34a853] bg-white shadow-md'
                : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
            }`}
          >
            <div className="flex flex-col items-center justify-center h-full p-4">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                <span className="text-4xl font-bold text-gray-400">
                  {option.charAt(0)}
                </span>
              </div>
              <span className="text-sm font-medium text-center text-gray-900 px-2">
                {option}
              </span>
            </div>
          </button>
        ))}

        <button
          type="button"
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-shadow"
        >
          <ChevronDown size={20} className="text-[#7f7f7f] -rotate-90" />
        </button>
      </div>
    </div>
  );
}
