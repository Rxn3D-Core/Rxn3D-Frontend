"use client";

import { addProductButtonLabel } from "../utils/archAddProductReadiness";

export interface BackToProductsControlProps {
  onBackToProducts: () => void;
  className?: string;
}

export function BackToProductsControl({
  onBackToProducts,
  className = "",
}: BackToProductsControlProps) {
  return (
    <button
      type="button"
      onClick={onBackToProducts}
      title="Back to Products"
      aria-label="Back to Products"
      className={`flex items-center gap-2 text-sm font-semibold text-[#1162A8] hover:underline cursor-pointer ${className}`}
    >
      <BackToProductsIcon />
    </button>
  );
}

interface CaseDesignHeaderActionsProps {
  caseSubmitted?: boolean;
  onAddMaxillaryProduct?: () => void;
  onAddMandibularProduct?: () => void;
  showMaxillaryProductButton?: boolean;
  showMandibularProductButton?: boolean;
  maxillaryHasExistingProducts?: boolean;
  mandibularHasExistingProducts?: boolean;
  showSelectTeethToReplaceMaxillary?: boolean;
  showSelectTeethToReplaceMandibular?: boolean;
}

function BackToProductsIcon() {
  return (
    <svg
      width="27"
      height="25"
      viewBox="0 0 27 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
      aria-hidden
    >
      <path
        d="M12.3958 22.6042L2.1875 12.3958L12.3958 2.1875M24.0625 22.6042L13.8542 12.3958L24.0625 2.1875"
        stroke="url(#backToProductsIconGradient)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="backToProductsIconGradient"
          x1="29.9926"
          y1="2.46022"
          x2="0.157808"
          y2="27.922"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2AA6DE" />
          <stop offset="0.5" stopColor="#82298D" />
          <stop offset="1" stopColor="#C9539F" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function CaseDesignHeaderActions({
  caseSubmitted,
  onAddMaxillaryProduct,
  onAddMandibularProduct,
  showMaxillaryProductButton = false,
  showMandibularProductButton = false,
  maxillaryHasExistingProducts = false,
  mandibularHasExistingProducts = false,
  showSelectTeethToReplaceMaxillary = false,
  showSelectTeethToReplaceMandibular = false,
}: CaseDesignHeaderActionsProps) {
  return (
    /* On lg+ this mirrors the panel flex-row: [maxillary flex-1] [center shrink-0] [mandibular flex-1]
       On smaller screens both arch labels/buttons stack centrally. */
    <div className="flex items-center mb-1 md:mb-2 gap-2">
      {/* LEFT — aligns over maxillary tooth chart */}
      <div className="flex-1 flex items-center justify-center">
        {!caseSubmitted && showMaxillaryProductButton ? (
          <button
            type="button"
            onClick={onAddMaxillaryProduct}
            className="flex flex-row items-center justify-center gap-1 px-[10px] py-0 max-w-[280px] w-full h-[28px] shadow-[0.99px_0.99px_3.48px_rgba(0,0,0,0.25)] rounded-[5.96px] bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0"><path d="M5 12H19M12 5V19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="font-[Verdana] font-normal text-[12px] sm:text-[14px] leading-[22px] text-center tracking-[-0.02em] text-white whitespace-nowrap">
              {addProductButtonLabel("maxillary", maxillaryHasExistingProducts)}
            </span>
          </button>
        ) : showSelectTeethToReplaceMaxillary ? (
          <span className="text-[13px] sm:text-[16px] text-orange-500 font-bold tracking-wide animate-pulse text-center">SELECT TEETH TO REPLACE</span>
        ) : (
          <span className="text-[14px] sm:text-[16px] lg:text-xl text-[#1d1d1b] tracking-wide text-center">MAXILLARY</span>
        )}
      </div>

      {/* CENTER — narrow shrink-0 column, matches CenterNavigation */}
      <h2 className="flex-shrink-0 w-auto text-center text-[14px] sm:text-[16px] lg:text-xl font-bold text-[#1d1d1b] tracking-wide">
        CASE DESIGN CENTER
      </h2>

      {/* RIGHT — aligns over mandibular tooth chart */}
      <div className="flex-1 flex items-center justify-center">
        {!caseSubmitted && showMandibularProductButton ? (
          <button
            type="button"
            onClick={onAddMandibularProduct}
            className="flex flex-row items-center justify-center gap-1 px-[10px] py-0 max-w-[280px] w-full h-[28px] shadow-[0.99px_0.99px_3.48px_rgba(0,0,0,0.25)] rounded-[5.96px] bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0"><path d="M5 12H19M12 5V19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span className="font-[Verdana] font-normal text-[12px] sm:text-[14px] leading-[22px] text-center tracking-[-0.02em] text-white whitespace-nowrap">
              {addProductButtonLabel("mandibular", mandibularHasExistingProducts)}
            </span>
          </button>
        ) : showSelectTeethToReplaceMandibular ? (
          <span className="text-[13px] sm:text-[16px] text-orange-500 font-bold tracking-wide animate-pulse text-center">SELECT TEETH TO REPLACE</span>
        ) : (
          <span className="text-[14px] sm:text-[16px] lg:text-xl text-[#1d1d1b] tracking-wide text-center">MANDIBULAR</span>
        )}
      </div>
    </div>
  );
}
