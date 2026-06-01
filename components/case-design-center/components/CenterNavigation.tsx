export function CenterNavigation() {
  const arrowWidth = 48;
  const arrowHeight = 4;

  return (
    <div className="flex flex-col items-center justify-start pt-10 mt-2 flex-shrink-0 order-2 lg:order-none gap-1 w-max min-w-[11rem]">
      <div className="flex items-center gap-1 sm:gap-1.5 mb-2" aria-label="Teeth in mouth status">
        <svg
          width={arrowWidth}
          height={arrowHeight}
          viewBox="0 0 70 5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0 hidden sm:block"
          aria-hidden
        >
          <path d="M8.90854e-08 2.03804L70 5L70 -3.0598e-06L8.90854e-08 2.03804Z" fill="url(#paint0_left)" />
          <defs>
            <linearGradient id="paint0_left" x1="70" y1="2.5" x2="1.92467e-06" y2="2.50005" gradientUnits="userSpaceOnUse">
              <stop stopColor="#CEC6B3" />
              <stop offset="0.7" stopColor="#CEC6B3" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
        <div
          className="flex items-center justify-center px-4 py-2.5 rounded-[6px] whitespace-nowrap min-h-[25px] shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] border border-[#CEC6B3]/60"
          style={{ backgroundColor: "#F3EBD7" }}
        >
          <span className="font-[Verdana] text-[15px] sm:text-[16px] font-normal tracking-[0.05em] text-black leading-tight text-center">
            Teeth in mouth
          </span>
        </div>
        <svg
          width={arrowWidth}
          height={arrowHeight}
          viewBox="0 0 70 5"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="flex-shrink-0 hidden sm:block"
          aria-hidden
        >
          <path d="M70 2.03804L0 5L0 0L70 2.03804Z" fill="url(#paint0_right)" />
          <defs>
            <linearGradient id="paint0_right" x1="0" y1="2.5" x2="70" y2="2.50005" gradientUnits="userSpaceOnUse">
              <stop stopColor="#CEC6B3" />
              <stop offset="0.7" stopColor="#CEC6B3" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}
