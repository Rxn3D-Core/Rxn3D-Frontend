import { ChevronsLeft, ChevronsRight } from "lucide-react";

interface CenterNavigationProps {
  showMaxillary: boolean;
  setShowMaxillary: (v: boolean) => void;
  showMandibular: boolean;
  setShowMandibular: (v: boolean) => void;
  /** Whether the "Teeth in mouth" pill should be visible (initial load, no extractions applied) */
  showTeethInMouth?: boolean;
  /** Show arrow pointing to maxillary (left) — hidden when maxillary has teeth configured */
  showMaxillaryArrow?: boolean;
  /** Show arrow pointing to mandibular (right) — hidden when mandibular has teeth configured */
  showMandibularArrow?: boolean;
}

export function CenterNavigation({
  showMaxillary,
  setShowMaxillary,
  showMandibular,
  setShowMandibular,
  showTeethInMouth = false,
  showMaxillaryArrow = false,
  showMandibularArrow = false,
}: CenterNavigationProps) {
  return (
    <div className="flex flex-col items-center justify-start pt-6 flex-shrink-0 w-16 order-2 lg:order-none gap-1">
      {/* "Teeth in mouth" pill — visible only on initial load before any extraction is applied */}
      {showTeethInMouth && (
        <div className="flex items-center gap-0 mb-2">
          {/* Left arrow pointing to maxillary — tapered gradient */}
          {showMaxillaryArrow && (
            <svg width="70" height="5" viewBox="0 0 70 5" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M8.90854e-08 2.03804L70 5L70 -3.0598e-06L8.90854e-08 2.03804Z" fill="url(#paint0_left)" />
              <defs>
                <linearGradient id="paint0_left" x1="70" y1="2.5" x2="1.92467e-06" y2="2.50005" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#CEC6B3" />
                  <stop offset="0.7" stopColor="#CEC6B3" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          )}
          <div
            className="flex items-center justify-center px-3 py-1.5 rounded-md whitespace-nowrap"
            style={{ backgroundColor: "#F3EBD7" }}
          >
            <span className="font-[Verdana] text-[16px] font-normal tracking-[0.05em] text-black">
              Teeth in mouth
            </span>
          </div>
          {/* Right arrow pointing to mandibular — mirrored tapered gradient */}
          {showMandibularArrow && (
            <svg width="70" height="5" viewBox="0 0 70 5" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M70 2.03804L0 5L0 0L70 2.03804Z" fill="url(#paint0_right)" />
              <defs>
                <linearGradient id="paint0_right" x1="0" y1="2.5" x2="70" y2="2.50005" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#CEC6B3" />
                  <stop offset="0.7" stopColor="#CEC6B3" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => setShowMaxillary(!showMaxillary)}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title={showMaxillary ? "Hide Maxillary" : "Show Maxillary"}
        >
          <ChevronsLeft size={22} className={showMaxillary ? "text-[#7f7f7f]" : "text-[#d9d9d9]"} />
        </button>
        <button
          onClick={() => setShowMandibular(!showMandibular)}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
          title={showMandibular ? "Hide Mandibular" : "Show Mandibular"}
        >
          <ChevronsRight size={22} className={showMandibular ? "text-[#7f7f7f]" : "text-[#d9d9d9]"} />
        </button>
      </div>
    </div>
  );
}
