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
