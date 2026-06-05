"use client";

import {
  buildVirtualSlipStatusBoxProps,
  type OpposingArchVM,
} from "@/lib/virtual-slip-extraction-display";
import { hasDisplayValue } from "@/lib/virtual-slip-display";
import { VirtualSlipExtractionStatusBoxes } from "./VirtualSlipExtractionStatusBoxes";

function OpposingDetailRow({ label, value }: { label: string; value: string }) {
  if (!hasDisplayValue(value)) return null;
  return (
    <div className="flex items-center gap-[14px] py-[1px] font-sans text-[15.4px] tracking-[-0.02em]">
      <span className="min-w-[129px] font-bold text-[#4C4D55]">{label}:</span>
      <span className="text-[#4C4D55]">{value}</span>
    </div>
  );
}

/**
 * Opposing extractions + impression below the arch chart (CDC opposing accordion layout).
 * Chart is rendered once by VirtualSlipArch; this block is status boxes + impression summary.
 */
export function VirtualSlipOpposingSection({ opposing }: { opposing: OpposingArchVM }) {
  const statusBoxProps =
    opposing.showExtractions
      ? buildVirtualSlipStatusBoxProps(opposing.extractionDisplay, opposing.arch, {
          apiProduct: opposing.catalogApiProduct ?? undefined,
          catalogField: "opposite_extractions",
        })
      : null;

  const showImpression = opposing.showImpression && hasDisplayValue(opposing.impression);
  const showBlock = statusBoxProps != null || showImpression;
  if (!showBlock) return null;

  return (
    <div className="mt-4 w-full">
      <h3 className="mb-3 text-center font-sans text-[20px] font-medium leading-[21px] tracking-[-0.02em] text-[#7f7f7f]">
        Opposing
      </h3>

      {statusBoxProps && (
        <div className="w-full">
          <VirtualSlipExtractionStatusBoxes boxProps={statusBoxProps} />
        </div>
      )}

      {showImpression && (
        <>
          {statusBoxProps && <hr className="my-[10px] border-[#4C4D55]/40" />}
          <OpposingDetailRow label="Impression" value={opposing.impression} />
        </>
      )}
    </div>
  );
}
