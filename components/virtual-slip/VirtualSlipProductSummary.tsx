"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { ProductVM } from "@/lib/virtual-slip-view-model";

/** A single "Label: Value" detail row (Verdana, #4C4D55). */
function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-[14px] py-[1px] font-sans text-[15.4px] tracking-[-0.02em]">
      <span className="min-w-[129px] font-bold text-[#4C4D55]">{label}:</span>
      <span className="text-[#4C4D55]">{value}</span>
    </div>
  );
}

/** A colored teeth chip (Missing / Will extract / Clasp). */
function TeethChip({
  label,
  teeth,
  bg,
  text = "#000000",
}: {
  label: string;
  teeth: number[];
  bg: string;
  text?: string;
}) {
  if (teeth.length === 0) return null;
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[6px] px-[10px] py-[6px] text-center font-sans text-[14px] leading-[18px] tracking-[-0.02em] shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]"
      style={{ background: bg, color: text }}
    >
      <span>{label}</span>
      <span>#{teeth.join(",")}</span>
    </div>
  );
}

export function VirtualSlipProductSummary({ product }: { product: ProductVM }) {
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const showImplantColumn = product.isImplant && product.implants.length > 0;

  return (
    <div className="mt-5">
      {/* Title row: thumbnail + bordered product title box */}
      <div className="flex items-stretch gap-[10px]">
        <div className="relative h-[99px] w-[142px] shrink-0 overflow-hidden rounded-[6px] bg-black">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              fill
              className="object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-[8px] rounded-[7px] border border-[#D3D3D3] px-4 py-2 text-center">
          <div className="font-sans text-[20px] font-medium leading-[20px] tracking-[0.01em] text-[#666666]">
            {product.title}
          </div>
          {product.teethLabel && (
            <div className="font-sans text-[20px] leading-[20px] tracking-[-0.02em] text-[#666666]">
              {product.teethLabel}
            </div>
          )}
        </div>
      </div>

      {/* Missing / will-extract chips */}
      {(product.missingTeeth.length > 0 || product.willExtractTeeth.length > 0) && (
        <div className="mt-[10px] flex flex-wrap items-center gap-[10px]">
          <TeethChip label="Missing teeth" teeth={product.missingTeeth} bg="#D3D3D3" />
          <TeethChip
            label="Will extract on delivery"
            teeth={product.willExtractTeeth}
            bg="#E92520"
            text="#FFFFFF"
          />
        </div>
      )}

      <hr className="my-[10px] border-[#4C4D55]/40" />

      {/* Details — two columns when implant data is present */}
      <div className={showImplantColumn ? "grid grid-cols-2 gap-x-10" : ""}>
        <div>
          <Detail label="Restoration" value={product.restoration} />
          <Detail label="Product" value={product.productName} />
          <Detail label="Grade" value={product.grade} />
          <Detail label="Stage" value={product.stage} />
          <Detail label="Teeth Shade" value={product.teethShade} />
          <Detail label="Stump Shade" value={product.stumpShade} />
          <Detail label="Gum Shade" value={product.gumShade} />
          <Detail label="Impression" value={product.impression} />
          {product.addOns.length > 0 && (
            <Detail label="Add on" value={product.addOns.join(", ")} />
          )}
        </div>

        {showImplantColumn && (
          <div className="space-y-3">
            {product.implants.map((imp) => (
              <div key={imp.toothNumber}>
                {imp.toothNumber > 0 && (
                  <p className="mb-1 font-sans text-[13px] font-bold text-[#4C4D55]">
                    #{imp.toothNumber}
                  </p>
                )}
                <Detail label="Implant Brand" value={imp.brand} />
                <Detail label="Implant Platform" value={imp.platform} />
                <Detail label="Implant Size" value={imp.size} />
                <Detail label="Abutment Type" value={imp.abutmentType} />
                <Detail label="Abutment Option" value={imp.abutmentOption} />
                <Detail label="Retention" value={imp.retentionMechanism} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advance Mode configuration expander */}
      {product.advanceFields.length > 0 && (
        <div className="mt-3 border-t border-dashed border-[#d1d5db] pt-2">
          <button
            type="button"
            onClick={() => setAdvanceOpen((v) => !v)}
            className="flex items-center gap-1 font-sans text-[14px] font-bold text-[#4C4D55]"
          >
            Advance Mode configuration
            <ChevronDown
              size={16}
              className={`transition-transform ${advanceOpen ? "rotate-180" : ""}`}
            />
          </button>
          {advanceOpen && (
            <div className="mt-2">
              {product.advanceFields.map((f, i) => (
                <Detail key={i} label={f.label} value={f.value} />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
