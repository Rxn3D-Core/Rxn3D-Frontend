"use client";

import React, { useState, useEffect, useRef } from "react";
import NewCaseWizard, { type WizardDoctorShape, type WizardLabShape } from "@/components/new-case-wizard";
import { SlipCreationStepFooter } from "@/components/slip-creation-step-footer";
import { PatientHeader } from "./components/PatientHeader";
import { TopBar } from "./components/TopBar";
import { ImpressionSelectionModal } from "@/components/impression-selection-modal";
import AddOnsModal from "@/components/add-ons-modal";
import FileAttachmentModalContent from "@/components/file-attachment-modal-content";
import RushRequestModal from "@/components/rush-request-modal";
import { MaxillaryTeethSVG } from "@/components/maxillary-teeth-svg";
import { MandibularTeethSVG } from "@/components/mandibular-teeth-svg";
import { ToothShadeSelectionSVG } from "@/components/tooth-shade-selection-svg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Monitor,
  LayoutList,
  Users,
  FolderOpen,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  ChevronsRight,
  ChevronsLeft,
  Plus,
  ChevronDown,
  Eye,
  Printer,
  Truck,
  List,
  ClipboardList,
  ClipboardCheck,
  CheckCircle2,
  Trash2,
  Check,
  Pencil,
  Paperclip,
  Zap,
  Maximize2,
  EyeOff,
  ChevronUp,
  Phone,
  Calendar,
  Send,
  FlaskConical,
  Pause,
  X,
  MoreHorizontal,
  ArrowLeftRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Fieldset-style input (label sitting on the border)                */
