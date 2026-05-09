"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Image from "next/image";

const PAGE_SIZE = 4;

export interface CardGalleryItem {
  value: string;
  label: string;
  subtitle?: string;
  imageUrl?: string | null;
}

interface CardGalleryProps {
  options: string[] | CardGalleryItem[];
  value: string;
  onChange: (v: string) => void;
}

function normalizeOptions(options: string[] | CardGalleryItem[]): CardGalleryItem[] {
  if (options.length === 0) return [];
  if (typeof options[0] === "string") {
    return (options as string[]).map((o) => ({ value: o, label: o }));
  }
  return options as CardGalleryItem[];
}

export function CardGallery({ options, value, onChange }: CardGalleryProps) {
  const [page, setPage] = useState(0);

  const items = normalizeOptions(options);
  if (items.length === 0) return null;

  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const visible = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
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
        {visible.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(item.value);
            }}
            className={`w-[130px] flex-shrink-0 rounded-xl border-2 transition-all overflow-hidden ${
              value === item.value
                ? "border-[#1162a8] bg-white shadow-md"
                : "border-gray-300 bg-white hover:border-[#1162a8] hover:shadow-sm"
            }`}
          >
            <div className="flex flex-col items-center">
              <div className="w-full h-[80px] bg-gray-100 flex items-center justify-center overflow-hidden">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.label}
                    width={130}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-3xl font-bold text-gray-300">
                    {item.label.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="px-2 py-2 text-center w-full">
                <p className="text-[13px] font-bold text-gray-900 leading-tight truncate">
                  {item.label}
                </p>
                {item.subtitle && (
                  <p className="text-[11px] text-gray-400 leading-tight truncate mt-0.5">
                    {item.subtitle}
                  </p>
                )}
              </div>
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
