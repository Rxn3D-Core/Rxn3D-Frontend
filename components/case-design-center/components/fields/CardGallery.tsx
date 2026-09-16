"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Upload } from "lucide-react";
import Image from "next/image";

/** Approximate card width + gap used when scrolling via chevrons. */
const CARD_SCROLL_STEP = 146;

export interface CardGalleryItem {
  value: string;
  label: string;
  subtitle?: string;
  imageUrl?: string | null;
  variant?: "default" | "upload";
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const items = normalizeOptions(options);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      setCanPrev(false);
      setCanNext(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(maxScroll - el.scrollLeft > 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    el.scrollLeft = 0;
    updateScrollState();

    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateScrollState);
    };
  }, [items, updateScrollState]);

  if (items.length === 0) return null;

  const scrollByDir = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({
      left: dir * CARD_SCROLL_STEP * 2,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex items-center gap-2 min-w-0 w-full">
      <button
        type="button"
        onClick={() => scrollByDir(-1)}
        disabled={!canPrev}
        aria-label="Scroll implant brands left"
        className="flex-shrink-0 w-9 h-9 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-shadow disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronDown size={18} className="text-[#7f7f7f] rotate-90" />
      </button>

      <div
        ref={scrollerRef}
        className="flex gap-3 flex-1 min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth py-1 [scrollbar-width:thin]"
      >
        {items.map((item) => (
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
                {item.variant === "upload" ? (
                  <Upload size={28} className="text-gray-500" />
                ) : item.imageUrl ? (
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
              <div className="px-1.5 py-2 text-center w-full">
                <p
                  className={`font-bold text-gray-900 leading-[1.15] whitespace-normal break-words ${
                    item.variant === "upload" ? "text-[11px] min-h-[2.4em]" : "text-[13px]"
                  }`}
                  title={item.label}
                >
                  {item.label}
                </p>
                {item.subtitle && (
                  <p className="text-[11px] text-gray-400 leading-tight truncate mt-0.5" title={item.subtitle}>
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
        onClick={() => scrollByDir(1)}
        disabled={!canNext}
        aria-label="Scroll implant brands right"
        className="flex-shrink-0 w-9 h-9 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-shadow disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronDown size={18} className="text-[#7f7f7f] -rotate-90" />
      </button>
    </div>
  );
}
