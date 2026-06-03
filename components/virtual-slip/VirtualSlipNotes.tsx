"use client";

import { useRouter } from "next/navigation";
import { CenterActionIcons } from "@/components/case-design-center/components/CenterActionIcons";

const noop = () => {};

interface VirtualSlipNotesProps {
  notes: string;
  relatedSlips: string[];
  /** Slip number to navigate to from "Jump to slip". */
  slipNumber?: string;
}

/** Read-only case summary notes + jump-to-slip + related slip chips. */
export function VirtualSlipNotes({ notes, relatedSlips, slipNumber }: VirtualSlipNotesProps) {
  const router = useRouter();

  return (
    <div className="px-6 pb-6">
      {/* Icon row above the notes block — same icons/size as the create-slip Case Design Center */}
      <div className="flex items-center justify-center py-2">
        <CenterActionIcons
          visible
          onEdit={noop}
          onAddProduct={noop}
          onRush={noop}
          onAttach={noop}
          onPhoto={noop}
          hasPhotos
        />
      </div>

      {/* Notes box with floating "Case summary notes" label on the top border */}
      <div className="relative mt-4 rounded-[7.7px] border-[0.74px] border-[#4C4D55] px-[15px] pb-[5px] pt-[18px]">
        <span className="absolute -top-[12px] left-1/2 -translate-x-1/2 bg-white px-[10px] font-sans text-[20px] leading-none text-[#4C4D55]">
          Case summary notes
        </span>
        <p className="min-h-[60px] whitespace-pre-wrap font-sans text-[18px] leading-[22px] text-[#4C4D55]">
          {notes || "—"}
        </p>
      </div>

      {/* Footer: jump to slip + related slips */}
      <div className="mt-4 flex flex-wrap items-center gap-[15px]">
        <button
          type="button"
          onClick={() => slipNumber && router.push(`/virtual-slip-v2/${slipNumber}`)}
          className="rounded-[10px] border-[0.5px] border-[#4C4D55] px-[10px] py-[5px] font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55]"
        >
          Jump to slip
        </button>

        {relatedSlips.length > 0 && (
          <div className="flex flex-wrap items-center gap-[15px]">
            <span className="font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55]">
              Related slip:
            </span>
            {relatedSlips.map((s) => (
              <span
                key={s}
                className="rounded-[10px] bg-white px-[10px] py-[5px] font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55] shadow-[0px_2px_4px_rgba(0,0,0,0.25)]"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
