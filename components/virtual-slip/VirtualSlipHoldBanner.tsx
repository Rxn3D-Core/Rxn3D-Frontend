"use client";

import {
  formatHoldBannerTimestamp,
  type SlipHoldDetail,
} from "@/lib/slip-hold-info";

const RESUME_ICON = "/icons/virtual-slip-actions/resume.svg";
const CANCEL_ICON = "/icons/virtual-slip-center/cancel.svg";

const ACTION_ICON_CLASS =
  "h-12 w-12 max-w-none object-contain transition-opacity hover:opacity-90";

export type VirtualSlipBannerVariant = "hold" | "cancelled";

const BANNER_THEME: Record<
  VirtualSlipBannerVariant,
  { container: string; title: string; prefix: string }
> = {
  hold: {
    container: "border-[#EDBA29] bg-[#FBEFC9]/85",
    title: "Case on Hold",
    prefix: "Put on hold by",
  },
  cancelled: {
    container: "border-[#EF4444] bg-[#FEE2E2]/85",
    title: "Case Cancelled",
    prefix: "Cancelled by",
  },
};

export interface VirtualSlipHoldBannerProps {
  holdDetail: SlipHoldDetail;
  /** "hold" (default) shows resume/cancel actions; "cancelled" is read-only and red. */
  variant?: VirtualSlipBannerVariant;
  onResume?: () => void;
  onCancel?: () => void;
}

export function VirtualSlipHoldBanner({
  holdDetail,
  variant = "hold",
  onResume,
  onCancel,
}: VirtualSlipHoldBannerProps) {
  const theme = BANNER_THEME[variant];
  const author = holdDetail.authorName?.trim() || "Unknown";
  const reason = holdDetail.reason?.trim() || "No reason provided";
  const when = holdDetail.heldAt
    ? formatHoldBannerTimestamp(holdDetail.heldAt)
    : null;

  return (
    <div
      className={`flex items-center gap-4 border-y-2 px-6 py-4 ${theme.container}`}
      role="status"
      aria-live="polite"
    >
      <p className="shrink-0 font-sans text-base font-bold text-xl leading-snug text-[#111827]">
        {theme.title}
      </p>

      <p className="min-w-0 flex-1 text-center font-sans text-xl leading-snug text-[#374151]">
        {theme.prefix} <strong className="font-bold text-[#111827]">{author}</strong>
        {when ? (
          <>
            {" "}
            • <strong className="font-bold text-[#111827]">{when}</strong>
          </>
        ) : null}
        {" "}
        • <strong className="font-bold text-[#111827]">Reason:</strong> {reason}
      </p>

      <div className="flex shrink-0 items-center gap-2">
        {onResume ? (
          <button
            type="button"
            aria-label="Resume case"
            onClick={onResume}
            className="shrink-0 cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- bundled SVG glyph */}
            <img
              src={RESUME_ICON}
              alt=""
              width={48}
              height={48}
              className={ACTION_ICON_CLASS}
              aria-hidden
            />
          </button>
        ) : null}
        {onCancel ? (
          <button
            type="button"
            aria-label="Cancel case"
            onClick={onCancel}
            className="shrink-0 cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- bundled SVG glyph */}
            <img
              src={CANCEL_ICON}
              alt=""
              width={48}
              height={48}
              className={ACTION_ICON_CLASS}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
    </div>
  );
}
