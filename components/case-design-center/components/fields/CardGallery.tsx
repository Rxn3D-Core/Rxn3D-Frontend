"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const PAGE_SIZE = 4;

export function CardGallery({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [page, setPage] = useState(0);

  if (options.length === 0) return null;

  const totalPages = Math.ceil(options.length / PAGE_SIZE);
  const visible = options.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setPage((p) => p - 1)}
        disabled={!canPrev}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-shadow disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronDown size={20} className="text-[#7f7f7f] rotate-90" />
      </button>

      <div className="flex gap-3 flex-1 justify-center">
        {visible.map((option) => (
          <button
            key={option}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(option);
            }}
            className={`w-[120px] h-[120px] flex-shrink-0 rounded-xl border-2 transition-all ${
              value === option
                ? "border-[#1162a8] bg-white shadow-md"
                : "border-gray-300 bg-white hover:border-[#1162a8] hover:shadow-sm"
            }`}
          >
            <div className="flex flex-col items-center justify-center h-full p-3">
              <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-gray-400">
                  {option.charAt(0)}
                </span>
              </div>
              <span className="text-xs font-medium text-center text-gray-900 px-1 leading-tight">
                {option}
              </span>
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPage((p) => p + 1)}
        disabled={!canNext}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-shadow disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronDown size={20} className="text-[#7f7f7f] -rotate-90" />
      </button>
    </div>
  );
}
