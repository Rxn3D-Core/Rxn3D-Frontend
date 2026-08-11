import { inter } from "@/lib/fonts"

/**
 * Case design center UI uses the same self-hosted Inter as the root layout
 * (avoids a second next/font/google Inter download at build time).
 */
export const caseDesignInter = inter

export const removableHeaderTitleClass =
  "text-[20px] font-normal leading-[20px] tracking-[-0.02em]"

export const removableHeaderToothClass =
  "text-[18px] sm:text-[20px] font-medium leading-[20px] tracking-[-0.02em]"

/** Fixed-restoration accordion header (inline product name + tooth numbers). */
export const productAccordionTitleClass =
  "text-[14px] sm:text-lg font-normal leading-tight tracking-[-0.02em] text-black"

export const productAccordionToothClass =
  "text-[13px] sm:text-base font-medium leading-tight tracking-[-0.02em] text-black"
