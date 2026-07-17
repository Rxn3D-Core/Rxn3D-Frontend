"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { ProductVM } from "@/lib/virtual-slip-view-model";
import { buildVirtualSlipStatusBoxProps } from "@/lib/virtual-slip-extraction-display";
import { hasDisplayValue } from "@/lib/virtual-slip-display";
import { VirtualSlipExtractionStatusBoxes } from "./VirtualSlipExtractionStatusBoxes";
import { VirtualSlipImplantDetailsAccordion } from "./VirtualSlipImplantDetailsAccordion";

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
    <div className="mt-1">
      {/* Thumbnail | title + status boxes (virtual slip wireframe layout) */}
      <div className="flex items-stretch gap-[10px]">
        <div className="relative w-[150px] shrink-0 self-stretch overflow-hidden rounded-[6px] bg-black min-h-[72px]">
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
        <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
          <div className={`relative flex min-h-[72px] flex-1 flex-col items-center justify-center gap-3 rounded-[7px] border pb-3 py-0 text-center ${product.isRush ? "border-red-400 bg-red-50" : "border-[#D3D3D3]"}`}>
            {product.isRush && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/icons/virtual-slip-center/rush.svg"
                alt="Rush"
                width={28}
                height={28}
                className="absolute right-2 top-2 h-7 w-7 object-contain"
              />
            )}
            <div className="font-sans text-[20px] font-medium leading-[22px] tracking-[0.01em] text-[#666666]">
              {product.title}
            </div>
            {product.teethLabel && (
              <div className="font-sans text-[20px] leading-[22px] tracking-[-0.02em] text-[#666666]">
                {product.teethLabel}
              </div>
            )}
          </div>
          {statusBoxProps && (
            <VirtualSlipExtractionStatusBoxes boxProps={statusBoxProps} />
          )}
        </div>
      </div>

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
          <VirtualSlipImplantDetailsAccordion implants={product.implants} />
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
