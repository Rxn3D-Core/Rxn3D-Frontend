/**
 * Small badge/tag used inside accordion headers to show category, subcategory, stage, etc.
 */
export function AccordionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-[Verdana] text-[11px] sm:text-[13px] font-medium leading-[18px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[8px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
      {children}
    </span>
  );
}

/** Shown on the removable product accordion that owns chart / tooth-status selection. */
export function CurrentlyActiveProductBadge() {
  return (
    <span className="font-[Verdana] text-[11px] sm:text-[12px] font-semibold leading-[18px] tracking-[-0.02em] text-white bg-[#1162A8] px-[8px] py-[2px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] whitespace-nowrap">
      Currently active
    </span>
  );
}

export function removableProductTitleBoxClassName({
  isCurrentlyActive,
  confirmDetailsChecked = false,
}: {
  isCurrentlyActive: boolean;
  confirmDetailsChecked?: boolean;
}): string {
  const base =
    "flex flex-col items-center text-center gap-[5px] border rounded-[7px] p-[10px] mr-8 transition-colors";
  if (isCurrentlyActive) {
    return `${base} border-2 border-[#1162A8] bg-white`;
  }
  if (confirmDetailsChecked) {
    return `${base} border border-[#34C759]`;
  }
  return `${base} border border-[#F97316]`;
}

/**
 * Estimated days label shown in accordion headers.
 */
export function EstDaysLabel({ rushed, text }: { rushed: boolean; text: string }) {
  return (
    <span
      className={`font-[Verdana] text-[11px] sm:text-[13px] leading-tight tracking-[-0.02em] whitespace-nowrap ${
        rushed ? "text-[#CF0202] font-medium" : "text-[#B4B0B0]"
      }`}
    >
      Est days: {text}
    </span>
  );
}
