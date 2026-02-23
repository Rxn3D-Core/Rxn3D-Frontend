"use client";

import { Check } from "lucide-react";

export function ShadeField({
  label,
  value,
  shade,
  onClick,
  submitted = false,
}: {
  label: string;
  value: string;
  shade?: string;
  onClick?: () => void;
  submitted?: boolean;
}) {
  const displayShade = shade || '';
  const hasValue = value.trim().length > 0 || displayShade.trim().length > 0;
  const showGreen = hasValue && !submitted;
  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${showGreen ? "border-[#34a853]" : "border-[#b4b0b0]"} ${onClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""}`}
      onClick={onClick}
    >
      <legend className={`text-[11px] px-1 leading-none ${showGreen ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
        {label}
      </legend>
      <div className="flex items-center gap-2">
        <span className="text-[13px] text-[#1d1d1b]">{value}{displayShade ? ` - ${displayShade}` : ''}</span>
        <svg width="38" height="37" viewBox="0 5 38 37" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_1_1245)">
            <g filter="url(#filter0_d_1_1245)">
              <path d="M28.8176 61.509V163.357H8.68442V61.509C8.68442 56.6451 11.9051 52.5737 16.2553 51.4237V34.3611L21.2467 34.4543V51.4393C25.5969 52.5892 28.8176 56.6606 28.8176 61.5246V61.509Z" fill="#8F8C88" />
              <path d="M21.2494 32.2487V34.4398L16.2581 34.3621V32.2487H21.2494Z" fill="#8F8C88" />
              <path d="M29.3074 27.3849C29.4448 31.2853 26.8194 34.5332 23.5529 34.4865L21.248 34.4555L16.2567 34.3622L13.326 34.3156C10.319 34.269 7.96835 31.1921 8.21258 27.6024L9.28105 11.7052C9.69318 5.58258 13.9671 0.85849 19.0958 0.85849C21.6907 0.85849 24.0566 2.08613 25.7967 4.09076C27.5368 6.09539 28.651 8.87701 28.7579 11.985L29.2921 27.3849H29.3074Z" fill="url(#paint0_linear_1_1245)" />
              <path opacity="0.42" d="M24.8112 29.2822C24.3075 29.8106 24.0785 30.6031 24.2312 31.3335C24.4754 31.4733 24.7959 31.4578 25.0554 31.3335C25.3149 31.2092 25.5439 31.0227 25.7423 30.8362C26.1392 30.4633 28.673 27.8836 27.5892 27.3553C27.2076 27.1688 26.5666 27.7749 26.3223 28.008C25.8339 28.4431 25.2691 28.816 24.8112 29.2822Z" fill="url(#paint1_linear_1_1245)" style={{ mixBlendMode: 'screen' }} />
              <path opacity="0.42" d="M26.6395 24.836C27.1584 24.6495 27.3111 23.9813 27.3721 23.4219C27.5095 22.3341 27.8758 20.7335 27.4485 19.6768C27.2042 19.0707 26.7921 18.7444 26.5326 19.366C26.3037 19.8943 26.6547 20.9821 26.6853 21.5416C26.7158 21.93 26.8379 24.7427 26.6242 24.8204L26.6395 24.836Z" fill="url(#paint2_linear_1_1245)" style={{ mixBlendMode: 'screen' }} />
              <path opacity="0.42" d="M23.2472 5.38176C23.4304 5.66148 23.6288 6.00335 23.9647 6.03443C24.2394 6.06551 24.4989 5.84795 24.5905 5.58378C24.6821 5.3196 24.6515 5.02435 24.5905 4.76017C24.392 4.09196 23.9036 3.51699 23.293 3.20619C22.7741 2.95756 21.7361 2.70892 21.8735 3.59469C21.9651 4.20074 22.942 4.83787 23.2625 5.36622L23.2472 5.38176Z" fill="url(#paint3_linear_1_1245)" style={{ mixBlendMode: 'screen' }} />
            </g>
            <path d="M18.7823 23.3857H17.4573L16.5405 20.7798H12.4965L11.5797 23.3857H10.3176L13.721 14.0356H15.3788L18.7823 23.3857ZM16.1574 19.7123L14.5185 15.122L12.8733 19.7123H16.1574ZM26.029 23.3857H19.6993V22.0733C20.1389 21.6966 20.5784 21.3198 21.018 20.943C21.4617 20.5663 21.8741 20.1916 22.255 19.819C23.0588 19.0404 23.6093 18.4229 23.9065 17.9666C24.2038 17.5061 24.3524 17.01 24.3524 16.4784C24.3524 15.9927 24.1912 15.6139 23.8689 15.3418C23.5507 15.0655 23.1049 14.9273 22.5313 14.9273C22.1504 14.9273 21.738 14.9943 21.2943 15.1283C20.8505 15.2622 20.4173 15.4674 19.9944 15.7437H19.9316V14.425C20.2289 14.2785 20.6245 14.1445 21.1185 14.0231C21.6166 13.9017 22.0981 13.841 22.5627 13.841C23.5214 13.841 24.2728 14.0733 24.8171 14.538C25.3613 14.9985 25.6334 15.6243 25.6334 16.4156C25.6334 16.7714 25.5873 17.1042 25.4952 17.414C25.4073 17.7196 25.2755 18.0105 25.0996 18.2868C24.9364 18.5464 24.7438 18.8017 24.5219 19.0529C24.3042 19.3041 24.0384 19.5825 23.7244 19.8881C23.2765 20.3277 22.8139 20.7547 22.3367 21.1691C21.8594 21.5794 21.4136 21.9603 20.9992 22.312H26.029V23.3857Z" fill="black" />
          </g>
          <defs>
            <filter id="filter0_d_1_1245" x="2.83667" y="-0.0345869" width="35.4066" height="176.787" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feOffset dx="1.78615" dy="6.25154" />
              <feGaussianBlur stdDeviation="3.57231" />
              <feColorMatrix type="matrix" values="0 0 0 0 0.137255 0 0 0 0 0.121569 0 0 0 0 0.12549 0 0 0 0.2 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_1245" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_1245" result="shape" />
            </filter>
            <linearGradient id="paint0_linear_1_1245" x1="18.7447" y1="34.471" x2="18.7447" y2="0.85849" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DED2C7" />
              <stop offset="0.07" stopColor="#E3D4C4" />
              <stop offset="0.25" stopColor="#EDD9C1" />
              <stop offset="0.5" stopColor="#F0DBC0" />
              <stop offset="0.76" stopColor="#F0DCC2" />
              <stop offset="0.9" stopColor="#F1E0CA" />
              <stop offset="1" stopColor="#F3E7D7" />
            </linearGradient>
            <linearGradient id="paint1_linear_1_1245" x1="24.1854" y1="29.3599" x2="27.864" y2="29.3599" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DDD4CB" />
              <stop offset="0.07" stopColor="#E2D9CB" />
              <stop offset="0.25" stopColor="#ECE1CD" />
              <stop offset="0.5" stopColor="#EFE4CE" />
              <stop offset="0.81" stopColor="#EFE5D0" />
              <stop offset="0.98" stopColor="#F1E9D8" />
              <stop offset="1" stopColor="#F2EADA" />
            </linearGradient>
            <linearGradient id="paint2_linear_1_1245" x1="26.4563" y1="21.93" x2="27.6469" y2="21.93" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DDD4CB" />
              <stop offset="0.07" stopColor="#E2D9CB" />
              <stop offset="0.25" stopColor="#ECE1CD" />
              <stop offset="0.5" stopColor="#EFE4CE" />
              <stop offset="0.81" stopColor="#EFE5D0" />
              <stop offset="0.98" stopColor="#F1E9D8" />
              <stop offset="1" stopColor="#F2EADA" />
            </linearGradient>
            <linearGradient id="paint3_linear_1_1245" x1="21.843" y1="4.51153" x2="24.6515" y2="4.51153" gradientUnits="userSpaceOnUse">
              <stop stopColor="#DDD4CB" />
              <stop offset="0.07" stopColor="#E2D9CB" />
              <stop offset="0.25" stopColor="#ECE1CD" />
              <stop offset="0.5" stopColor="#EFE4CE" />
              <stop offset="0.81" stopColor="#EFE5D0" />
              <stop offset="0.98" stopColor="#F1E9D8" />
              <stop offset="1" stopColor="#F2EADA" />
            </linearGradient>
            <clipPath id="clip0_1_1245">
              <rect width="37.5092" height="41.9746" fill="white" transform="translate(0 -1.45996)" />
            </clipPath>
          </defs>
        </svg>

        {showGreen && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}
