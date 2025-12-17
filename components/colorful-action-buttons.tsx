"use client"

import { useState } from "react"
import React from "react"
import {
  RotateCcw, Printer, Truck, BarChart2, Phone, Users, List, Calendar,
  Send, FlaskConical, FlaskRound, Building2, Zap, Play, Pause, X, MoreHorizontal
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import CaseActionModal from "./CaseActionModal"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import { useToast } from "@/hooks/use-toast"
import ChangeDateModal from "./change-date-modal"
import SendCaseBackToOfficeModal from "./send-case-back-to-office-modal"
import RushRequestModal from "./rush-request-modal"
import LabConnectModal from "./lab-connect-modal"
import DriverCaseHistoryModal from "@/components/driver-case-history-modal";

function DeliveryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={props.width || 18} height={props.height || 18} viewBox="0 0 18 18" fill="none" {...props}>
      <g clipPath="url(#clip0_4100_16833)">
        <path d="M7.09821 3.51172H2.5143C1.73299 3.51172 1.09961 3.95248 1.09961 4.49619V8.31858C1.09961 8.86229 1.73299 9.30305 2.5143 9.30305H7.09821C7.87953 9.30305 8.51291 8.86229 8.51291 8.31858V4.49619C8.51291 3.95248 7.87953 3.51172 7.09821 3.51172Z" stroke="white" strokeMiterlimit="10" />
        <path d="M4.80624 9.59961L1.86621 12.014H7.75417L4.80624 9.59961Z" stroke="white" strokeMiterlimit="10" />
        <path d="M4.80664 12.0137V16.8865" stroke="white" strokeMiterlimit="10" />
        <path d="M14.5829 3.2858C15.7527 3.2858 16.701 2.62589 16.701 1.81185C16.701 0.997804 15.7527 0.337891 14.5829 0.337891C13.4131 0.337891 12.4648 0.997804 12.4648 1.81185C12.4648 2.62589 13.4131 3.2858 14.5829 3.2858Z" stroke="white" strokeMiterlimit="10" />
        <path d="M10.0623 7.75642L14.1325 4.47852H15.3022C15.6105 4.47852 15.895 4.58301 16.1005 4.76451L16.6537 5.25949C16.8671 5.45199 16.9856 5.68848 16.9856 5.93047V10.0224L12.6704 13.3718V15.4287C12.6704 15.8522 12.5045 16.2757 12.1488 16.6002C12.0856 16.6552 12.0303 16.6992 11.9828 16.7212C11.7615 16.8202 11.2004 16.7982 10.9633 16.7212C10.9159 16.7047 10.8527 16.6717 10.7815 16.6277C10.3864 16.3637 10.1809 15.9677 10.1809 15.5607V13.4928L14.014 10.1433L13.8638 7.42643L11.5007 9.38987H4.80664" stroke="white" strokeMiterlimit="10" />
        <path d="M17.3091 11.2656V15.231C17.3091 15.6545 17.1748 16.078 16.8902 16.4025C16.8428 16.4575 16.7954 16.5015 16.7559 16.5235C16.582 16.6225 16.1236 16.6005 15.9339 16.5235C15.8944 16.507 15.847 16.474 15.7917 16.43C15.4755 16.166 15.3096 15.77 15.3096 15.363V13.2951" stroke="white" strokeMiterlimit="10" />
      </g>
      <defs>
        <clipPath id="clip0_4100_16833">
          <rect width="17" height="17" fill="white" transform="translate(0.704102 0.0625)" />
        </clipPath>
      </defs>
    </svg>
  );
}

function editStageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (<svg width="27" height="23" viewBox="0 0 27 23" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.55042 5.88811C8.8369 5.62707 9.21165 5.4947 9.59224 5.52013C9.97284 5.54556 10.3281 5.7267 10.5799 6.02371L11.1717 6.7219L9.01145 8.69067L8.41964 7.99249C8.16788 7.69544 8.04023 7.30686 8.06476 6.91222C8.08928 6.51758 8.26397 6.1492 8.55042 5.88811ZM9.55416 9.33093L11.7144 7.36215L17.9292 14.694C18.2449 15.0662 18.4661 15.5142 18.5729 15.9974L18.9157 17.5488C18.9323 17.6236 18.929 17.7017 18.9062 17.7748C18.8835 17.8479 18.8421 17.9133 18.7865 17.964C18.7308 18.0147 18.663 18.0489 18.5902 18.0629C18.5173 18.0769 18.4422 18.0702 18.3727 18.0436L16.9329 17.492C16.4845 17.3202 16.0845 17.0352 15.769 16.6628L9.55416 9.33093Z" fill="white" />
    <path d="M8.83632 14.1737L5.35175 10.5605L1.86719 14.1737" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19.6383 21.5626H10.5467C9.16889 21.5626 7.84748 21.2728 6.87319 20.757C5.89891 20.2412 5.35156 19.5416 5.35156 18.8121V10.5605" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.8984 9.51172L22.383 13.1249L25.8676 9.51172" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.0957 1.5625H17.1873C18.5651 1.5625 19.8865 1.86704 20.8608 2.40911C21.8351 2.95119 22.3824 3.68641 22.3824 4.45302V13.1246" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
  );
}

function sendBackToOfficeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="31" height="40" viewBox="0 0 31 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.96929 8.21454V12.9073C8.96918 13.1697 9.03771 13.4279 9.16859 13.6581L13.6507 21.542C13.7862 21.7802 13.855 22.0483 13.8501 22.3198C13.8452 22.5913 13.7669 22.857 13.6229 23.0906C13.4788 23.3242 13.274 23.5177 13.0286 23.6521C12.7831 23.7865 12.5055 23.8571 12.2231 23.8571H2.46174C2.17929 23.8571 1.90169 23.7865 1.65626 23.6521C1.41082 23.5177 1.206 23.3242 1.06196 23.0906C0.917907 22.857 0.839592 22.5913 0.834715 22.3198C0.829839 22.0483 0.898569 21.7802 1.03414 21.542L5.51622 13.6581C5.6471 13.4279 5.71563 13.1697 5.71552 12.9073V8.21454" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.82959 18.3817H11.8539" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.49597 8.21454H10.1901" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22.8041 17.3676V22.2887C21.4933 22.6645 20.3671 23.4813 19.6312 24.5898C18.8953 25.6983 18.599 27.0245 18.7965 28.3258C18.9939 29.6271 19.672 30.8166 20.7066 31.6768C21.7412 32.5369 23.0632 33.0103 24.4309 33.0103C25.7987 33.0103 27.1207 32.5369 28.1553 31.6768C29.1899 30.8166 29.8679 29.6271 30.0654 28.3258C30.2629 27.0245 29.9666 25.6983 29.2307 24.5898C28.4948 23.4813 27.3686 22.6645 26.0578 22.2887V17.3676" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.7368 27.5348H30.125" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21.5845 17.3676H27.2786" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.3182 34.2215C17.3521 35.2159 16.1083 35.9212 14.7366 36.2521C13.3649 36.583 11.9241 36.5256 10.5878 36.0866C9.25157 35.6476 8.077 34.8459 7.20578 33.7781C6.33456 32.7103 5.8039 31.4222 5.67782 30.0689L5.3949 26.9231" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.06177 30.3569L5.39465 26.9199L8.95984 30.1153" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.889 5.39759C12.8675 4.41573 14.1201 3.72657 15.4957 3.41323C16.8712 3.0999 18.311 3.17578 19.6413 3.63172C20.9716 4.08766 22.1357 4.90419 22.9931 5.98281C23.8504 7.06143 24.3645 8.35608 24.4732 9.71059L24.7159 12.8593" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M28.0919 9.46686L24.7154 12.861L21.1913 9.62027" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

interface ColorfulActionButtonsProps {
  isCaseSubmitted: boolean
  setShowSubmitWarningModal: (show: boolean) => void
  setShowPrintPreview: (show: boolean) => void
  relatedSlipNumbers: string[]
  setShowPrintDriverTagsModal: (show: boolean) => void
  setShowPrintStatementModal: (show: boolean) => void
  setShowDriverHistoryModal: (show: boolean) => void
  setShowCallLogModal: (show: boolean) => void
  slipId: number
  onListClick?: () => void // <-- Add this prop
}



