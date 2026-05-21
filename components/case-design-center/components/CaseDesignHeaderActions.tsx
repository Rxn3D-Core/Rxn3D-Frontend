"use client";

interface CaseDesignHeaderActionsProps {
  caseSubmitted?: boolean;
  onBackToProducts?: () => void;
  hasIncompleteAccordion: boolean;
  onAddMaxillaryProduct?: () => void;
  onAddMandibularProduct?: () => void;
  showMaxillaryProductButton?: boolean;
  showMandibularProductButton?: boolean;
}

export function CaseDesignHeaderActions({
  caseSubmitted,
  onBackToProducts,
  hasIncompleteAccordion,
  onAddMaxillaryProduct,
  onAddMandibularProduct,
  showMaxillaryProductButton = false,
  showMandibularProductButton = false,
}: CaseDesignHeaderActionsProps) {
  return (
    <div className="relative flex items-center mb-1 md:mb-2 px-2 md:px-4">
      {onBackToProducts && !caseSubmitted && (
        <button
          onClick={!hasIncompleteAccordion ? onBackToProducts : undefined}
          title={hasIncompleteAccordion ? "Complete all required fields before going back" : undefined}
          className={`absolute left-3 text-sm font-semibold ${hasIncompleteAccordion ? "text-[#b4b0b0] cursor-not-allowed" : "text-[#1162A8] hover:underline cursor-pointer"}`}
        >
          ← Back to Products
        </button>
      )}
      <div className="flex-1 flex items-center justify-center">
        {!caseSubmitted && showMaxillaryProductButton ? (
          <button
            type="button"
            onClick={onAddMaxillaryProduct}
            className="flex flex-row items-center justify-center px-[10px] py-0 w-[230px] h-[28px] shadow-[0.99px_0.99px_3.48px_rgba(0,0,0,0.25)] rounded-[5.96px] bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19M12 5V19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="font-[Verdana] font-normal text-[14px] leading-[22px] text-center tracking-[-0.02em] text-white">MAXILLARY PRODUCT</span>
          </button>
        ) : (
          <span className="text-[16px] sm:text-xl text-[#1d1d1b] tracking-wide">MAXILLARY</span>
        )}
      </div>
      <h2 className="flex-1 text-center text-xl font-bold text-[#1d1d1b] tracking-wide">
        CASE DESIGN CENTER
      </h2>
      <div className="flex-1 flex items-center justify-center">
        {!caseSubmitted && showMandibularProductButton ? (
          <button
            type="button"
            onClick={onAddMandibularProduct}
            className="flex flex-row items-center justify-center px-[10px] py-0 w-[230px] h-[28px] shadow-[0.99px_0.99px_3.48px_rgba(0,0,0,0.25)] rounded-[5.96px] bg-[#1162A8] hover:bg-[#0d4a85] cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19M12 5V19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="font-[Verdana] font-normal text-[14px] leading-[22px] text-center tracking-[-0.02em] text-white">MANDIBULAR PRODUCT</span>
          </button>
        ) : (
          <span className="text-[16px] sm:text-xl text-[#1d1d1b] tracking-wide">MANDIBULAR</span>
        )}
      </div>
    </div>
  );
}
