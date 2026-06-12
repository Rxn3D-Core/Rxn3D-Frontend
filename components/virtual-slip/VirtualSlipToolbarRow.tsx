"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCaseSlipNotes } from "@/hooks/use-case-slip-notes";
import { lookupSlipIdByNumber } from "@/lib/api/slip-lookup";

const BACK_TO_CASE_LIST_ICON_SRC =
  "/icons/virtual-slip-actions/gobacktoofficereturn.svg";

export interface VirtualSlipToolbarRowProps {
  caseId?: number | null;
  relatedSlips?: string[];
  notesRefreshKey?: number;
  onBackToCaseList?: () => void;
  children: ReactNode;
}

/** Allow alphanumeric slip numbers (e.g. C00001-S01); reject case numbers / stray punctuation. */
function sanitizeSlipNumberInput(value: string): string {
  return value.replace(/[^A-Za-z0-9-]/g, "");
}

/** One row: jump-to-slip (left), center action icons, related slip chips (right). */
export function VirtualSlipToolbarRow({
  caseId = null,
  relatedSlips = [],
  notesRefreshKey = 0,
  onBackToCaseList,
  children,
}: VirtualSlipToolbarRowProps) {
  const router = useRouter();
  const [jumpSlip, setJumpSlip] = useState("");
  const [jumpSlipError, setJumpSlipError] = useState<string | null>(null);
  const [jumpSlipLoading, setJumpSlipLoading] = useState(false);

  const { slips } = useCaseSlipNotes(caseId, { refreshKey: notesRefreshKey });

  const slipTags = useMemo(() => {
    if (relatedSlips.length > 0) return relatedSlips;
    return slips
      .map((s) => s.slip_number?.trim())
      .filter((n): n is string => Boolean(n));
  }, [relatedSlips, slips]);

  const findSlipIdLocally = useCallback(
    (normalized: string): number | null => {
      const match = slips.find(
        (s) => s.slip_number?.trim().toLowerCase() === normalized
      );
      return match?.id ?? null;
    },
    [slips]
  );

  const navigateToSlip = useCallback(
    async (target: string) => {
      const trimmed = sanitizeSlipNumberInput(target.trim());
      if (!trimmed || jumpSlipLoading) return;

      const normalized = trimmed.toLowerCase();
      setJumpSlipLoading(true);
      setJumpSlipError(null);

      try {
        let resolvedId = findSlipIdLocally(normalized);
        if (!resolvedId) {
          resolvedId = await lookupSlipIdByNumber(trimmed);
        }

        if (!resolvedId) {
          setJumpSlipError("Slip not found");
          return;
        }

        router.push(`/virtual-slip-v2/${resolvedId}`);
      } catch {
        setJumpSlipError("Unable to find slip");
      } finally {
        setJumpSlipLoading(false);
      }
    },
    [router, findSlipIdLocally, jumpSlipLoading]
  );

  return (
    <TooltipProvider delayDuration={200}>
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-4 px-6 py-0">
      <div className="flex min-w-0 flex-wrap items-center justify-start gap-3">
        {onBackToCaseList ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Back to case list view"
                onClick={onBackToCaseList}
                className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-visible rounded-full transition-transform duration-200 ease-out hover:scale-[1.15] active:scale-95"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- bundled SVG glyph */}
                <img
                  src={BACK_TO_CASE_LIST_ICON_SRC}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain transition-[width,height] duration-200 ease-out group-hover:h-12 group-hover:w-12"
                  aria-hidden
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="text-xs font-medium">
              Back to case list view
            </TooltipContent>
          </Tooltip>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-[6px]">
            <label className="sr-only" htmlFor="jump-to-slip-input">
              Search slip
            </label>
            <input
              id="jump-to-slip-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={jumpSlip}
              onChange={(e) => {
                setJumpSlip(sanitizeSlipNumberInput(e.target.value));
                if (jumpSlipError) setJumpSlipError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void navigateToSlip(jumpSlip);
              }}
              disabled={jumpSlipLoading}
              placeholder="Jump to slip"
              aria-invalid={jumpSlipError ? true : undefined}
              aria-describedby={jumpSlipError ? "jump-to-slip-error" : undefined}
              className="w-[130px] shrink-0 rounded-[10px] border-[0.5px] border-[#4C4D55] bg-white px-[10px] py-[5px] font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 disabled:cursor-wait disabled:opacity-60"
            />
            {slipTags.length > 0 ? (
              slipTags.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void navigateToSlip(s)}
                  className="shrink-0 rounded-[10px] border border-[#E5E7EB] bg-white px-[10px] py-[2px] font-sans text-[15.4px] tracking-[-0.02em] text-[#4C4D55] shadow-[0px_2px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-80"
                >
                  {s}
                </button>
              ))
            ) : (
              <span className="shrink-0 font-sans text-[15px] italic text-[#9CA3AF]">
                None
              </span>
            )}
          </div>
          {jumpSlipError ? (
            <p
              id="jump-to-slip-error"
              className="max-w-[130px] font-sans text-[12px] leading-tight text-[#CF0202]"
            >
              {jumpSlipError}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 justify-center">{children}</div>

      <div aria-hidden className="min-w-0" />
    </div>
    </TooltipProvider>
  );
}