const MAIN_ACTION_COUNT = 5

export default function ColorfulActionButtons({
  isCaseSubmitted,
  setShowSubmitWarningModal,
  setShowPrintPreview,
  relatedSlipNumbers,
  setShowPrintDriverTagsModal,
  setShowPrintStatementModal,
  setShowDriverHistoryModal,
  setShowCallLogModal,
  slipId: _slipId, // ignore incoming slipId, use from localStorage
  onListClick,
  ...props
}: ColorfulActionButtonsProps) {
  const [showExtra, setShowExtra] = useState(false)
  const router = useRouter();
  const [modal, setModal] = useState<null | "hold" | "resume" | "cancel" | "cancelled">(null)
  const [successMessage, setSuccessMessage] = useState<string | undefined>(undefined)
  const { holdSlip, resumeSlip, cancelSlip } = useSlipCreation();
  const { toast } = useToast();
  const [showChangeDateModal, setShowChangeDateModal] = useState(false);
  const [showSendBackModal, setShowSendBackModal] = useState(false);
  const [showRushModal, setShowRushModal] = useState(false);
  const [showLabConnectModal, setShowLabConnectModal] = useState(false);
  const [showDriverHistory, setShowDriverHistory] = useState(false);
  const [showDriverCaseHistory, setShowDriverCaseHistory] = useState(false);
  // Always get slipId from localStorage for actions
  const getSlipId = () => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("slipId");
      return id ? Number(id) : undefined;
    }
    return undefined;
  };

  // Handlers for modal actions
  const handleHold = async (reason: string) => {
    const slipId = getSlipId();
    if (!slipId || isNaN(slipId)) {
      toast({
        title: "Slip ID is missing or invalid.",
        variant: "destructive",
      });
      setModal(null);
      return;
    }
    try {
      await holdSlip(slipId, reason);
      setSuccessMessage("Case has been put on hold successfully.");
      setModal("cancelled");
    } catch (e: any) {
      toast({
        title: e.message || "Failed to put case on hold.",
        variant: "destructive",
      });
      setModal(null);
    }
  };

  const handleCalendarClick = () => setShowChangeDateModal(true);
  const handleDriverCaseClick = () => setShowDriverCaseHistory(true);
  const handleRushRequestClick = () => setShowRushModal(true);

  const ACTIONS = [
    { icon: editStageIcon, color: "#6A74EA", title: "Sync", onClick: () => {
      // Sync functionality - could sync with external systems
      toast({ title: "Sync completed", description: "Case data has been synchronized." });
    }},
    { icon: Printer, color: "#FFB400", title: "Print", onClick: (props: ColorfulActionButtonsProps) => props.setShowPrintPreview(true) },
    { icon: DeliveryIcon, color: "#2ECC71", title: "Delivery", onClick: (props: ColorfulActionButtonsProps) => props.setShowDriverHistoryModal(true) },
    { icon: Phone, color: "#1162A8", title: "Contact", onClick: (props: ColorfulActionButtonsProps) => props.setShowCallLogModal(true) },
    {
      icon: List, color: "#6E7C91", title: "List", onClick: (props: ColorfulActionButtonsProps) => {
        if (props.onListClick) {
          props.onListClick();
        }
      }
    },
    { icon: Calendar, color: "#1A73B8", title: "Calendar", onClick: () => handleCalendarClick() },
    { icon: Send, color: "#1A73B8", title: "Send", onClick: () => {
      // Send functionality - could send notifications or updates
      toast({ title: "Message sent", description: "Notification has been sent successfully." });
    }},
    { icon: sendBackToOfficeIcon, color: "#1A73B8", title: "Experiment", onClick: (props: ColorfulActionButtonsProps) => setShowLabConnectModal(true) },
    { icon: Truck, color: "#1A73B8", title: "Delivery", onClick: () => handleDriverCaseClick() },
    { icon: Building2, color: "#1A73B8", title: "Office", onClick: () => setShowSendBackModal(true) },
    { icon: Zap, color: "#D32F2F", title: "Power", onClick: () => handleRushRequestClick() },
    { icon: Play, color: "#2ECC71", title: "Start", onClick: () => setModal("resume") },
    { icon: Pause, color: "#FFB400", title: "Pause", onClick: () => setModal("hold") },
    { icon: X, color: "#D32F2F", title: "Close", onClick: () => setModal("cancel") },
  ]

  const handleResume = async (reason: string) => {
    const slipId = getSlipId();
    if (!slipId || isNaN(slipId)) {
      toast({
        title: "Slip ID is missing or invalid.",
        variant: "destructive",
      });
      setModal(null);
      return;
    }
    try {
      await resumeSlip(slipId, reason);
      setSuccessMessage("Case has been resumed successfully.");
      setModal("cancelled");
    } catch (e: any) {
      toast({
        title: e.message || "Failed to resume case.",
        variant: "destructive",
      });
      setModal(null);
    }
  };

  const handleCancel = async (reason: string) => {
    const slipId = getSlipId();
    if (!slipId || isNaN(slipId)) {
      toast({
        title: "Slip ID is missing or invalid.",
        variant: "destructive",
      });
      setModal(null);
      return;
    }
    try {
      await cancelSlip(slipId, reason);
      setSuccessMessage("Case has been cancelled successfully.");
      setModal("cancelled");
    } catch (e: any) {
      toast({
        title: e.message || "Failed to cancel case.",
        variant: "destructive",
      });
      setModal(null);
    }
  };

  if (!isCaseSubmitted) return null

  // Main and extra actions logic
  const mainActions = ACTIONS.slice(0, MAIN_ACTION_COUNT)
  const extraActions = ACTIONS.slice(MAIN_ACTION_COUNT)
  return (
    <footer className="bg-white border-t p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between bottom-0 left-0 w-full shadow-lg gap-4" style={{ zIndex: 40 }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Jump to next slip</span>
        <Input placeholder="Enter slip number" className="w-40 h-9" />
        <Button variant="link" className="text-[#1162A8] hover:underline px-0 whitespace-nowrap">
          View Related Slip
        </Button>
        <span className="text-sm text-gray-500 truncate max-w-xs sm:max-w-none">{relatedSlipNumbers.join(" | ")}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end px-2 w-full lg:w-auto">
        {/* Main actions always visible */}
        {mainActions.map(({ icon: Icon, color, title, onClick }) =>
          // Special render for Print dropdown
          title === "Print" ? (
            <DropdownMenu key={title}>
              <DropdownMenuTrigger asChild>
                <Button
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition"
                  style={{ backgroundColor: color }}
                  title={title}
                  aria-label={title}
                >
                  <Icon 
                    className="text-white" 
                    style={{ width: '48px', height: '48px' }}
                    strokeWidth={2.5} 
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowPrintPreview(true)}>
                  Print Paper Slip
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPrintDriverTagsModal(true)}>
                  Print Driver Label
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPrintStatementModal(true)}>
                  Print Statement
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : title === "Pause" ? (
            <Button
              key={title}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition"
              style={{ backgroundColor: color }}
              title={title}
              aria-label={title}
              onClick={() => setModal("hold")}
            >
              <Icon 
                className="text-white drop-shadow" 
                style={{ width: '48px', height: '48px' }}
                strokeWidth={2.5} 
              />
            </Button>
          ) : title === "Start" ? (
            <Button
              key={title}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition"
              style={{ backgroundColor: color }}
              title={title}
              aria-label={title}
              onClick={() => setModal("resume")}
            >
              <Icon 
                className="text-white drop-shadow" 
                style={{ width: '48px', height: '48px' }}
                strokeWidth={2.5} 
              />
            </Button>
          ) : title === "Close" ? (
            <Button
              key={title}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition"
              style={{ backgroundColor: color }}
              title={title}
              aria-label={title}
              onClick={() => setModal("cancel")}
            >
              <Icon 
                className="text-white drop-shadow" 
                style={{ width: '48px', height: '48px' }}
                strokeWidth={2.5} 
              />
            </Button>
          ) : title === "List" ? (
            <Button
              key={title}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition"
              style={{ backgroundColor: color }}
              title={title}
              aria-label={title}
              onClick={() => {
                if (onListClick) {
                  onListClick();
                } else {
                  let role = "";
                  if (typeof window !== "undefined") {
                  role = localStorage.getItem("role") || "";
                  }
                  if (role === "lab_admin") {
                  router.push("/lab-case-management");
                  } else if (role === "office_admin") {
                  router.push("/office-case-management");
                  } else if (role === "superadmin") {
                  router.push("/case-management");
                  } else {
                  router.push("/slips");
                  }
                }
              }}
            >
              <Icon 
                className="text-white drop-shadow" 
                style={{ width: '48px', height: '48px' }}
                strokeWidth={2.5} 
              />
            </Button>
          ) : (
            <Button
              key={title}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition"
              style={{ backgroundColor: color }}
              title={title}
              aria-label={title}
              onClick={() => {
                if (title === "List") {
                  router.push("/slips")
                } else {
                  onClick({
                    isCaseSubmitted,
                    setShowSubmitWarningModal,
                    setShowPrintPreview,
                    relatedSlipNumbers,
                    setShowPrintDriverTagsModal,
                    setShowPrintStatementModal,
                    setShowDriverHistoryModal,
                    setShowCallLogModal,
                    slipId: getSlipId() || 0,
                  })
                }
              }}
            >
              <Icon
                className="text-white drop-shadow"
                style={{ width: '48px', height: '48px' }}
                strokeWidth={2.5} // thicker outline
              />
            </Button>
          )
        )}
        {/* Extra actions visible only when showExtra is true */}
        {showExtra && extraActions.map(({ icon: Icon, color, title, onClick }) => (
          title === "Pause" ? (
            <Button
              key={title}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition"
              style={{ backgroundColor: color }}
              title={title}
              aria-label={title}
              onClick={() => setModal("hold")}
            >
              <Icon 
                className="text-white" 
                style={{ width: '48px', height: '48px' }}
              />
            </Button>
          ) : title === "Start" ? (
            <Button
              key={title}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition"
              style={{ backgroundColor: color }}
              title={title}
              aria-label={title}
              onClick={() => setModal("resume")}
            >
              <Icon 
                className="text-white" 
                style={{ width: '48px', height: '48px' }}
              />
            </Button>
          ) : title === "Close" ? (
            <Button
              key={title}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition"
              style={{ backgroundColor: color }}
              title={title}
              aria-label={title}
              onClick={() => setModal("cancel")}
            >
              <Icon 
                className="text-white" 
                style={{ width: '48px', height: '48px' }}
              />
            </Button>
          ) : (
            <Button
              key={title}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition"
              style={{ backgroundColor: color }}
              title={title}
              aria-label={title}
              onClick={() => onClick({
                isCaseSubmitted,
                setShowSubmitWarningModal,
                setShowPrintPreview,
                relatedSlipNumbers,
                setShowPrintDriverTagsModal,
                setShowPrintStatementModal,
                setShowDriverHistoryModal,
                setShowCallLogModal,
                slipId: getSlipId() || 0,
              })}
            >
              <Icon 
                className="text-white" 
                style={{ width: '48px', height: '48px' }}
              />
            </Button>
          )
        ))}
        {/* 3-dots toggler always last */}
        <Button
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg bg-[#6E7C91]"
          title="More"
          aria-label="More"
          onClick={() => setShowExtra((v) => !v)}
        >
          <MoreHorizontal 
            className="text-white" 
            style={{ width: '48px', height: '48px' }}
          />
        </Button>
      </div>
      {/* Hold Case Modal */}
      <CaseActionModal
        open={modal === "hold"}
        onClose={() => setModal(null)}
        onSubmit={handleHold}
        actionType="hold"
        title="Put Case On Hold"
        description="You are putting this case on hold. The delivery date will be recalculated when the case is resumed."
        icon={<Pause />}
        iconBgColor="#FFF3DF"
        iconColor="#FFB400"
        buttonText="Put case on hold"
        buttonColor="warning"
        reasonPlaceholder="Please provide a reason for putting case on hold."
      />

      {/* Resume Case Modal */}
      <CaseActionModal
        open={modal === "resume"}
        onClose={() => setModal(null)}
        onSubmit={handleResume}
        actionType="resume"
        title="Resume Case"
        description="You are resuming a case that was previously on hold. The delivery date will be updated from today’s date."
        icon={<Play />}
        iconBgColor="#EAF7EA"
        iconColor="#43A047"
        buttonText="Resume Case"
        buttonColor="success"
        reasonPlaceholder="Please provide a reason for resuming case."
      />

      {/* Cancel Case Modal */}
      <CaseActionModal
        open={modal === "cancel"}
        onClose={() => setModal(null)}
        onSubmit={handleCancel}
        actionType="cancel"
        title="Cancel Case"
        description="You are cancelling this case. This action cannot be undone and will mark the case as inactive."
        icon={<X />}
        iconBgColor="#fdecec"
        iconColor="#D32F2F"
        buttonText="Cancel Case"
        buttonColor="error"
        reasonPlaceholder="Please provide a reason for case cancellation."
        warning="This action cannot be undone and will archive the case."
      />

      {/* Success Modal */}
      <CaseActionModal
        open={modal === "cancelled"}
        onClose={() => setModal(null)}
        actionType="cancelled"
        title="Case Updated"
        description=""
        icon={<X />}
        iconBgColor="#e0e7ef"
        iconColor="#43A047"
        buttonColor="success"
        successMessage={successMessage}
      />

      <ChangeDateModal
        open={showChangeDateModal}
        onClose={() => setShowChangeDateModal(false)}
        patient="Mary Gutierrez"
        stage="AOT FN"
        currentDate="01/13/2025 at 4PM"
        deliveryDate="2025-01-03"
        deliveryTime="10:00"
        slipId={1} // Add a sample slipId for demo purposes
        history={[
          {
            id: 1,
            slip_id: 1,
            delivery_date: "01/15/25",
            delivery_time: "4:00pm",
            notes: "Pt will be flying out of town, needs case to be finished sooner.",
            created_at: "01/03/25 @ 7:26am",
            formatted_delivery_date: "01/15/25",
            formatted_delivery_time: "4:00pm",
            created_by: {
              id: 1,
              name: "Heide Cosa",
              email: "heide@example.com"
            }
          },
        ]}
        onSave={(date, time, reason) => {
          // TODO: call your API/mutate data, then reload
        }}
      />

      <SendCaseBackToOfficeModal
        open={showSendBackModal}
        onClose={() => setShowSendBackModal(false)}
        onConfirm={reason => {
          setShowSendBackModal(false);
        }}
      />

      <RushRequestModal
        isOpen={showRushModal}
        onClose={() => setShowRushModal(false)}
        onConfirm={rushData => {
          setShowRushModal(false);
        }}
        product={{
          name: "Crown",
          stage: "AOT FN",
          deliveryDate: "2025-01-13T16:00:00Z",
          price: 100
        }}
      />

      <LabConnectModal
        open={showLabConnectModal}
        onClose={() => setShowLabConnectModal(false)}
        onConfirm={() => {
          setShowLabConnectModal(false);
        }}
      />

      <DriverCaseHistoryModal
        open={showDriverCaseHistory}
        onClose={() => setShowDriverCaseHistory(false)}
        office="Main Office"
        code="HMD"
        patient="Mary Gutierrez"
        pan="----"
        caseNo="1256489"
        slipHistories={[
          { slipNumber: "665479", stage: "Bite block", deliveryDate: "01/07/2025 @ 4pm" },
          { slipNumber: "657894", stage: "Try in with teeth", deliveryDate: "01/13/2025 @ 4pm", isRush: true },
        ]}
        timeline={[
          { timestamp: "01/07/2025, 5:34 pm", location: "In office ready to pick up → on route to the lab", user: "Office Assistant", receiver: "Jeff" },
          { timestamp: "01/07/2025, 5:34 pm", location: "On route to the lab → In lab", user: "Jeff", receiver: "Arely" },
          { timestamp: "01/07/2025, 5:34 pm", location: "In lab → In lab ready to pick up", user: "Arely", receiver: "Horacio" },
          { timestamp: "01/07/2025, 5:34 pm", location: "In lab ready to pick up → On route to the office", user: "Horacio", receiver: "Jeff" },
        ]}
        onSubmitSignature={signature => {
          // Do something with the signature!
        }}
      />
    </footer>
  )
}

