import { Inter } from "next/font/google";

/** Inter for case design center UI (loaded via next/font). */
export const caseDesignInter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const removableHeaderTitleClass =
  "text-[20px] font-normal leading-[20px] tracking-[-0.02em]";

export const removableHeaderToothClass =
  "text-[18px] sm:text-[20px] font-medium leading-[20px] tracking-[-0.02em]";

/** Fixed-restoration accordion header (inline product name + tooth numbers). */
export const productAccordionTitleClass =
  "text-[14px] sm:text-lg font-normal leading-tight tracking-[-0.02em] text-black";

export const productAccordionToothClass =
  "text-[13px] sm:text-base font-medium leading-tight tracking-[-0.02em] text-black";