/* ------------------------------------------------------------------ */
function FieldInput({
  label,
  value,
  className = "",
  onClick,
}: {
  label: string;
  value: string;
  className?: string;
  onClick?: () => void;
}) {
  const hasValue = value.trim().length > 0;
  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center min-w-0 ${hasValue ? "border-[#34a853]" : "border-[#b4b0b0]"} ${onClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""} ${className}`}
      onClick={onClick}
    >
      <legend className={`text-xs px-1 leading-none whitespace-nowrap ${hasValue ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
        {label}
      </legend>
      <div className="flex items-center gap-2 min-w-0 w-full">
        <input
          type="text"
          readOnly
          value={value}
          className={`text-xs text-[#1d1d1b] bg-transparent outline-none leading-tight min-w-0 flex-1 truncate ${onClick ? "cursor-pointer" : ""}`}
        />
        {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/*  Shade field with A2 badge                                          */
/* ------------------------------------------------------------------ */
function ShadeField({
  label,
  value,
  shade,
  onClick,
}: {
  label: string;
  value: string;
  shade?: string;
  onClick?: () => void;
}) {
  const hasValue = value.trim().length > 0;
  const displayShade = shade || '';
  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center ${hasValue ? "border-[#34a853]" : "border-[#b4b0b0]"} ${onClick ? "cursor-pointer hover:bg-gray-50 transition-colors" : ""}`}
      onClick={onClick}
    >
      <legend className={`text-xs px-1 leading-none ${hasValue ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
        {label}
      </legend>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#1d1d1b]">{value}{displayShade ? ` - ${displayShade}` : ''}</span>
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

        {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ */
/*  Icon field (dental spec icons)                                     */
/* ------------------------------------------------------------------ */
function IconField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  const iconPaths: Record<string, React.ReactNode> = {
    occlusal: (
      <svg width="18" height="28" viewBox="0 0 18 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.77585 27.8942C4.77585 27.8942 2.41145 21.8671 2.29836 20.7388C2.22087 19.9764 1.85857 16.3601 4.04914 14.8264C5.2659 13.9735 6.7549 14.1278 6.85961 14.141C7.90045 14.2622 7.98003 14.7228 8.97689 14.8264C10.1329 14.9476 10.4617 14.3746 12.1936 13.9691C13.4167 13.6826 14.4889 13.4314 15.3706 13.8832C16.6963 14.5619 17.0062 16.5298 17.1633 17.6118C17.7727 21.8363 13.6617 27.8964 13.6617 27.8964C13.0376 27.6187 10.9748 26.9576 9.10673 26.9841C6.92872 27.0171 4.77794 27.8964 4.77794 27.8964L4.77585 27.8942Z" fill="white" stroke="black" strokeWidth="0.496139" strokeMiterlimit="10" />
        <path d="M2.41992 0.114563C2.41992 0.114563 0.453428 6.14164 0.359188 7.26992C0.29636 8.0324 -0.00730456 11.6486 1.81678 13.1824C2.83039 14.0352 3.80421 14.0044 3.88798 13.9735C4.80736 13.6562 5.17385 13.2353 5.97385 13.2463C6.94348 13.2617 7.16338 13.4006 8.60421 13.806C9.62202 14.0925 10.6461 13.6342 11.3812 13.1824C12.4848 12.5037 12.6021 11.4768 12.732 10.3969C13.2388 6.17249 9.81469 0.114563 9.81469 0.114563C9.29531 0.392227 7.57804 1.05333 6.02201 1.02689C4.2105 0.991629 2.41992 0.114563 2.41992 0.114563Z" fill="white" stroke="black" strokeWidth="0.496139" strokeMiterlimit="10" />
        <path d="M0.195801 14.7999C1.0335 15.4147 2.18742 15.1833 3.12355 14.758C4.05968 14.3327 4.96229 13.7311 5.98219 13.6562C7.06282 13.5769 8.09947 14.1101 9.1801 14.2137C10.6523 14.3526 12.0701 13.6937 13.5068 13.3278C14.9434 12.962 16.6754 12.9885 17.6408 14.1674" stroke="#1064AB" strokeWidth="0.661518" strokeMiterlimit="10" />
      </svg>
    ),
    pontic: (
      <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.8395 3.5656C11.9941 2.65634 10.5048 1.3571 8.31027 0.70425C7.12321 0.350891 5.72589 -0.0627984 4.22782 0.538343C3.43061 0.859383 2.71881 1.96686 1.26454 4.11503C0.92726 4.61275 0.552743 5.19881 0.36877 6.04127C0.257073 6.55407 0.0840503 7.35775 0.480468 8.07739C0.835273 8.72163 1.25797 8.58589 1.65439 9.23228C2.06395 9.90021 1.75952 10.2773 1.98948 11.3223C2.04643 11.5787 2.32458 12.7292 3.10865 13.4683C3.75037 14.0716 4.50378 14.1879 5.90548 14.3495C9.61998 14.774 11.5013 14.9765 12.6161 14.5154C13.9017 13.9832 14.7384 13.1515 15.1326 12.7551C15.713 12.169 16.5628 11.3309 16.9789 9.94977C17.2439 9.06852 16.8891 8.79919 17.1475 7.4741C17.3315 6.53252 17.498 6.53899 17.6513 5.71376C17.8331 4.73987 18.0565 3.53112 17.3709 2.68866C16.6022 1.74278 15.1238 1.79234 14.6311 1.80742C13.8995 1.83112 11.9941 2.08752 11.6305 2.24696" fill="white" />
        <path d="M12.8395 3.5656C11.9941 2.65634 10.5048 1.3571 8.31027 0.70425C7.12321 0.350891 5.72589 -0.0627984 4.22782 0.538343C3.43061 0.859383 2.71881 1.96686 1.26454 4.11503C0.92726 4.61275 0.552743 5.19881 0.36877 6.04127C0.257073 6.55407 0.0840503 7.35775 0.480468 8.07739C0.835273 8.72163 1.25797 8.58589 1.65439 9.23228C2.06395 9.90021 1.75952 10.2773 1.98948 11.3223C2.04643 11.5787 2.32458 12.7292 3.10865 13.4683C3.75037 14.0716 4.50378 14.1879 5.90548 14.3495C9.61998 14.774 11.5013 14.9765 12.6161 14.5154C13.9017 13.9832 14.7384 13.1515 15.1326 12.7551C15.713 12.169 16.5628 11.3309 16.9789 9.94977C17.2439 9.06852 16.8891 8.79919 17.1475 7.4741C17.3315 6.53252 17.498 6.53899 17.6513 5.71376C17.8331 4.73987 18.0565 3.53112 17.3709 2.68866C16.6022 1.74278 15.1238 1.79234 14.6311 1.80742C13.8995 1.83112 11.9941 2.08752 11.6305 2.24696" stroke="black" strokeWidth="0.467111" strokeMiterlimit="10" />
        <path d="M1.30396 16.4266C1.30396 16.4266 2.35961 16.015 3.84891 14.6059C5.16958 13.3562 5.07321 12.6754 6.17048 12.0764C7.50647 11.346 8.95635 11.6368 9.35715 11.7187C10.5026 11.9493 11.0961 12.5159 12.2372 13.3692C15.5159 15.8168 16.7664 16.4266 16.7664 16.4266H1.30396Z" fill="#1063AB" />
      </svg>

    ),
    embrasures: (
      <svg width="31" height="21" viewBox="0 0 31 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.9712 11.8866C22.1102 11.6436 21.2492 11.2207 20.3696 11.3588C19.6714 11.4689 19.0525 11.9233 18.3683 12.1155C16.6044 12.6119 14.8033 11.3133 12.9882 11.4584C11.4059 11.586 9.81572 12.7954 8.3466 12.1243C7.64384 11.8027 7.05122 11.0704 6.29416 11.1019C5.73567 11.1263 5.27492 11.5667 4.81417 11.9215C4.35342 12.2763 3.7515 12.5699 3.25507 12.2833C2.65159 11.9338 2.60815 11.0092 2.4856 10.256C2.23738 8.74245 1.37328 7.46837 0.73102 6.1104C0.0887617 4.75243 -0.328551 3.05365 0.34008 1.71141C0.928042 0.531708 2.21876 -0.0170728 3.42106 0.000404325C4.62336 0.0178814 5.77601 0.498501 6.9178 0.924942C8.0596 1.35138 9.25879 1.73238 10.4487 1.54363C11.4121 1.39158 12.3134 0.872511 13.283 0.788621C14.7614 0.659291 16.1514 1.54363 17.6128 1.82327C19.3022 2.14659 21.018 1.65549 22.7012 1.3007C24.3844 0.945915 26.2026 0.739685 27.7462 1.57684C28.6398 2.06095 29.4636 2.89461 30.4549 2.85966C30.157 4.62135 28.8694 5.91465 27.7307 7.16776C26.6479 8.3597 26.2259 9.50969 25.5883 10.9848C25.0903 12.1382 24.023 12.1854 22.9712 11.8883V11.8866Z" fill="#1063AB" />
        <path d="M4.27729 19.3241C3.96547 19.1773 3.68933 18.9396 3.74053 18.5342C3.83361 17.7966 4.07717 16.381 4.70236 13.714C4.84199 13.1145 5.87363 8.80467 6.93476 8.49183C7.30243 8.38347 7.69337 8.38871 7.69337 8.38871C7.69337 8.38871 8.13085 8.3957 8.53575 8.54251C9.61549 8.93575 10.4455 12.0589 10.6177 13.2736C10.9698 15.7536 10.8767 18.5516 10.8612 19.1441C10.8535 19.4272 10.6518 19.5793 10.4237 19.6335C8.76845 20.0302 5.66885 19.983 4.27729 19.3241Z" fill="white" stroke="black" strokeWidth="0.501636" strokeMiterlimit="10" />
        <path d="M11.4937 19.6135C11.1711 19.4964 10.8779 19.3164 10.8996 18.9476C10.9709 17.7627 10.8639 14.3949 11.0376 13.4808C11.2797 12.2067 11.9204 10.4678 12.7022 9.4803C13.0668 9.02065 14.1605 8.42643 14.719 8.43168C15.2775 8.43692 16.4317 9.04862 16.7776 9.54671C17.4913 10.5761 17.724 12.2679 18.0311 13.5088C18.2421 14.3564 17.9846 17.6404 18.0296 18.7449C18.0435 19.1067 17.7752 19.278 17.4695 19.4265C16.002 20.1413 13.011 20.1623 11.4937 19.6118V19.6135Z" fill="white" stroke="black" strokeWidth="0.501636" strokeMiterlimit="10" />
        <path d="M18.8125 19.6451C18.3704 19.5123 18.0074 19.168 18.0694 18.6349C18.1579 17.8852 18.0881 15.3562 18.3564 13.3936C18.7272 10.6829 18.9149 10.7877 19.7868 9.41403C20.0862 8.9404 20.6695 8.04732 21.5538 7.96692C22.3124 7.89702 22.9112 8.45803 23.1392 8.67824C24.2438 9.74434 24.2314 11.1792 24.8861 15.538C25.125 17.1302 25.2212 18.1491 25.2568 18.773C25.2848 19.2449 24.9512 19.5036 24.5696 19.6434C23.2137 20.1397 20.3282 20.0978 18.8125 19.6434V19.6451Z" fill="white" stroke="black" strokeWidth="0.501636" strokeMiterlimit="10" />
      </svg>

    ),
    proximal: (
      <svg width="27" height="20" viewBox="0 0 27 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_1_1704)">
          <path d="M0.103027 2.5049L1.79407 0.781915C2.0659 0.502663 2.3692 0.209449 2.75834 0.150806C3.2419 0.0754085 3.69399 0.385378 4.07455 0.68697C5.65114 1.94081 7.0675 3.38733 8.2807 4.98465C8.73851 4.49317 9.19633 4.00169 9.65414 3.5102" stroke="black" strokeWidth="0.689655" strokeMiterlimit="10" />
          <path d="M5.98022 2.12788C5.99167 1.71738 6.4409 1.43255 6.86151 1.42138C7.28213 1.41021 7.67413 1.5973 8.06327 1.75369C8.45241 1.91007 8.88161 2.04131 9.28506 1.92403C9.49107 1.86259 9.6742 1.73972 9.88021 1.6727C10.5498 1.45768 11.2508 1.90727 11.7229 2.41272C12.7101 3.47108 13.248 4.87013 13.4855 6.28594C13.723 7.70174 13.6772 9.14268 13.6343 10.5725C13.5856 12.1167 13.0105 14.0799 12.3209 15.4705C11.328 17.4756 10.71 18.7824 9.95175 19.5783" stroke="black" strokeWidth="0.689655" strokeMiterlimit="10" />
          <path d="M18.9335 19.9302C16.8962 16.3949 14.899 11.6029 15.0679 7.02041C15.1108 5.86431 15.437 3.74758 16.324 2.97964C17.211 2.2117 18.779 2.10558 19.48 3.03828" stroke="black" strokeWidth="0.689655" strokeMiterlimit="10" />
          <path d="M19.0535 2.68919L18.9333 3.51857C19.9491 2.78135 20.9878 2.07763 22.0465 1.40743C22.4814 1.13376 22.965 0.854511 23.4771 0.918739C23.995 0.98576 24.3899 1.38509 24.7762 1.72857C25.1625 2.07205 25.6632 2.39877 26.1725 2.2759" stroke="black" strokeWidth="0.689655" strokeMiterlimit="10" />
        </g>
        <defs>
          <clipPath id="clip0_1_1704">
            <rect width="26.2069" height="20" fill="white" />
          </clipPath>
        </defs>
      </svg>

    ),
  };

  const hasValue = value.trim().length > 0;
  return (
    <fieldset className={`border rounded-[7.7px] px-3 py-0 relative h-[42px] flex items-center min-w-0 ${hasValue ? "border-[#34a853]" : "border-[#7f7f7f]"}`}>
      <legend className={`text-xs px-1 leading-none whitespace-nowrap ${hasValue ? "text-[#34a853]" : "text-[#7f7f7f]"}`}>
        {label}
      </legend>
      <div className="flex items-center gap-1 min-w-0 w-full">
        <input
          type="text"
          readOnly
          value={value}
          className="flex-1 text-xs text-[#1d1d1b] bg-transparent outline-none leading-tight tracking-[-0.02em] min-w-0 truncate"
        />
        <div className="flex-shrink-0">{iconPaths[icon]}</div>
        {hasValue && <Check size={14} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}


/* ------------------------------------------------------------------ */
/*  Case Design Center                                                 */
/* ------------------------------------------------------------------ */
/* ---- Implant brand -> platform mapping ---- */
const implantBrandPlatforms: Record<string, string[]> = {
  "Truabutment": ["Truscan", "Truscan NP", "Truscan WP", "NovaBridge"],
  "Nobel Biocare": ["Bone Level", "Bone Level Tapered", "Active", "Replace Select"],
  "Xtechnology": ["KATANA Zirconia", "KATANA UTML", "KATANA STML"],
  "H Implants": ["Legacy", "Legacy Zimmer", "SwissPlus", "Tapered Screw-Vent"],
  "Other Brands": ["Straumann BL", "Straumann TL", "Astra TX", "Astra EV", "Zimmer TSV", "BioHorizons"],
};
const implantBrandList = Object.keys(implantBrandPlatforms);

/* ---- SelectField component for dropdowns ---- */
function SelectField({
  label,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const hasValue = value.trim().length > 0;
  const borderColor = required && !value ? "border-[#cf0202]" : hasValue ? "border-[#34a853]" : "border-[#b4b0b0]";
  const legendColor = required && !value ? "text-[#cf0202] font-semibold" : hasValue ? "text-[#34a853]" : "text-[#7f7f7f]";
  return (
    <fieldset className={`border rounded px-3 pb-2 pt-0 relative min-w-0 ${borderColor}`}>
      <legend className={`text-xs px-1 leading-none whitespace-nowrap ${legendColor}`}>
        {label}
      </legend>
      <div className="flex items-center gap-1 min-w-0 w-full">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs text-[#1d1d1b] bg-transparent outline-none leading-tight cursor-pointer min-w-0 truncate"
        >
          {!value && <option value="">Select {label.replace("Select ", "")}</option>}
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
      </div>
    </fieldset>
  );
}

/* ---- Implant Inclusions with Quantity Control ---- */
function ImplantInclusionsField({
  label,
  value,
  quantity,
  onChange,
  onQuantityChange,
}: {
  label: string;
  value: string;
  quantity: number;
  onChange: (v: string) => void;
  onQuantityChange: (qty: number) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const hasValue = value.trim().length > 0;
  const borderColor = hasValue ? "border-[#34a853]" : "border-[#b4b0b0]";
  const legendColor = hasValue ? "text-[#34a853]" : "text-[#7f7f7f]";



  return (
    <div className="relative">
      <fieldset
        className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${borderColor}`}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <legend className={`text-xs px-1 leading-none whitespace-nowrap ${legendColor}`}>
          {label}
        </legend>
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-[#1d1d1b] flex-1 truncate">
            {value === "Model with Tissue + QTY" ? `${quantity}x Model with Tissue` : value || `Select ${label}`}
          </span>
          {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
          <ChevronDown size={16} className={`text-[#7f7f7f] transition-transform flex-shrink-0 ${showDropdown ? 'rotate-180' : ''}`} />
        </div>
      </fieldset>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#b4b0b0] rounded shadow-lg z-50">
          {/* No inclusion option */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("No inclusion");
              setShowDropdown(false);
            }}
            className={`w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors ${
              value === "No inclusion" ? 'bg-green-50 text-[#34a853]' : 'text-[#1d1d1b]'
            }`}
          >
            No inclusion
          </button>

          {/* Model with Tissue + inline quantity controls */}
          <div
            className={`flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer ${
              value === "Model with Tissue + QTY" ? 'bg-green-50' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (value !== "Model with Tissue + QTY") {
                onChange("Model with Tissue + QTY");
              }
            }}
          >
            <span className={`text-xs ${value === "Model with Tissue + QTY" ? 'text-[#34a853]' : 'text-[#1d1d1b]'}`}>
              Model with Tissue + QTY
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (value !== "Model with Tissue + QTY") onChange("Model with Tissue + QTY");
                  onQuantityChange(Math.max(0, quantity - 1));
                }}
                className="w-8 h-8 rounded border border-[#b4b0b0] bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <span className="text-base text-[#7f7f7f]">−</span>
              </button>
              <span className="text-sm font-semibold text-[#1d1d1b] min-w-[24px] text-center">
                {value === "Model with Tissue + QTY" ? quantity : 0}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (value !== "Model with Tissue + QTY") onChange("Model with Tissue + QTY");
                  onQuantityChange(quantity + 1);
                }}
                className="w-8 h-8 rounded border border-[#b4b0b0] bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <span className="text-base text-[#7f7f7f]">+</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Card Selection Field (without inline cards) ---- */
function CardSelectorField({
  label,
  value,
  required = false,
  isActive = false,
  onClick,
}: {
  label: string;
  value: string;
  required?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const hasValue = value.trim().length > 0;
  const borderColor = required && !value ? "border-[#cf0202]" : hasValue ? "border-[#34a853]" : "border-[#b4b0b0]";
  const legendColor = required && !value ? "text-[#cf0202] font-semibold" : hasValue ? "text-[#34a853]" : "text-[#7f7f7f]";

  return (
    <fieldset
      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${borderColor}`}
      onClick={onClick}
    >
      <legend className={`text-xs px-1 leading-none whitespace-nowrap ${legendColor}`}>
        {label}
      </legend>
      <div className="flex items-center gap-2 w-full">
        <span className="text-xs text-[#1d1d1b] flex-1 truncate">{value || `Select ${label}`}</span>
        {hasValue && <Check size={16} className="text-[#34a853] flex-shrink-0" />}
        <ChevronDown size={16} className={`text-[#7f7f7f] transition-transform flex-shrink-0 ${isActive ? 'rotate-180' : ''}`} />
      </div>
    </fieldset>
  );
}

/* ---- Card Gallery Component ---- */
function CardGallery({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="col-span-full mt-3 mb-3">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <button
          type="button"
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-shadow"
        >
          <ChevronDown size={20} className="text-[#7f7f7f] rotate-90" />
        </button>

        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(option);
            }}
            className={`flex-shrink-0 w-[160px] h-[180px] rounded-xl border-2 transition-all ${
              value === option
                ? 'border-[#34a853] bg-white shadow-md'
                : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
            }`}
          >
            <div className="flex flex-col items-center justify-center h-full p-4">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center mb-3">
                <span className="text-4xl font-bold text-gray-400">
                  {option.charAt(0)}
                </span>
              </div>
              <span className="text-sm font-medium text-center text-gray-900 px-2">
                {option}
              </span>
            </div>
          </button>
        ))}

        <button
          type="button"
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-md hover:shadow-lg flex items-center justify-center transition-shadow"
        >
          <ChevronDown size={20} className="text-[#7f7f7f] -rotate-90" />
        </button>
      </div>
    </div>
  );
}

/* ---- Stage Selection Modal ---- */
function StageSelectionModal({
  stages,
  selectedStage,
  onSelect,
  onClose,
}: {
  stages: { name: string; letter: string }[];
  selectedStage?: string;
  onSelect: (stageName: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-screen max-w-[100vw] max-h-[100vh] sm:max-w-[100vw] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4">
          <DialogTitle
            className="text-xl font-semibold"
            style={{
              fontFamily: "Verdana",
              fontWeight: 700,
              fontSize: "30px",
              letterSpacing: "-0.02em",
            }}
          >
            Select stage
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stages.map((stage) => {
              const isSelected = selectedStage === stage.name;
              return (
                <div
                  key={stage.name}
                  onClick={() => onSelect(stage.name)}
                  className={cn(
                    "relative border-2 rounded-xl overflow-hidden transition-all duration-200 bg-white flex flex-col cursor-pointer",
                    isSelected
                      ? "border-blue-500 shadow-xl"
                      : "border-gray-300 hover:border-blue-500 hover:shadow-lg"
                  )}
                  style={{
                    minHeight: "280px",
                    padding: "8.19608px 26.2275px",
                    gap: "10px",
                  }}
                >
                  <div
                    className="w-full bg-gray-50 overflow-hidden relative flex items-center justify-center"
                    style={{
                      height: "201.62px",
                      borderRadius: "8.19608px",
                      border: "1px solid #E0E0E0",
                    }}
                  >
                    <div className="text-gray-400 text-2xl font-bold flex items-center justify-center absolute inset-0">
                      {stage.letter}
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center text-center"
                    style={{
                      fontFamily: "Verdana",
                      fontWeight: 400,
                      fontSize: "22.949px",
                      lineHeight: "25px",
                      letterSpacing: "-0.02em",
                      color: "#000000",
                      paddingTop: "10px",
                    }}
                  >
                    {stage.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t p-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            style={{
              border: "2px solid #9BA5B7",
              borderRadius: "6px",
              fontFamily: "Verdana",
              fontWeight: 700,
              fontSize: "12px",
              color: "#9BA5B7",
            }}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CaseDesignProps {
  right1Brand: string;
  setRight1Brand: (v: string) => void;
  right1Platform: string;
  setRight1Platform: (v: string) => void;
  right2Brand: string;
  setRight2Brand: (v: string) => void;
  right2Platform: string;
  setRight2Platform: (v: string) => void;
  onAddProduct?: (arch: "maxillary" | "mandibular") => void;
}

interface AddedProduct {
  id: number;
  product: any;
  arch: string;
  expanded: boolean;
}

function CaseDesignCenter({
  right1Brand, setRight1Brand,
  right1Platform, setRight1Platform,
  right2Brand, setRight2Brand,
  right2Platform, setRight2Platform,
  onAddProduct,
}: CaseDesignProps) {
  const [expandedCard, setExpandedCard] = useState(true);
  const [expandedLeft, setExpandedLeft] = useState(true);
  const [expandedLeft2, setExpandedLeft2] = useState(false);
  const [expandedRight2, setExpandedRight2] = useState(false);
  const [showMaxillary, setShowMaxillary] = useState(true);
  const [showMandibular, setShowMandibular] = useState(true);

  // Impression modal state
  const [showImpressionModal, setShowImpressionModal] = useState(false);
  const [currentImpressionArch, setCurrentImpressionArch] = useState<"maxillary" | "mandibular">("maxillary");
  const [currentImpressionProductId, setCurrentImpressionProductId] = useState("");
  const [selectedImpressions, setSelectedImpressions] = useState<Record<string, number>>({});

  // Add-ons modal state
  const [showAddOnsModal, setShowAddOnsModal] = useState(false);
  const [currentAddOnsArch, setCurrentAddOnsArch] = useState<"maxillary" | "mandibular">("maxillary");
  const [currentAddOnsProductId, setCurrentAddOnsProductId] = useState("");

  // File attachment modal state
  const [showAttachModal, setShowAttachModal] = useState(false);

  // Rush request modal state
  const [showRushModal, setShowRushModal] = useState(false);
  const [currentRushArch, setCurrentRushArch] = useState<"maxillary" | "mandibular">("maxillary");
  const [currentRushProductId, setCurrentRushProductId] = useState("");
  // Track which products have rush confirmed: key = "arch_productId"
  const [rushedProducts, setRushedProducts] = useState<Record<string, any>>({});

  // Tooth selection state
  const [maxillaryTeeth, setMaxillaryTeeth] = useState<number[]>([4, 5]);
  const [mandibularTeeth, setMandibularTeeth] = useState<number[]>([19, 20]);

  // Retention types per tooth
  const [maxillaryRetentionTypes, setMaxillaryRetentionTypes] = useState<Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>>({});
  const [mandibularRetentionTypes, setMandibularRetentionTypes] = useState<Record<number, Array<'Implant' | 'Prep' | 'Pontic'>>>({});

  // Popover state
  const [retentionPopoverState, setRetentionPopoverState] = useState<{
    arch: 'maxillary' | 'mandibular' | null;
    toothNumber: number | null;
  }>({ arch: null, toothNumber: null });

  // Shade selection state
  const [shadeSelectionState, setShadeSelectionState] = useState<{
    arch: 'maxillary' | 'mandibular' | null;
    fieldType: 'tooth_shade' | 'stump_shade' | null;
    productId: string | null;
  }>({ arch: null, fieldType: null, productId: null });

  const [selectedShades, setSelectedShades] = useState<Record<string, string>>({});

  // Shade guide selection state
  const [selectedShadeGuide, setSelectedShadeGuide] = useState<string>("Vita Classical");
  const [showShadeGuideDropdown, setShowShadeGuideDropdown] = useState<boolean>(false);

  const shadeGuideOptions = ["Vita Classical", "Chromascop", "Trubyte Bioform IPN"];

  // Implant card selection state - tracks which card type is active for each tooth
  const [activeCardType, setActiveCardType] = useState<{
    right1: 'brand' | 'platform' | null;
    right2: 'brand' | 'platform' | null;
  }>({ right1: null, right2: null });

  // Implant inclusions state
  const [right1Inclusion, setRight1Inclusion] = useState<string>("1x Model with tissue");
  const [right1InclusionQty, setRight1InclusionQty] = useState<number>(1);
  const [right2Inclusion, setRight2Inclusion] = useState<string>("1x Model with tissue");
  const [right2InclusionQty, setRight2InclusionQty] = useState<number>(1);

  // Stage modal state
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);
  const [currentStageProductId, setCurrentStageProductId] = useState<string>("");
  const [selectedStages, setSelectedStages] = useState<Record<string, string>>({
    fixed_45: "Finish",
    fixed_19: "Finish",
  });

  const stageOptions = [
    { name: "Digital design", letter: "D" },
    { name: "Finish", letter: "F" },
  ];

  // ---- Added products state (cached in localStorage) ----
  const [addedProducts, setAddedProducts] = useState<AddedProduct[]>([]);

  // Load cached products on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("cdc_added_products");
      if (cached) {
        setAddedProducts(JSON.parse(cached));
      }
    } catch (e) {
      console.error("Failed to load cached products:", e);
    }
  }, []);

  // Persist to localStorage on change
  const persistAddedProducts = (products: AddedProduct[]) => {
    setAddedProducts(products);
    try {
      localStorage.setItem("cdc_added_products", JSON.stringify(products));
    } catch (e) {
      console.error("Failed to cache products:", e);
    }
  };

  const handleRemoveAddedProduct = (productId: number) => {
    persistAddedProducts(addedProducts.filter(p => p.id !== productId));
  };

  const toggleAddedProductExpanded = (productId: number) => {
    persistAddedProducts(
      addedProducts.map(p =>
        p.id === productId ? { ...p, expanded: !p.expanded } : p
      )
    );
  };

  const handleOpenStageModal = (productId: string) => {
    setCurrentStageProductId(productId);
    setIsStageModalOpen(true);
  };

  const handleStageSelect = (stageName: string) => {
    setSelectedStages(prev => ({ ...prev, [currentStageProductId]: stageName }));
    setIsStageModalOpen(false);
  };

  // Determine if the selected product for each arch is a Removables category
  const isMaxillaryRemovables = addedProducts
    .filter((ap) => ap.arch === 'maxillary')
    .some((ap) => {
      const name = ap.product?.subcategory?.category?.name || ap.product?.category_name || '';
      return name === 'Removables' || name === 'Removables Restoration';
    });

  const isMandibularRemovables = addedProducts
    .filter((ap) => ap.arch === 'mandibular')
    .some((ap) => {
      const name = ap.product?.subcategory?.category?.name || ap.product?.category_name || '';
      return name === 'Removables' || name === 'Removables Restoration';
    });

  // Handle tooth click for maxillary arch
  const handleMaxillaryToothClick = (toothNumber: number) => {
    if (isMaxillaryRemovables) {
      // Removables: just toggle tooth selection, no retention popover
      setMaxillaryTeeth(prev =>
        prev.includes(toothNumber) ? prev.filter(t => t !== toothNumber) : [...prev, toothNumber]
      );
      return;
    }
    if (maxillaryTeeth.includes(toothNumber)) {
      setRetentionPopoverState({ arch: 'maxillary', toothNumber });
    } else {
      setMaxillaryTeeth(prev => [...prev, toothNumber]);
      setRetentionPopoverState({ arch: 'maxillary', toothNumber });
    }
  };

  // Handle tooth click for mandibular arch
  const handleMandibularToothClick = (toothNumber: number) => {
    if (isMandibularRemovables) {
      // Removables: just toggle tooth selection, no retention popover
      setMandibularTeeth(prev =>
        prev.includes(toothNumber) ? prev.filter(t => t !== toothNumber) : [...prev, toothNumber]
      );
      return;
    }
    if (mandibularTeeth.includes(toothNumber)) {
      setRetentionPopoverState({ arch: 'mandibular', toothNumber });
    } else {
      setMandibularTeeth(prev => [...prev, toothNumber]);
      setRetentionPopoverState({ arch: 'mandibular', toothNumber });
    }
  };

  // Handle retention type selection
  const handleSelectRetentionType = (arch: 'maxillary' | 'mandibular', toothNumber: number, type: 'Implant' | 'Prep' | 'Pontic') => {
    const setter = arch === 'maxillary' ? setMaxillaryRetentionTypes : setMandibularRetentionTypes;
    setter(prev => {
      const current = prev[toothNumber] || [];
      if (current.includes(type)) {
        const { [toothNumber]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [toothNumber]: [type] };
    });
    setRetentionPopoverState({ arch: null, toothNumber: null });
  };

  // Handle tooth deselect from popover
  const handleMaxillaryToothDeselect = (toothNumber: number) => {
    setMaxillaryTeeth(prev => prev.filter(t => t !== toothNumber));
    setMaxillaryRetentionTypes(prev => {
      const { [toothNumber]: _, ...rest } = prev;
      return rest;
    });
    setRetentionPopoverState({ arch: null, toothNumber: null });
  };

  const handleMandibularToothDeselect = (toothNumber: number) => {
    setMandibularTeeth(prev => prev.filter(t => t !== toothNumber));
    setMandibularRetentionTypes(prev => {
      const { [toothNumber]: _, ...rest } = prev;
      return rest;
    });
    setRetentionPopoverState({ arch: null, toothNumber: null });
  };

  // Mock impression options
  const mockImpressions = [
    { id: 1, name: "Clean Impression", code: "clean", value: "clean_impression", label: "Clean Impression" },
    { id: 2, name: "STL File", code: "stl", value: "stl_file", label: "STL File" },
    { id: 3, name: "PVS", code: "pvs", value: "pvs", label: "PVS" },
    { id: 4, name: "Light Body", code: "light_body", value: "light_body", label: "Light Body" },
    { id: 5, name: "Alginate", code: "alginate", value: "alginate", label: "Alginate" },
    { id: 6, name: "Digital Scan", code: "digital_scan", value: "digital_scan", label: "Digital Scan" },
  ];

  const handleOpenImpressionModal = (arch: "maxillary" | "mandibular", productId: string) => {
    setCurrentImpressionArch(arch);
    setCurrentImpressionProductId(productId);
    setShowImpressionModal(true);
  };

  const handleOpenAddOnsModal = (arch: "maxillary" | "mandibular", productId: string) => {
    setCurrentAddOnsArch(arch);
    setCurrentAddOnsProductId(productId);
    setShowAddOnsModal(true);
  };


  const handleOpenRushModal = (arch: "maxillary" | "mandibular", productId: string) => {
    setCurrentRushArch(arch);
    setCurrentRushProductId(productId);
    setShowRushModal(true);
  };

  const handleRushConfirm = (rushData: any) => {
    const key = `${currentRushArch}_${currentRushProductId}`;
    setRushedProducts(prev => ({ ...prev, [key]: rushData }));
  };
  // Build impression display text from selected impressions for a given product/arch
  const getImpressionDisplayText = (productId: string, arch: "maxillary" | "mandibular") => {
    const entries = Object.entries(selectedImpressions).filter(
      ([key, qty]) => key.startsWith(`${productId}_${arch}_`) && qty > 0
    );
    if (entries.length === 0) return "";
    return entries
      .map(([key, qty]) => {
        const identifier = key.replace(`${productId}_${arch}_`, "");
        const impression = mockImpressions.find((i) => i.value === identifier);
        return `${qty}x ${impression?.name || identifier}`;
      })
      .join(", ");
  };

  // Handle shade field click
  const handleShadeFieldClick = (
    arch: 'maxillary' | 'mandibular',
    fieldType: 'tooth_shade' | 'stump_shade',
    productId: string
  ) => {
    setShadeSelectionState({ arch, fieldType, productId });
  };

  // Handle shade selection from SVG
  const handleShadeSelect = (shade: string) => {
    if (shadeSelectionState.arch && shadeSelectionState.fieldType && shadeSelectionState.productId) {
      const key = `${shadeSelectionState.productId}_${shadeSelectionState.arch}_${shadeSelectionState.fieldType}`;
      setSelectedShades(prev => ({ ...prev, [key]: shade }));
      // Close the shade selector
      setShadeSelectionState({ arch: null, fieldType: null, productId: null });
    }
  };

  // Get selected shade for a field
  const getSelectedShade = (productId: string, arch: 'maxillary' | 'mandibular', fieldType: 'tooth_shade' | 'stump_shade') => {
    const key = `${productId}_${arch}_${fieldType}`;
    return selectedShades[key] || '';
  };

  const maxTeeth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const mandTeeth = [
    32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17,
  ];

  return (
    <div className="px-2 md:px-4 py-4">
      {/* Title */}
      <h2 className="text-center text-sm md:text-base font-bold text-[#1d1d1b] tracking-wide mb-3 md:mb-4">
        CASE DESIGN CENTER
      </h2>

      {/* Main two-panel layout - responsive */}
      <div className="flex flex-col lg:flex-row lg:gap-0 gap-4">
        {/* ====== LEFT PANEL - MAXILLARY ====== */}
        <div className="flex-1 min-w-0 px-0 md:px-3 order-1 lg:order-none">
          {/* Maxillary header - centered */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 mb-3">
            <h3 className="text-xs md:text-sm font-bold text-[#1d1d1b] tracking-wide">
              MAXILLARY
            </h3>
            <button 
              onClick={() => onAddProduct?.('maxillary')}
              className="flex items-center gap-1.5 bg-[#1162A8] hover:bg-[#0d4a85] shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-center px-2.5 py-0 rounded-md">
              <Plus size={13} strokeWidth={1.5} />
              Add Product
            </button>
          </div>

          {/* Eye toggle - always visible */}
          <div className="flex justify-start mb-1">
            <button
              onClick={() => setShowMaxillary(!showMaxillary)}
              className="flex-shrink-0 w-[28.5px] h-[28.5px] flex items-center justify-center bg-white rounded-full shadow-[0.75px_0.75px_3px_rgba(0,0,0,0.25)] hover:shadow-[0.75px_0.75px_5px_rgba(0,0,0,0.35)] transition-shadow"
              title={showMaxillary ? "Hide Maxillary" : "Show Maxillary"}
            >
              {showMaxillary
                ? <Eye size={13.5} className="text-[#b4b0b0]" />
                : <EyeOff size={13.5} className="text-[#b4b0b0]" />
              }
            </button>
          </div>

          {/* Maxillary section - conditionally shown */}
          {showMaxillary && (
            <>
              {/* Teeth row */}
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <MaxillaryTeethSVG
                    selectedTeeth={maxillaryTeeth}
                    onToothClick={handleMaxillaryToothClick}
                    className="w-full"
                    retentionTypesByTooth={maxillaryRetentionTypes}
                    showRetentionPopover={retentionPopoverState.arch === 'maxillary'}
                    retentionPopoverTooth={retentionPopoverState.toothNumber}
                    onSelectRetentionType={(tooth, type) => handleSelectRetentionType('maxillary', tooth, type)}
                    onClosePopover={() => setRetentionPopoverState({ arch: null, toothNumber: null })}
                    onDeselectTooth={handleMaxillaryToothDeselect}
                  />
                </div>
              </div>

              {/* Shade Selection Guide - Maxillary */}
              {shadeSelectionState.arch === 'maxillary' && (
                <div className="mb-4 border border-[#1162A8] rounded-lg p-4 bg-white">
                  {/* Only show header if no shade is selected */}
                  {!getSelectedShade(
                    shadeSelectionState.productId || '',
                    'maxillary',
                    shadeSelectionState.fieldType || 'tooth_shade'
                  ) && (
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-[#1d1d1b]">
                        Select {shadeSelectionState.fieldType === 'tooth_shade' ? 'Tooth' : 'Stump'} Shade
                        <span className="text-[#cf0202]">*</span>
                      </h4>
                      <button
                        onClick={() => setShadeSelectionState({ arch: null, fieldType: null, productId: null })}
                        className="text-[#7f7f7f] hover:text-[#1d1d1b] text-xl leading-none"
                        title="Close"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Show close button in top-right when shade is selected */}
                  {getSelectedShade(
                    shadeSelectionState.productId || '',
                    'maxillary',
                    shadeSelectionState.fieldType || 'tooth_shade'
                  ) && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => setShadeSelectionState({ arch: null, fieldType: null, productId: null })}
                        className="text-[#7f7f7f] hover:text-[#1d1d1b] text-xl leading-none"
                        title="Close"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Three fields side by side */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {/* Shade Guide Selector Dropdown */}
                    <div className="relative">
                      <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                        <legend className="text-xs text-[#34a853] px-1 leading-none">
                          Shade guide selected
                        </legend>
                        <button
                          onClick={() => setShowShadeGuideDropdown(!showShadeGuideDropdown)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="text-xs text-[#1d1d1b]">{selectedShadeGuide}</span>
                          <div className="flex items-center gap-2">
                            <Check size={16} className="text-[#34a853]" />
                            <ChevronDown size={16} className={`text-[#7f7f7f] transition-transform ${showShadeGuideDropdown ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                      </fieldset>

                      {/* Dropdown Menu */}
                      {showShadeGuideDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d9d9d9] rounded-lg shadow-lg z-10 overflow-hidden">
                          {shadeGuideOptions.map((option) => (
                            <button
                              key={option}
                              onClick={() => {
                                setSelectedShadeGuide(option);
                                setShowShadeGuideDropdown(false);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                                selectedShadeGuide === option ? 'bg-gray-50' : ''
                              }`}
                            >
                              {selectedShadeGuide === option && (
                                <Check size={16} className="text-[#34a853]" />
                              )}
                              <span className={selectedShadeGuide === option ? 'ml-0' : 'ml-6'}>
                                {option}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stump Shade Field Display */}
                    <fieldset
                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                        getSelectedShade(
                          shadeSelectionState.productId || '',
                          'maxillary',
                          'stump_shade'
                        ) ? 'border-[#34a853]' : 'border-[#cf0202]'
                      }`}
                      onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'stump_shade' }))}
                    >
                      <legend className={`text-xs px-1 leading-none ${
                        getSelectedShade(
                          shadeSelectionState.productId || '',
                          'maxillary',
                          'stump_shade'
                        ) ? 'text-[#34a853]' : 'text-[#cf0202]'
                      }`}>
                        Stump Shade
                      </legend>
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-xs text-[#1d1d1b]">
                          {getSelectedShade(
                            shadeSelectionState.productId || '',
                            'maxillary',
                            'stump_shade'
                          ) ? `${selectedShadeGuide} - ${getSelectedShade(
                            shadeSelectionState.productId || '',
                            'maxillary',
                            'stump_shade'
                          )}` : ''}
                        </span>
                        {getSelectedShade(
                          shadeSelectionState.productId || '',
                          'maxillary',
                          'stump_shade'
                        ) && <Check size={16} className="text-[#34a853] ml-auto" />}
                      </div>
                    </fieldset>

                    {/* Tooth Shade Field Display */}
                    <fieldset
                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                        getSelectedShade(
                          shadeSelectionState.productId || '',
                          'maxillary',
                          'tooth_shade'
                        ) ? 'border-[#34a853]' : 'border-[#cf0202]'
                      }`}
                      onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'tooth_shade' }))}
                    >
                      <legend className={`text-xs px-1 leading-none ${
                        getSelectedShade(
                          shadeSelectionState.productId || '',
                          'maxillary',
                          'tooth_shade'
                        ) ? 'text-[#34a853]' : 'text-[#cf0202]'
                      }`}>
                        Tooth Shade
                      </legend>
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-xs text-[#1d1d1b]">
                          {getSelectedShade(
                            shadeSelectionState.productId || '',
                            'maxillary',
                            'tooth_shade'
                          ) ? `${selectedShadeGuide} - ${getSelectedShade(
                            shadeSelectionState.productId || '',
                            'maxillary',
                            'tooth_shade'
                          )}` : ''}
                        </span>
                        {getSelectedShade(
                          shadeSelectionState.productId || '',
                          'maxillary',
                          'tooth_shade'
                        ) && <Check size={16} className="text-[#34a853] ml-auto" />}
                      </div>
                    </fieldset>
                  </div>

                  <ToothShadeSelectionSVG
                    selectedShades={shadeSelectionState.fieldType ? [getSelectedShade(
                      shadeSelectionState.productId || '',
                      'maxillary',
                      shadeSelectionState.fieldType
                    )] : []}
                    onShadeClick={handleShadeSelect}
                    className="w-full"
                  />
                </div>
              )}

              {/* Status boxes */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex items-center justify-center bg-[#F3EBD7] rounded-md h-[65px]">
                  <p className="font-[Verdana] text-sm leading-[26px] tracking-[-0.02em] text-center text-black">
                    Teeth in mouth
                    <br />
                    #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
                  </p>
                </div>
                <div className="flex items-center justify-center bg-[#E9E8E7] rounded-md h-[65px]">
                  <p className="font-[Verdana] text-sm leading-[26px] tracking-[-0.02em] text-center text-black">
                    Missing teeth
                    <br />
                    #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="flex items-center justify-center bg-[#E92520] rounded-md h-[65px]">
                  <p className="font-[Verdana] text-sm font-bold leading-[26px] tracking-[-0.02em] text-center text-white">
                    Will extract on delivery
                    <br />
                    #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
                  </p>
                </div>
                <div className="flex items-center justify-center bg-[#A0F69A] rounded-md h-[65px]">
                  <p className="font-[Verdana] text-sm leading-[26px] tracking-[-0.02em] text-center text-black">
                    Fix/Repair
                    <br />
                    #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="flex items-center justify-center bg-[#FFD1F9] rounded-md h-[65px]">
                  <p className="font-[Verdana] text-sm leading-[26px] tracking-[-0.02em] text-center text-black">
                    Clasp
                    <br />
                    #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
                  </p>
                </div>
                <div className="flex items-center justify-center bg-[#0CE7C6] rounded-md h-[65px]">
                  <p className="font-[Verdana] text-sm leading-[26px] tracking-[-0.02em] text-center text-black">
                    Custom tooth status
                    <br />
                    #1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16
                  </p>
                </div>
              </div>

              {/* Restoration product card (Metal frame acrylic) - full accordion */}
              <div className={`rounded-lg bg-white overflow-hidden ${rushedProducts["maxillary_removable_1"] ? "border-2 border-[#CF0202]" : "border border-[#d9d9d9]"}`}>
                {/* Accordion header */}
            <button
              type="button"
              onClick={() => setExpandedLeft(!expandedLeft)}
              className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${rushedProducts["maxillary_removable_1"] ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]" : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"}`}
            >
              <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src="/placeholder.svg?height=48&width=48&query=dental+partial+denture+tooth"
                  alt="Restoration"
                  className="w-[61.58px] h-[28.79px] object-contain"
                />
              </div>
              <div className="flex-1 min-w-0 text-left flex flex-col">
                <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black flex items-center gap-1">
                  Metal frame acrylic
                  {rushedProducts["maxillary_removable_1"] && <Zap className="w-[14px] h-[14px] text-[#CF0202] flex-shrink-0" strokeWidth={2} fill="#CF0202" />}
                </p>
                <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                  #4,5
                </p>
                <div className="flex items-center gap-[5px] flex-wrap">
                  <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                    Removable Restoration
                  </span>
                  <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                    Partial denture
                  </span>
                  <span className={`font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] ${rushedProducts["maxillary_removable_1"] ? "text-[#CF0202] font-medium" : "text-[#B4B0B0]"}`}>
                    Est days: {rushedProducts["maxillary_removable_1"] ? "5 work days after submission" : "10 work days after submission"}
                  </span>
                  <Trash2 size={9} className="text-[#999999]" />
                </div>
              </div>
              <ChevronDown
                size={21.6}
                className={`text-black flex-shrink-0 transition-transform ${expandedLeft ? "rotate-180" : ""}`}
              />
            </button>

            {/* Accordion body */}
            {expandedLeft && (
              <div className="border-t border-[#d9d9d9] p-4 bg-white space-y-3">
                {/* Grade / Stage */}
                <div className="grid grid-cols-2 gap-3">
                  <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                    <legend className="text-xs text-[#34a853] px-1 leading-none">
                      Grade
                    </legend>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#1d1d1b]">Standard</span>
                      <div className="flex gap-1 ml-auto">
                        {/* Diamond icons: 2 blue, 2 gray */}
                        <svg width="30" height="24" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M30 6.84708L14.9998 23.4212L0 6.84708L6.93035 0H23.07L30 6.84708Z" fill="#45B2EF" />
                          <path d="M7.96094 6.84708H0L6.93035 0L7.96094 6.84708Z" fill="#45B2EF" />
                          <path d="M14.9996 23.4212L-0.000244141 6.84708H7.96069L14.9996 23.4212Z" fill="#3B9FE2" />
                          <path d="M14.9996 23.4212L7.96068 6.84708H22.0388L14.9996 23.4212Z" fill="#45B2EF" />
                          <path d="M22.0388 6.84708H7.96068L14.9996 0L22.0388 6.84708Z" fill="#80D4FD" />
                          <path d="M29.9998 6.84708H22.0388L23.0698 0L29.9998 6.84708Z" fill="#45B2EF" />
                          <path d="M29.9998 6.84708L14.9996 23.4212L22.0389 6.84708H29.9998Z" fill="#3B9FE2" />
                          <path d="M14.9996 0L7.96075 6.84708L6.93016 0H14.9996Z" fill="#4FC1F8" />
                          <path d="M23.0698 0L22.0389 6.84708L14.9996 0H23.0698Z" fill="#4FC1F8" />
                        </svg>
                        <svg width="30" height="24" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M30 6.84708L14.9998 23.4212L0 6.84708L6.93035 0H23.07L30 6.84708Z" fill="#45B2EF" />
                          <path d="M7.96094 6.84708H0L6.93035 0L7.96094 6.84708Z" fill="#45B2EF" />
                          <path d="M14.9996 23.4212L-0.000244141 6.84708H7.96069L14.9996 23.4212Z" fill="#3B9FE2" />
                          <path d="M14.9996 23.4212L7.96068 6.84708H22.0388L14.9996 23.4212Z" fill="#45B2EF" />
                          <path d="M22.0388 6.84708H7.96068L14.9996 0L22.0388 6.84708Z" fill="#80D4FD" />
                          <path d="M29.9998 6.84708H22.0388L23.0698 0L29.9998 6.84708Z" fill="#45B2EF" />
                          <path d="M29.9998 6.84708L14.9996 23.4212L22.0389 6.84708H29.9998Z" fill="#3B9FE2" />
                          <path d="M14.9996 0L7.96075 6.84708L6.93016 0H14.9996Z" fill="#4FC1F8" />
                          <path d="M23.0698 0L22.0389 6.84708L14.9996 0H23.0698Z" fill="#4FC1F8" />
                        </svg>
                        <svg width="30" height="24" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M30 6.84708L14.9998 23.4212L0 6.84708L6.93035 0H23.07L30 6.84708Z" fill="#575756" />
                          <path d="M7.96094 6.84708H0L6.93035 0L7.96094 6.84708Z" fill="#575756" />
                          <path d="M14.9996 23.4212L-0.000244141 6.84708H7.96069L14.9996 23.4212Z" fill="#706F6F" />
                          <path d="M14.9995 23.4212L7.96066 6.84708H22.0388L14.9995 23.4212Z" fill="#575756" />
                          <path d="M22.0388 6.84708H7.96066L14.9995 0L22.0388 6.84708Z" fill="#3C3C3B" />
                          <path d="M29.9998 6.84708H22.0388L23.0698 0L29.9998 6.84708Z" fill="#575756" />
                          <path d="M29.9998 6.84708L14.9996 23.4212L22.0389 6.84708H29.9998Z" fill="#706F6F" />
                          <path d="M14.9996 0L7.96073 6.84708L6.93015 0H14.9996Z" fill="#1D1D1B" />
                          <path d="M23.0698 0L22.0389 6.84708L14.9996 0H23.0698Z" fill="#1D1D1B" />
                        </svg>
                        <svg width="30" height="24" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M30 6.84708L14.9998 23.4212L0 6.84708L6.93035 0H23.07L30 6.84708Z" fill="#575756" />
                          <path d="M7.96094 6.84708H0L6.93035 0L7.96094 6.84708Z" fill="#575756" />
                          <path d="M14.9996 23.4212L-0.000244141 6.84708H7.96069L14.9996 23.4212Z" fill="#706F6F" />
                          <path d="M14.9995 23.4212L7.96066 6.84708H22.0388L14.9995 23.4212Z" fill="#575756" />
                          <path d="M22.0388 6.84708H7.96066L14.9995 0L22.0388 6.84708Z" fill="#3C3C3B" />
                          <path d="M29.9998 6.84708H22.0388L23.0698 0L29.9998 6.84708Z" fill="#575756" />
                          <path d="M29.9998 6.84708L14.9996 23.4212L22.0389 6.84708H29.9998Z" fill="#706F6F" />
                          <path d="M14.9996 0L7.96073 6.84708L6.93015 0H14.9996Z" fill="#1D1D1B" />
                          <path d="M23.0698 0L22.0389 6.84708L14.9996 0H23.0698Z" fill="#1D1D1B" />
                        </svg>

                      </div>
                      <Check size={16} className="text-[#34a853]" />
                    </div>
                  </fieldset>
                  <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                    <legend className="text-xs text-[#34a853] px-1 leading-none">
                      Stage
                    </legend>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#1d1d1b]">Try in with teeth</span>
                      <Check size={16} className="text-[#34a853]" />
                      <div className="ml-auto">
                        {/* Articulator icon */}
                       
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* Teeth shade / Gum Shade */}
                <div className="grid grid-cols-2 gap-3">
                  <ShadeField
                    label="Teeth shade"
                    value="Vita Classical"
                    shade={getSelectedShade("removable_metal_frame", "maxillary", "tooth_shade") || "A2"}
                    onClick={() => handleShadeFieldClick("maxillary", "tooth_shade", "removable_metal_frame")}
                  />
                  <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                    <legend className="text-xs text-[#34a853] px-1 leading-none">
                      Gum Shade
                    </legend>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue="GC Initial Gingiva, G-Intense"
                        className="flex-1 text-xs text-[#1d1d1b] bg-transparent outline-none leading-tight min-w-0"
                      />
                      <svg width="29" height="29" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="28.0391" height="28.0391" rx="6" fill="#E58D8D" />
                      </svg>
                      <Check size={16} className="text-[#34a853]" />
                    </div>
                  </fieldset>
                </div>

                {/* Impression / Add ons */}
                <div className="grid grid-cols-2 gap-3">
                  <FieldInput
                    label="Impression"
                    value={getImpressionDisplayText("removable_1", "maxillary") || "1x Clean impression, 1x STL"}
                    onClick={() => handleOpenImpressionModal("maxillary", "removable_1")}
                  />
                  <FieldInput label="Add ons" value="1x Gold tooth, 2x clasps, 1x custom tray..." onClick={() => handleOpenAddOnsModal("maxillary", "removable_1")} />
                </div>

                {/* Bottom action buttons */}
                <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                  <button onClick={() => handleOpenAddOnsModal("maxillary", "removable_1")} className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors">
                    <Plus size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                    <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Add ons (3 selected)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAttachModal(true)}
                    className="flex-none order-1 flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                  >
                    <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                    <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Attach Files (15 uploads)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenRushModal("maxillary", "removable_1")}
                    className={`relative flex-none order-3 flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] shadow-[0_0_2.9px_rgba(207,2,2,0.67)] flex items-center justify-center gap-1.5 hover:bg-[#f0f0f0] transition-colors ${rushedProducts["maxillary_removable_1"] ? "bg-[#CF0202]" : "bg-[#F9F9F9]"}`}
                  >
                    <span className={`font-["Verdana"] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] whitespace-nowrap ${rushedProducts["maxillary_removable_1"] ? "text-white" : "text-black"}`}>
                      {rushedProducts["maxillary_removable_1"] ? "Rushed" : "Request Rush"}
                    </span>
                    <Zap className={`w-[8.78px] h-[10.54px] flex-shrink-0 ${rushedProducts["maxillary_removable_1"] ? "text-white" : "text-[#CF0202]"}`} strokeWidth={0.878154} />
                  </button>
                </div>
              </div>
            )}
          </div>

              {/* Dynamically added maxillary products */}
              {addedProducts
                .filter(ap => ap.arch === "maxillary")
                .map(ap => (
                <div key={ap.id} className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3">
                  {/* Accordion header */}
                  <button
                    type="button"
                    onClick={() => toggleAddedProductExpanded(ap.id)}
                    className="w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] bg-[#DFEEFB] hover:bg-[#d4e8f8]"
                  >
                    <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {ap.product.image_url ? (
                        <img src={ap.product.image_url} alt={ap.product.name || "Product"} className="w-[61.58px] h-[28.79px] object-contain" />
                      ) : (
                        <div className="w-[61.58px] h-[28.79px] bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-[10px] text-gray-400">No img</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left flex flex-col">
                      <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                        {ap.product.name || "Untitled Product"}
                      </p>
                      <div className="flex items-center gap-[5px] flex-wrap">
                        {ap.product.category_name && (
                          <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                            {ap.product.category_name}
                          </span>
                        )}
                        {ap.product.subcategory_name && (
                          <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                            {ap.product.subcategory_name}
                          </span>
                        )}
                        <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-[#B4B0B0]">
                          Est days: 10 work days after submission
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAddedProduct(ap.id); }}
                          className="ml-1 hover:text-red-500 transition-colors"
                          title="Remove product"
                        >
                          <Trash2 size={9} className="text-[#999999] hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                    <ChevronDown
                      size={21.6}
                      className={`text-black flex-shrink-0 transition-transform ${ap.expanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Accordion body */}
                  {ap.expanded && (
                    <div className="border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldInput
                          label="Product - Material"
                          value={ap.product.name || ""}
                        />
                        <FieldInput
                          label="Category"
                          value={ap.product.category_name || ap.product.category?.name || ""}
                        />
                      </div>
                      {ap.product.code && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FieldInput
                            label="Product Code"
                            value={ap.product.code}
                          />
                          <FieldInput
                            label="Arch"
                            value={ap.arch === "maxillary" ? "Maxillary (Upper)" : "Mandibular (Lower)"}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                        <button
                          type="button"
                          onClick={() => handleOpenAddOnsModal("maxillary", `added_${ap.id}`)}
                          className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                        >
                          <Plus size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                          <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Add ons</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAttachModal(true)}
                          className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                        >
                          <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                          <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Attach Files</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

            </>
          )}

        </div>

        {/* ====== CENTER NAVIGATION (in the gap) - Toggle buttons ====== */}
        <div className="flex items-center justify-center pt-6 flex-shrink-0 w-16 order-2 lg:order-none gap-1">
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

        {/* ====== RIGHT PANEL - MANDIBULAR + CASE DETAIL ====== */}
        <div className="flex-1 min-w-0 px-0 md:px-3 order-3 lg:order-none">
          {/* Mandibular header - with eye toggle in same row */}
          <div className="flex flex-row items-center justify-center gap-2 md:gap-3 mb-3 relative">
            <button
              onClick={() => onAddProduct?.('mandibular')}
              className="flex items-center gap-1.5 bg-[#1162A8] hover:bg-[#0d4a85] shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)] text-white font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-center px-2.5 py-0 rounded-md">
              <Plus size={13} strokeWidth={1.5} />
              Add Product
            </button>
            <h3 className="text-xs md:text-sm font-bold text-[#1d1d1b] tracking-wide">
              MANDIBULAR
            </h3>
            <button
              onClick={() => setShowMandibular(!showMandibular)}
              className="absolute right-0 flex-shrink-0 w-[28.5px] h-[28.5px] flex items-center justify-center bg-white rounded-full shadow-[0.75px_0.75px_3px_rgba(0,0,0,0.25)] hover:shadow-[0.75px_0.75px_5px_rgba(0,0,0,0.35)] transition-shadow"
              title={showMandibular ? "Hide Mandibular" : "Show Mandibular"}
            >
              {showMandibular
                ? <Eye size={13.5} className="text-[#b4b0b0]" />
                : <EyeOff size={13.5} className="text-[#b4b0b0]" />
              }
            </button>
          </div>

          {/* Mandibular section - conditionally shown */}
          {showMandibular && (
            <>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <MandibularTeethSVG
                    selectedTeeth={mandibularTeeth}
                    onToothClick={handleMandibularToothClick}
                    className="w-full"
                    retentionTypesByTooth={mandibularRetentionTypes}
                    showRetentionPopover={retentionPopoverState.arch === 'mandibular'}
                    retentionPopoverTooth={retentionPopoverState.toothNumber}
                    onSelectRetentionType={(tooth, type) => handleSelectRetentionType('mandibular', tooth, type)}
                    onClosePopover={() => setRetentionPopoverState({ arch: null, toothNumber: null })}
                    onDeselectTooth={handleMandibularToothDeselect}
                  />
                </div>
              </div>

              {/* Shade Selection Guide - Mandibular */}
              {shadeSelectionState.arch === 'mandibular' && (
                <div className="mb-4 mt-4 border border-[#1162A8] rounded-lg p-4 bg-white">
                  {/* Only show header if no shade is selected */}
                  {!getSelectedShade(
                    shadeSelectionState.productId || '',
                    'mandibular',
                    shadeSelectionState.fieldType || 'tooth_shade'
                  ) && (
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-[#1d1d1b]">
                        Select {shadeSelectionState.fieldType === 'tooth_shade' ? 'Tooth' : 'Stump'} Shade
                        <span className="text-[#cf0202]">*</span>
                      </h4>
                      <button
                        onClick={() => setShadeSelectionState({ arch: null, fieldType: null, productId: null })}
                        className="text-[#7f7f7f] hover:text-[#1d1d1b] text-xl leading-none"
                        title="Close"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Show close button in top-right when shade is selected */}
                  {getSelectedShade(
                    shadeSelectionState.productId || '',
                    'mandibular',
                    shadeSelectionState.fieldType || 'tooth_shade'
                  ) && (
                    <div className="flex justify-end mb-3">
                      <button
                        onClick={() => setShadeSelectionState({ arch: null, fieldType: null, productId: null })}
                        className="text-[#7f7f7f] hover:text-[#1d1d1b] text-xl leading-none"
                        title="Close"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Three fields side by side */}
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    {/* Shade Guide Selector Dropdown */}
                    <div className="relative">
                      <fieldset className="border border-[#34a853] rounded px-3 py-0 relative h-[42px] flex items-center">
                        <legend className="text-xs text-[#34a853] px-1 leading-none">
                          Shade guide selected
                        </legend>
                        <button
                          onClick={() => setShowShadeGuideDropdown(!showShadeGuideDropdown)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="text-xs text-[#1d1d1b]">{selectedShadeGuide}</span>
                          <div className="flex items-center gap-2">
                            <Check size={16} className="text-[#34a853]" />
                            <ChevronDown size={16} className={`text-[#7f7f7f] transition-transform ${showShadeGuideDropdown ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                      </fieldset>

                      {/* Dropdown Menu */}
                      {showShadeGuideDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d9d9d9] rounded-lg shadow-lg z-10 overflow-hidden">
                          {shadeGuideOptions.map((option) => (
                            <button
                              key={option}
                              onClick={() => {
                                setSelectedShadeGuide(option);
                                setShowShadeGuideDropdown(false);
                              }}
                              className={`w-full px-4 py-2.5 text-left text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                                selectedShadeGuide === option ? 'bg-gray-50' : ''
                              }`}
                            >
                              {selectedShadeGuide === option && (
                                <Check size={16} className="text-[#34a853]" />
                              )}
                              <span className={selectedShadeGuide === option ? 'ml-0' : 'ml-6'}>
                                {option}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stump Shade Field Display */}
                    <fieldset
                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                        getSelectedShade(
                          shadeSelectionState.productId || '',
                          'mandibular',
                          'stump_shade'
                        ) ? 'border-[#34a853]' : 'border-[#cf0202]'
                      }`}
                      onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'stump_shade' }))}
                    >
                      <legend className={`text-xs px-1 leading-none ${
                        getSelectedShade(
                          shadeSelectionState.productId || '',
                          'mandibular',
                          'stump_shade'
                        ) ? 'text-[#34a853]' : 'text-[#cf0202]'
                      }`}>
                        Stump Shade
                      </legend>
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-xs text-[#1d1d1b]">
                          {getSelectedShade(
                            shadeSelectionState.productId || '',
                            'mandibular',
                            'stump_shade'
                          ) ? `${selectedShadeGuide} - ${getSelectedShade(
                            shadeSelectionState.productId || '',
                            'mandibular',
                            'stump_shade'
                          )}` : ''}
                        </span>
                        {getSelectedShade(
                          shadeSelectionState.productId || '',
                          'mandibular',
                          'stump_shade'
                        ) && <Check size={16} className="text-[#34a853] ml-auto" />}
                      </div>
                    </fieldset>

                    {/* Tooth Shade Field Display */}
                    <fieldset
                      className={`border rounded px-3 py-0 relative h-[42px] flex items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                        getSelectedShade(
                          shadeSelectionState.productId || '',
                          'mandibular',
                          'tooth_shade'
                        ) ? 'border-[#34a853]' : 'border-[#cf0202]'
                      }`}
                      onClick={() => setShadeSelectionState(prev => ({ ...prev, fieldType: 'tooth_shade' }))}
                    >
                      <legend className={`text-xs px-1 leading-none ${
                        getSelectedShade(
                          shadeSelectionState.productId || '',
                          'mandibular',
                          'tooth_shade'
                        ) ? 'text-[#34a853]' : 'text-[#cf0202]'
                      }`}>
                        Tooth Shade
                      </legend>
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-xs text-[#1d1d1b]">
                          {getSelectedShade(
                            shadeSelectionState.productId || '',
                            'mandibular',
                            'tooth_shade'
                          ) ? `${selectedShadeGuide} - ${getSelectedShade(
                            shadeSelectionState.productId || '',
                            'mandibular',
                            'tooth_shade'
                          )}` : ''}
                        </span>
                        {getSelectedShade(
                          shadeSelectionState.productId || '',
                          'mandibular',
                          'tooth_shade'
                        ) && <Check size={16} className="text-[#34a853] ml-auto" />}
                      </div>
                    </fieldset>
                  </div>

                  <ToothShadeSelectionSVG
                    selectedShades={shadeSelectionState.fieldType ? [getSelectedShade(
                      shadeSelectionState.productId || '',
                      'mandibular',
                      shadeSelectionState.fieldType
                    )] : []}
                    onShadeClick={handleShadeSelect}
                    className="w-full"
                  />
                </div>
              )}

              {/* ---- Case Detail Card for #19 ---- */}
          <div className={`rounded-lg bg-white overflow-hidden ${rushedProducts["mandibular_fixed_19"] ? "border-2 border-[#CF0202]" : "border border-[#d9d9d9]"}`}>
            {/* Card header - same style as left accordion */}
            <button
              type="button"
              onClick={() => setExpandedCard(!expandedCard)}
              className={`w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] ${rushedProducts["mandibular_fixed_19"] ? "bg-[#FCE4E4] hover:bg-[#f8d4d4]" : "bg-[#DFEEFB] hover:bg-[#d4e8f8]"}`}
            >
              <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img
                  src="/placeholder.svg?height=48&width=48&query=dental+crown+implant+tooth"
                  alt="Tooth 19"
                  className="w-[61.58px] h-[28.79px] object-contain"
                />
              </div>
              <div className="flex-1 min-w-0 text-left flex flex-col">
                <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black flex items-center gap-1">
                  Full contour Zirconia
                  {rushedProducts["mandibular_fixed_19"] && <Zap className="w-[14px] h-[14px] text-[#CF0202] flex-shrink-0" strokeWidth={2} fill="#CF0202" />}
                </p>
                <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                  #19
                </p>
                <div className="flex items-center gap-[5px] flex-wrap">
                  <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                    Fixed Restoration
                  </span>
                  <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                    Single Crown
                  </span>
                  <span className={`font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] ${rushedProducts["mandibular_fixed_19"] ? "text-[#CF0202] font-medium" : "text-[#B4B0B0]"}`}>
                    Est days: {rushedProducts["mandibular_fixed_19"] ? "7 work days" : "10 work days after submission"}
                  </span>
                  <Trash2 size={9} className="text-[#999999]" />
                </div>
              </div>
              <ChevronDown
                size={21.6}
                className={`text-black flex-shrink-0 transition-transform ${expandedCard ? "rotate-180" : ""}`}
              />
            </button>

            {/* Card body - full expanded content */}
            {expandedCard && (
              <div className="border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3">
                {/* Product - Material / Select Retention type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput
                    label="Product - Material"
                    value="Full contour - Zirconia"
                  />
                  <FieldInput
                    label="Select Retention type"
                    value="Screwed retained"
                  />
                </div>

                {/* Implant Detail fieldset (nested) */}
                <fieldset className="border border-[#7f7f7f] rounded-[7.7px] p-0 bg-white">
                  <legend className="text-[12.8px] text-[#7f7f7f] px-1 leading-none ml-2">
                    Implant Detail
                  </legend>
                  <div className="flex flex-col sm:flex-row">
                    {/* Left section - tooth number */}
                    <div className="flex justify-center items-center sm:w-[90px] shrink-0 py-2 sm:py-0">
                      <span className="text-xl text-[#7f7f7f] text-center">
                        #19
                      </span>
                    </div>
                    {/* Right section - form fields */}
                    <div className="flex flex-col p-2.5 sm:pl-0 sm:pr-2.5 sm:py-2.5 gap-3 flex-1 min-w-0">
                      {/* Row 1: Implant Brand, Platform, Size - 3 columns */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <CardSelectorField
                          label="Implant Brand"
                          value={right1Brand}
                          isActive={activeCardType.right1 === 'brand'}
                          onClick={() => {
                            setActiveCardType(prev => ({
                              ...prev,
                              right1: prev.right1 === 'brand' ? null : 'brand'
                            }));
                          }}
                        />

                        <CardSelectorField
                          label="Implant Platform"
                          value={right1Platform}
                          required={!right1Platform}
                          isActive={activeCardType.right1 === 'platform'}
                          onClick={() => {
                            if (!right1Brand) return; // Can't select platform without brand
                            setActiveCardType(prev => ({
                              ...prev,
                              right1: prev.right1 === 'platform' ? null : 'platform'
                            }));
                          }}
                        />

                        <SelectField
                          label="Implant Size"
                          value="4.5mm"
                          options={["3.5mm", "4mm", "4.5mm", "5mm", "5.5mm", "6mm"]}
                          onChange={() => {}}
                        />

                        {/* Shared Card Gallery - appears below the 3 fields */}
                        {activeCardType.right1 === 'brand' && (
                          <CardGallery
                            options={implantBrandList}
                            value={right1Brand}
                            onChange={(v) => {
                              setRight1Brand(v);
                              setRight1Platform("");
                              // Auto-switch to platform selection after brand is selected
                              setActiveCardType(prev => ({ ...prev, right1: 'platform' }));
                            }}
                          />
                        )}

                        {activeCardType.right1 === 'platform' && (
                          <CardGallery
                            options={right1Brand ? (implantBrandPlatforms[right1Brand] || []) : []}
                            value={right1Platform}
                            onChange={(v) => {
                              setRight1Platform(v);
                              // Close cards after platform is selected
                              setActiveCardType(prev => ({ ...prev, right1: null }));
                            }}
                          />
                        )}
                      </div>

                      {/* Row 2: Implant Inclusions - full width */}
                      <ImplantInclusionsField
                        label="Implant inclusions"
                        value={right1Inclusion}
                        quantity={right1InclusionQty}
                        onChange={setRight1Inclusion}
                        onQuantityChange={setRight1InclusionQty}
                      />

                      {/* Row 3: Abutment Detail and Type - 2 columns */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <SelectField
                          label="Abutment Detail"
                          value="Office to provide"
                          options={["Office provided", "Lab provided", "Custom"]}
                          onChange={() => {}}
                        />
                        <SelectField
                          label="Abutment Type"
                          value="Custom Abutment"
                          options={["Stock Abutment", "Custom Abutment", "Multi-Unit abutment"]}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>

                {/* Stage / Stump Shade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput label="Stage" value={selectedStages["fixed_19"] || "Finish"} onClick={() => handleOpenStageModal("fixed_19")} />
                  <ShadeField
                    label="Stump Shade"
                    value="Vita Classical"
                    shade={getSelectedShade("fixed_19", "mandibular", "stump_shade")}
                    onClick={() => handleShadeFieldClick("mandibular", "stump_shade", "fixed_19")}
                  />
                </div>

                {/* Cervical / Incisal / Body Shade */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <ShadeField
                    label="Cervical Shade"
                    value="Vita Classical"
                    shade={getSelectedShade("fixed_19", "mandibular", "tooth_shade") || "A2"}
                    onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", "fixed_19")}
                  />
                  <ShadeField
                    label="Incisal Shade"
                    value="Vita Classical"
                    shade={getSelectedShade("fixed_19", "mandibular", "tooth_shade") || "A2"}
                    onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", "fixed_19")}
                  />
                  <ShadeField
                    label="Body Shade"
                    value="Vita Classical"
                    shade={getSelectedShade("fixed_19", "mandibular", "tooth_shade") || "A2"}
                    onClick={() => handleShadeFieldClick("mandibular", "tooth_shade", "fixed_19")}
                  />
                </div>

                {/* Characterization / Intensity / Surface finish */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FieldInput label="Characterization" value="Natural" />
                  <FieldInput label="Intensity" value="2" />
                  <FieldInput label="Surface finish" value="Natural" />
                </div>

                {/* Occlusal Contact / Pontic Design / Embrasures / Proximal Contact */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <IconField label="Occlusal Contact" value="In Occlusion" icon="occlusal" />
                  <IconField label="Pontic Design" value="Modified Ridge" icon="pontic" />
                  <IconField label="Embrasures" value="Type II" icon="embrasures" />
                  <IconField label="Proximal Contact" value="Open Contact" icon="proximal" />
                </div>

                {/* Margin Design / Margin Depth / Occlusal Reduction / Axial Reduction */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <FieldInput label="Margin Design" value="Chamfer" />
                  <FieldInput label="Margin Depth" value="0.1 mm" />
                  <FieldInput label="Occlusal Reduction" value="0.1 mm" />
                  <FieldInput label="Axial Reduction" value="0.1 mm" />
                </div>

                {/* Metal Design / Metal Thickness / Modification */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FieldInput label="Metal Design" value="1/4 metal cusps" />
                  <FieldInput label="Metal Thickness" value="0.2mm" />
                  <FieldInput label="Modification" value="Preserve Anatomy" />
                </div>

                {/* Proximal Contact Mesial / Distal / Functional Guidance */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FieldInput label="Proximal Contact – Mesial" value="Light" />
                  <FieldInput label="Proximal Contact – Distal" value="Light" />
                  <FieldInput label="Functional Guidance" value="Canine guidance" />
                </div>

                {/* Impression / Add ons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldInput
                    label="Impression"
                    value={getImpressionDisplayText("fixed_19", "mandibular") || "1x STL, 1x PVS, 1x Light body"}
                    onClick={() => handleOpenImpressionModal("mandibular", "fixed_19")}
                  />
                  <FieldInput label="Add ons" value="1x gold tooth, 1x characterization, 1x spe..." onClick={() => handleOpenAddOnsModal("mandibular", "fixed_19")} />
                </div>

                {/* Additional notes */}
                <fieldset className="border border-[#34a853] rounded px-3 pb-2 pt-0">
                  <legend className="text-xs text-[#34a853] px-1 leading-none flex items-center gap-1">
                    Additional notes
                    <Check size={12} className="text-[#34a853]" />
                  </legend>
                  <textarea
                    defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident. Sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci."
                    rows={5}
                    className="w-full text-xs text-[#1d1d1b] bg-transparent outline-none leading-relaxed resize-none"
                  />
                </fieldset>

                {/* Bottom action buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAttachModal(true)}
                    className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                  >
                    <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                    <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Attach Files (1 uploads)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenRushModal("mandibular", "fixed_19")}
                    className={`relative flex-none w-[123.04px] h-[46.22px] rounded-[5.27px] shadow-[0_0_2.9px_rgba(207,2,2,0.67)] flex items-center justify-center gap-1.5 hover:bg-[#f0f0f0] transition-colors ${rushedProducts["mandibular_fixed_19"] ? "bg-[#CF0202]" : "bg-[#F9F9F9]"}`}
                  >
                    <span className={`font-["Verdana"] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] whitespace-nowrap ${rushedProducts["mandibular_fixed_19"] ? "text-white" : "text-black"}`}>
                      {rushedProducts["mandibular_fixed_19"] ? "Rushed" : "Request Rush"}
                    </span>
                    <Zap className={`w-[8.78px] h-[10.54px] flex-shrink-0 ${rushedProducts["mandibular_fixed_19"] ? "text-white" : "text-[#CF0202]"}`} strokeWidth={0.878154} />
                  </button>
                  <button className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors">
                    <Settings size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                    <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Additional Setting</span>
                  </button>
                </div>
              </div>
            )}
          </div>

              {/* Dynamically added mandibular products */}
              {addedProducts
                .filter(ap => ap.arch === "mandibular")
                .map(ap => (
                <div key={ap.id} className="rounded-lg bg-white overflow-hidden border border-[#d9d9d9] mt-3">
                  {/* Accordion header */}
                  <button
                    type="button"
                    onClick={() => toggleAddedProductExpanded(ap.id)}
                    className="w-full flex items-center py-[14px] px-2 gap-[10px] transition-colors rounded-t-[5.4px] shadow-[0.9px_0.9px_3.6px_rgba(0,0,0,0.25)] bg-[#DFEEFB] hover:bg-[#d4e8f8]"
                  >
                    <div className="w-16 h-[62px] rounded-md bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {ap.product.image_url ? (
                        <img src={ap.product.image_url} alt={ap.product.name || "Product"} className="w-[61.58px] h-[28.79px] object-contain" />
                      ) : (
                        <div className="w-[61.58px] h-[28.79px] bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-[10px] text-gray-400">No img</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left flex flex-col">
                      <p className="font-[Verdana] text-[14.4px] leading-[20px] tracking-[-0.02em] text-black">
                        {ap.product.name || "Untitled Product"}
                      </p>
                      <div className="flex items-center gap-[5px] flex-wrap">
                        {ap.product.category_name && (
                          <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                            {ap.product.category_name}
                          </span>
                        )}
                        {ap.product.subcategory_name && (
                          <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-black bg-[#F9F9F9] px-[10px] rounded-md shadow-[1px_1px_3.5px_rgba(0,0,0,0.25)]">
                            {ap.product.subcategory_name}
                          </span>
                        )}
                        <span className="font-[Verdana] text-[10px] leading-[22px] tracking-[-0.02em] text-[#B4B0B0]">
                          Est days: 10 work days after submission
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAddedProduct(ap.id); }}
                          className="ml-1 hover:text-red-500 transition-colors"
                          title="Remove product"
                        >
                          <Trash2 size={9} className="text-[#999999] hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                    <ChevronDown
                      size={21.6}
                      className={`text-black flex-shrink-0 transition-transform ${ap.expanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Accordion body */}
                  {ap.expanded && (
                    <div className="border-t border-[#d9d9d9] p-2.5 sm:p-4 bg-white space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FieldInput
                          label="Product - Material"
                          value={ap.product.name || ""}
                        />
                        <FieldInput
                          label="Category"
                          value={ap.product.category_name || ap.product.category?.name || ""}
                        />
                      </div>
                      {ap.product.code && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FieldInput
                            label="Product Code"
                            value={ap.product.code}
                          />
                          <FieldInput
                            label="Arch"
                            value={ap.arch === "maxillary" ? "Maxillary (Upper)" : "Mandibular (Lower)"}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-4 pt-3 border-t border-[#d9d9d9] mt-3">
                        <button
                          type="button"
                          onClick={() => handleOpenAddOnsModal("mandibular", `added_${ap.id}`)}
                          className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                        >
                          <Plus size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                          <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Add ons</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAttachModal(true)}
                          className="flex-none flex-grow-0 w-[123.04px] h-[46.22px] rounded-[5.27px] bg-[#F9F9F9] shadow-[0.88px_0.88px_3.07px_rgba(0,0,0,0.25)] flex flex-col items-center justify-center gap-0.5 hover:bg-[#f0f0f0] transition-colors"
                        >
                          <Paperclip size={10} className="text-[#1E1E1E]" strokeWidth={1.5} />
                          <span className="font-['Verdana'] font-normal text-[8.78px] leading-[19px] text-center tracking-[-0.02em] text-black whitespace-nowrap">Attach Files</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

            </>
          )}

        </div>
      </div>

      {/* Impression Selection Modal */}
      <ImpressionSelectionModal
        isOpen={showImpressionModal}
        onClose={() => setShowImpressionModal(false)}
        impressions={mockImpressions}
        selectedImpressions={selectedImpressions}
        onUpdateQuantity={(key, qty) => {
          setSelectedImpressions((prev) => ({ ...prev, [key]: qty }));
        }}
        onRemoveImpression={(key) => {
          setSelectedImpressions((prev) => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
          });
        }}
        productId={currentImpressionProductId}
        arch={currentImpressionArch}
      />

      {/* Add-Ons Modal */}
      <AddOnsModal
        isOpen={showAddOnsModal}
        onClose={() => setShowAddOnsModal(false)}
        onAddAddOns={(addOns) => {
          console.log("Add-ons added:", addOns)
        }}
        labId={0}
        productId={currentAddOnsProductId}
        arch={currentAddOnsArch}
      />

      {/* Stage Selection Modal */}
      {isStageModalOpen && (
        <StageSelectionModal
          stages={stageOptions}
          selectedStage={selectedStages[currentStageProductId]}
          onSelect={handleStageSelect}
          onClose={() => setIsStageModalOpen(false)}
        />
      )}

      {/* File Attachment Modal */}
      <Dialog open={showAttachModal} onOpenChange={setShowAttachModal}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-hidden flex flex-col p-0">
          <FileAttachmentModalContent
            setShowAttachModal={setShowAttachModal}
            isCaseSubmitted={false}
          />
        </DialogContent>
      </Dialog>

      {/* Rush Request Modal */}
      <RushRequestModal
        isOpen={showRushModal}
        onClose={() => setShowRushModal(false)}
        onConfirm={handleRushConfirm}
        product={{
          name: currentRushProductId === "removable_1" ? "Metal Frame Acrylic" : "Full contour Zirconia",
          stage: currentRushProductId === "removable_1" ? "Bite Block" : "Finish",
          deliveryDate: currentRushProductId === "removable_1" ? "01/25/2025 at 4pm" : "02/10/2025 at 4pm",
          price: 100,
        }}
      />

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Case Summary Notes                                                 */
/* ------------------------------------------------------------------ */
interface NotesProps {
  right1Brand: string;
  right1Platform: string;
  right2Brand: string;
  right2Platform: string;
}

function CaseSummaryNotes({ right1Brand, right1Platform, right2Brand, right2Platform }: NotesProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "maxillary" | "mandibular">("mandibular");
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  /* ---- Default notes from formula templates ---- */

  const defaultMaxillary = `Fabricate full contour zirconia crowns for #4–5 in the finish stage, using tooth shade Vita 3D Master A2 and stump shade A2. Retention: screw-retained. Design specifications: Modified ridge pontic, Type II embrasures, POS pontic design, open proximal contact, standard occlusal contact. Impression: STL file. Add-ons selected`;

  const defaultMandibular = `Fabricate a full contour zirconia crown for #19 in the finish stage, using tooth shade Vita 3D Master A2 and stump shade A2. Retention: screw-retained implant. Implant: ${right1Brand || "TruAbutment"}, ${right1Platform || "Truscan platform"}, 4.5 mm, with tissue model; using a custom abutment provided by the office. Design specifications: Modified ridge pontic, Type II embrasures, POS pontic design, open proximal contact, standard occlusal contact. Impression: STL file. Add-ons selected.`;

  const [noteText, setNoteText] = useState(
    `Maxillary: ${defaultMaxillary}\n\nMANDIBULAR: ${defaultMandibular}`
  );

  const getDisplayValue = () => {
    if (activeTab === "summary") return noteText;
    if (activeTab === "maxillary") {
      const match = noteText.match(/Maxillary:\s*([\s\S]*?)(?=\n\nMANDIBULAR:|$)/i);
      return match ? `Maxillary: ${match[1].trim()}` : noteText;
    }
    const match = noteText.match(/MANDIBULAR:\s*([\s\S]*?)$/i);
    return match ? `MANDIBULAR: ${match[1].trim()}` : noteText;
  };

  const handleChange = (newValue: string) => {
    if (activeTab === "summary") {
      setNoteText(newValue);
    } else if (activeTab === "maxillary") {
      const mandMatch = noteText.match(/(\n\nMANDIBULAR:[\s\S]*$)/i);
      setNoteText(newValue + (mandMatch ? mandMatch[1] : ""));
    } else {
      const maxMatch = noteText.match(/^([\s\S]*?\n\n)(?=MANDIBULAR:)/i);
      setNoteText((maxMatch ? maxMatch[1] : "") + newValue);
    }
  };

  const tabs = [
    { key: "summary" as const, icon: ClipboardList, title: "Stage Notes" },
    { key: "maxillary" as const, icon: ClipboardCheck, title: "Maxillary Notes" },
    { key: "mandibular" as const, icon: CheckCircle2, title: "Lab Connect Notes" },
  ];

  return (
    <div className="mx-4 mb-4">
      <div className="flex items-start">
        {/* Left side icon buttons */}
        {!collapsed && (
          <div className="flex flex-col flex-shrink-0">
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isFirst = idx === 0;
              const isLast = idx === tabs.length - 1;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-[37px] h-[53px] flex items-center justify-center border border-[#7f7f7f] -my-[1px] transition-colors ${
                    isFirst ? "rounded-tl-[11px]" : ""
                  } ${isLast ? "rounded-bl-[11px]" : ""} ${
                    isActive
                      ? "bg-[#1162a8] border-[#1162a8]"
                      : "bg-white hover:bg-[#f0f0f0]"
                  }`}
                  title={tab.title}
                >
                  <Icon size={16} className={isActive ? "text-white" : "text-[#7f7f7f]"} />
                </button>
              );
            })}
          </div>
        )}

        {/* Right side - textarea as fieldset */}
        <fieldset
          className={`flex-1 relative border border-[#7f7f7f] bg-white transition-all ${
            collapsed
              ? "rounded-[8px] h-[40px]"
              : expanded
                ? "rounded-r-[8px] h-[300px]"
                : "rounded-r-[8px] h-[158px]"
          }`}
        >
          <legend className="ml-2 px-1 text-sm text-[#7f7f7f] font-normal">
            Case summary notes
          </legend>

          {collapsed ? (
            <div className="flex items-center justify-between px-[15px] h-[20px]">
              <span className="text-sm text-[#7f7f7f] truncate flex-1">
                {getDisplayValue().slice(0, 80)}...
              </span>
              <div className="flex items-center gap-[5px] flex-shrink-0 ml-2">
                <button onClick={() => setCollapsed(false)} title="Expand">
                  <ChevronDown size={14} className="text-[#b4b0b0] hover:text-[#7f7f7f] transition-colors" />
                </button>
                <button onClick={() => { setCollapsed(false); setExpanded(true); }} title="Full view">
                  <Maximize2 size={14} className="text-[#b4b0b0] hover:text-[#7f7f7f] transition-colors" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start px-[15px] pb-[5px] h-[calc(100%-14px)]">
              <textarea
                value={getDisplayValue()}
                onChange={(e) => handleChange(e.target.value)}
                className="flex-1 h-full text-[17px] leading-[18px] text-black font-normal resize-none outline-none bg-transparent"
              />
              <div className="flex items-center gap-[5px] flex-shrink-0 ml-2 pt-1">
                <button onClick={() => { setCollapsed(true); setExpanded(false); }} title="Collapse">
                  <ChevronUp size={14} className="text-[#b4b0b0] hover:text-[#7f7f7f] transition-colors" />
                </button>
                <button onClick={() => setExpanded(!expanded)} title={expanded ? "Default size" : "Expand"}>
                  <Maximize2 size={14} className={`hover:text-[#7f7f7f] transition-colors ${expanded ? "text-[#1162a8]" : "text-[#b4b0b0]"}`} />
                </button>
              </div>
            </div>
          )}
        </fieldset>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Floating Action Buttons                                            */
/* ------------------------------------------------------------------ */
function FloatingActions() {
  const [expanded, setExpanded] = useState(true);

  const actions = [
    { icon: <ArrowLeftRight size={20} className="text-white" strokeWidth={2} />, bg: "bg-[#6366F1]", hover: "hover:bg-[#4F46E5]", label: "Edit Stage" },
    { icon: <Printer size={17} className="text-white" strokeWidth={1.5} />, bg: "bg-[#F59E0B]", hover: "hover:bg-[#D97706]", label: "Print" },
    { icon: <ClipboardCheck size={17} className="text-white" strokeWidth={1.5} />, bg: "bg-[#34C759]", hover: "hover:bg-[#2DA44E]", label: "Pick Up" },
    { icon: <Phone size={17} className="text-white" strokeWidth={1.5} />, bg: "bg-[#1162A8]", hover: "hover:bg-[#0E5290]", label: "Phone" },
    { icon: <List size={21} className="text-white" strokeWidth={2} />, bg: "bg-[#64748B]", hover: "hover:bg-[#475569]", label: "List" },
    { icon: <Calendar size={17} className="text-white" strokeWidth={1.5} />, bg: "bg-[#1162A8]", hover: "hover:bg-[#0E5290]", label: "Calendar" },
    { icon: <Send size={17} className="text-white" strokeWidth={1.5} />, bg: "bg-[#1162A8]", hover: "hover:bg-[#0E5290]", label: "Send" },
    { icon: <FlaskConical size={20} className="text-white" strokeWidth={1.5} />, bg: "bg-[#1162A8]", hover: "hover:bg-[#0E5290]", label: "Send to Lab" },
    { icon: <Truck size={17} className="text-white" strokeWidth={1.5} />, bg: "bg-[#1162A8]", hover: "hover:bg-[#0E5290]", label: "Delivery" },
    { icon: <Building2 size={17} className="text-white" strokeWidth={1.5} />, bg: "bg-[#1162A8]", hover: "hover:bg-[#0E5290]", label: "Return to Office" },
    { icon: <Zap size={17} className="text-white" strokeWidth={2} />, bg: "bg-[#CF0202]", hover: "hover:bg-[#A80101]", label: "Rush" },
    { icon: <Pause size={29} className="text-white" strokeWidth={1.5} />, bg: "bg-[#FF9500]", hover: "hover:bg-[#E08600]", label: "On Hold" },
    { icon: <X size={26} className="text-white" strokeWidth={1.5} />, bg: "bg-[#CF0202]", hover: "hover:bg-[#A80101]", label: "Cancel" },
  ];

  return (
    <div className="fixed bottom-6 right-6 flex items-center z-50">
      {/* Action buttons container */}
      <div className="flex items-center gap-[10px] overflow-hidden mr-[10px]">
        {actions.map((action, i) => (
          <button
            key={action.label}
            className={`w-[46.67px] h-[46.67px] shrink-0 rounded-full ${action.bg} ${action.hover} flex items-center justify-center drop-shadow-[2px_4px_6px_rgba(0,0,0,0.25)] transition-all duration-500 ease-in-out`}
            style={{
              transform: expanded ? "translateX(0)" : "translateX(calc(100% + 10px))",
              opacity: expanded ? 1 : 0,
              transitionDelay: expanded
                ? `${i * 30}ms`
                : `${(actions.length - 1 - i) * 30}ms`,
            }}
          >
            {action.icon}
          </button>
        ))}
      </div>
      {/* More (Ellipsis) - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-[46.67px] h-[46.67px] shrink-0 rounded-full bg-[#64748B] hover:bg-[#475569] flex items-center justify-center drop-shadow-[2px_4px_6px_rgba(0,0,0,0.25)] transition-transform duration-300"
      >
        <MoreHorizontal size={17} className="text-white" strokeWidth={2} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PAGE                                                               */
/* ------------------------------------------------------------------ */
export default function Page() {
  const [wizardComplete, setWizardComplete] = useState(false);
  const [completedDoctor, setCompletedDoctor] = useState<WizardDoctorShape | null>(null);
  const [completedLab, setCompletedLab] = useState<WizardLabShape | null>(null);
  const [completedPatientName, setCompletedPatientName] = useState<string>("");
  const [completedGender, setCompletedGender] = useState<string>("");
  const [labEditMode, setLabEditMode] = useState(false);
  const [doctorEditMode, setDoctorEditMode] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [right1Brand, setRight1Brand] = useState("Truabutment");
  const [right1Platform, setRight1Platform] = useState("Truscan");
  const [right2Brand, setRight2Brand] = useState("Nobel Biocare");
  const [right2Platform, setRight2Platform] = useState("Active");
  const [confirmDetailsChecked, setConfirmDetailsChecked] = useState(false);
  const [caseSubmitted, setCaseSubmitted] = useState(false);

  // ---- Add Product via wizard redirect ----
  const [wizardMode, setWizardMode] = useState<"initial" | "addProduct">("initial");
  const [pendingProductArch, setPendingProductArch] = useState<"maxillary" | "mandibular">("maxillary");

  // Load cached added products
  const [addedProducts, setAddedProducts] = useState<AddedProduct[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem("cdc_added_products");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const persistProducts = (products: AddedProduct[]) => {
    setAddedProducts(products);
    try {
      localStorage.setItem("cdc_added_products", JSON.stringify(products));
    } catch (e) {
      console.error("Failed to cache products:", e);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRole(localStorage.getItem("role"));
  }, []);

  const handleWizardComplete = (result: any) => {
    if (wizardMode === "addProduct") {
      // Add the selected product as a new accordion layer
      const newProduct: AddedProduct = {
        id: Date.now(),
        product: {
          name: result.material || result.product || "Untitled Product",
          category_name: result.category || "",
          subcategory_name: result.product || "",
          code: "",
          image_url: "",
        },
        arch: pendingProductArch,
        expanded: true,
      };
      persistProducts([...addedProducts, newProduct]);
      // Return to CaseDesignCenter
      setWizardMode("initial");
      setWizardComplete(true);
    } else {
      // Normal initial wizard completion – store selected doctor, lab, and patient for headers
      setCompletedDoctor(result?.doctor ?? null);
      setCompletedLab(result?.lab ?? null);
      setCompletedPatientName(result?.patientName ?? "");
      setCompletedGender(result?.gender ?? "");
      setLabEditMode(false);
      setDoctorEditMode(false);
      setWizardComplete(true);
    }
  };

  const handleAddProduct = (arch: "maxillary" | "mandibular") => {
    setPendingProductArch(arch);
    setWizardMode("addProduct");
    setWizardComplete(false); // Show wizard again at categories step
  };

  const handleTopBarEditLab = () => {
    setLabEditMode(true);
    setDoctorEditMode(false);
    setWizardComplete(false);
  };

  const handleEditDoctor = () => {
    setDoctorEditMode(true);
    setLabEditMode(false);
    setWizardComplete(false);
  };

  const wizardStartStep = !wizardComplete && labEditMode
    ? (role === "office_admin" ? 2 : 1)
    : !wizardComplete && doctorEditMode
    ? (role === "office_admin" ? 1 : 2)
    : (wizardMode === "addProduct" ? 4 : 1);

  return (
    <div className="flex h-screen bg-[#f5f5f5] overflow-hidden">
      <main className="flex-1 flex flex-col overflow-auto min-w-0">
        <TopBar
          selectedLab={completedLab ? { logo: completedLab.logo, name: completedLab.name } : null}
          onEditClick={wizardComplete ? handleTopBarEditLab : undefined}
        />
        {wizardComplete ? (
          <>
            <PatientHeader
              doctorImageUrl={completedDoctor?.img}
              doctorName={completedDoctor?.name}
              patientName={completedPatientName}
              gender={completedGender}
              caseSubmitted={caseSubmitted}
              onEditDoctorClick={handleEditDoctor}
            />
            <CaseDesignCenter
              right1Brand={right1Brand}
              setRight1Brand={setRight1Brand}
              right1Platform={right1Platform}
              setRight1Platform={setRight1Platform}
              right2Brand={right2Brand}
              setRight2Brand={setRight2Brand}
              right2Platform={right2Platform}
              setRight2Platform={setRight2Platform}
              onAddProduct={handleAddProduct}
            />
            <CaseSummaryNotes
              right1Brand={right1Brand}
              right1Platform={right1Platform}
              right2Brand={right2Brand}
              right2Platform={right2Platform}
            />
            {/* Spacer for fixed footer */}
            <div style={{ height: "80px" }} />
          </>
        ) : (
          <NewCaseWizard
            onComplete={handleWizardComplete}
            startStep={wizardStartStep}
            mode={wizardMode}
            initialLabId={doctorEditMode && completedLab ? completedLab.id : null}
            initialPatientName={wizardMode === "addProduct" ? completedPatientName : ""}
            initialGender={wizardMode === "addProduct" ? completedGender : ""}
            initialDoctor={wizardMode === "addProduct" && completedDoctor ? completedDoctor : undefined}
          />
        )}
      </main>

      {/* Footer - outside main to avoid overflow clipping */}
      {wizardComplete && !caseSubmitted && (
        <SlipCreationStepFooter
          mode="submit"
          confirmDetailsChecked={confirmDetailsChecked}
          isAccordionComplete={() => true}
          onConfirmDetailsChange={setConfirmDetailsChecked}
          onSubmit={() => {
            console.log("Submit case")
            setCaseSubmitted(true)
          }}
        />
      )}
      {caseSubmitted && <FloatingActions />}
    </div>
  );
}
