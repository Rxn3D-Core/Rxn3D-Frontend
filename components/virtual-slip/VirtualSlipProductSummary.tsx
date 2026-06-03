"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { ProductVM } from "@/lib/virtual-slip-view-model";
import { buildVirtualSlipStatusBoxProps } from "@/lib/virtual-slip-extraction-display";
import { hasDisplayValue } from "@/lib/virtual-slip-display";
import { VirtualSlipExtractionStatusBoxes } from "./VirtualSlipExtractionStatusBoxes";

/** A single "Label: Value" detail row (Verdana, #4C4D55). */
function Detail({ label, value }: { label: string; value: string }) {
  if (!hasDisplayValue(value)) return null;
  return (
    <div className="flex items-center gap-[14px] py-[1px] font-sans text-[15.4px] tracking-[-0.02em]">
      <span className="min-w-[129px] font-bold text-[#4C4D55]">{label}:</span>
      <span className="text-[#4C4D55]">{value}</span>
    </div>
  );
}

/** Advance field row — splits multi-part values (per-tooth or sub-fields) for readability. */
function AdvanceFieldDetail({ label, value }: { label: string; value: string }) {
  if (!hasDisplayValue(value)) return null;

  const segments = value.includes("; ")
    ? value.split("; ").filter((part) => hasDisplayValue(part))
    : null;
  const toothSegments =
    !segments && value.includes("#") && value.includes(",")
      ? value.split(",").map((part) => part.trim()).filter(Boolean)
      : null;

  if (segments && segments.length > 1) {
    return (
      <div className="py-[2px] font-sans text-[15.4px] tracking-[-0.02em]">
        <div className="font-bold text-[#4C4D55]">{label}:</div>
        <ul className="mt-1 space-y-[2px] pl-4 text-[#4C4D55]">
          {segments.map((segment) => (
            <li key={segment}>{segment}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (toothSegments && toothSegments.length > 1) {
    return (
      <div className="py-[2px] font-sans text-[15.4px] tracking-[-0.02em]">
        <div className="font-bold text-[#4C4D55]">{label}:</div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 pl-1 text-[#4C4D55]">
          {toothSegments.map((segment) => (
            <span key={segment}>{segment}</span>
          ))}
        </div>
      </div>
    );
  }

  return <Detail label={label} value={value} />;
}

export function VirtualSlipProductSummary({ product }: { product: ProductVM }) {
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const showImplantColumn = product.isImplant && product.implants.length > 0;
  const statusBoxProps = buildVirtualSlipStatusBoxProps(
    product.extractionDisplay,
    product.arch,
    { apiProduct: product.apiProduct },
  );

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

      {statusBoxProps && (
        <div className="mt-[10px] w-full">
          <VirtualSlipExtractionStatusBoxes boxProps={statusBoxProps} />
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
                <AdvanceFieldDetail key={i} label={f.label} value={f.value} />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
