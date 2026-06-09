"use client";

import { useState, useEffect, type ReactElement } from "react";
import {
  SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE,
  type SlipPickupDropoffAction,
} from "@/lib/slip-location";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  VirtualSlipActionIcon,
  type VirtualSlipActionIconName,
} from "./VirtualSlipActionIcon";

function FabTooltip({
  label,
  children,
  disabled,
  disabledMessage,
  enabled = true,
}: {
  label: string;
  children: ReactElement;
  disabled?: boolean;
  disabledMessage?: string;
  /** When false, no tooltip (e.g. collapsed FABs still in DOM with opacity 0). */
  enabled?: boolean;
}) {
  if (!enabled) {
    return children;
  }

  const showWarning = Boolean(disabled && disabledMessage);
  const trigger = disabled ? (
    <span className="inline-flex cursor-not-allowed">{children}</span>
  ) : (
    children
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className={cn(
          "max-w-[260px] text-xs font-medium",
          showWarning && "border-amber-300 bg-amber-50 text-amber-950"
        )}
      >
        {showWarning ? disabledMessage : label}
      </TooltipContent>
    </Tooltip>
  );
}

interface ActionButton {
  icon: VirtualSlipActionIconName;
  /** Wider glyphs (lab connect, return to office) */
  iconClassName?: string;
  bg: string;
  hover: string;
  label: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export interface FloatingActionsProps {
  hasNextStage?: boolean;
  hasImageAttachment?: boolean;
  hasStlAttachment?: boolean;
  onAttachments?: () => void;
  onEditSlip?: () => void;
  onPrint?: () => void;
  onPickupDropoff?: () => void;
  onDriverHistory?: () => void;
  onCallLog?: () => void;
  onBackToCaseList?: () => void;
  onChangeDueDate?: () => void;
  onSendToQC?: () => void;
  onLabConnect?: () => void;
  onSendBackToOffice?: () => void;
  onRush?: () => void;
  onResume?: () => void;
  onHold?: () => void;
  onCancel?: () => void;
  onAddStage?: () => void;
  /** Lab: slip is at "In lab" (location id 3) — show Ready to send FAB (listing parity). */
  showReadyToSend?: boolean;
  onReadyToSend?: () => void;
  /** Location-based label: "Pick up" or "Drop off" (virtual slip); defaults to combined. */
  pickupDropoffLabel?: string;
  /** Drives pick-up vs drop-off icon and FAB color (virtual slip / listing parity). */
  pickupDropoffAction?: SlipPickupDropoffAction | null;
  /** When false, hide pick up / drop off FAB (e.g. slip in lab — use Ready to send). Default true. */
  showPickupDropoff?: boolean;
  /** When false, hide Edit Slip FAB (only available when slip is in lab). Default false. */
  showEditSlip?: boolean;
  /** When false, hide Driver History view FAB (timeline). Default true. */
  showDriverHistoryFab?: boolean;
  /** When false, On hold is disabled with {@link SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE} on hover. Default true. */
  canPutOnHold?: boolean;
}

const ACTION_BTN =
  "w-[46.67px] h-[46.67px] shrink-0 rounded-full flex items-center justify-center drop-shadow-[2px_4px_6px_rgba(0,0,0,0.25)]";

export function FloatingActions({
  hasNextStage = false,
  hasImageAttachment = false,
  hasStlAttachment = false,
  onAttachments,
  onEditSlip,
  onPrint,
  onPickupDropoff,
  onDriverHistory,
  onCallLog,
  onBackToCaseList,
  onChangeDueDate,
  onSendToQC,
  onLabConnect,
  onSendBackToOffice,
  onRush,
  onResume,
  onHold,
  onCancel,
  onAddStage,
  showReadyToSend = false,
  onReadyToSend,
  pickupDropoffLabel,
  pickupDropoffAction = null,
  showPickupDropoff = true,
  showEditSlip = false,
  showDriverHistoryFab = true,
  canPutOnHold = true,
}: FloatingActionsProps = {}) {
  const pickupActionLabel = pickupDropoffLabel ?? "Pick up/Drop off";
  const isDropoffFab = pickupDropoffAction === "dropoff";
  const isFooterDriverAction =
    showPickupDropoff &&
    (pickupDropoffAction === "pickup" || pickupDropoffAction === "dropoff") &&
    Boolean(onPickupDropoff);
  const isFooterReadyToSendAction = showReadyToSend && Boolean(onReadyToSend);
  const isFooterAddStageAction = hasNextStage && Boolean(onAddStage);
  const isFooterPrimaryAction =
    isFooterDriverAction || isFooterReadyToSendAction || isFooterAddStageAction;
  const showCaseStatusActions = Boolean(onResume || onHold || onCancel);
  const caseStatusFabActions: ActionButton[] = showCaseStatusActions
    ? [
        ...(onResume
          ? [
              {
                icon: "resume" as const,
                iconClassName: "h-[46.67px] w-[46.67px] max-w-none",
                bg: "bg-transparent",
                hover: "hover:opacity-90",
                label: "Resume case",
              },
            ]
          : []),
        ...(onHold
          ? [
              {
                icon: "on-hold" as const,
                bg: canPutOnHold ? "bg-[#FF9500]" : "bg-[#9CA3AF]",
                hover: canPutOnHold ? "hover:bg-[#E08600]" : "",
                label: "On hold",
                disabled: !canPutOnHold,
                disabledMessage: canPutOnHold
                  ? undefined
                  : SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE,
              },
            ]
          : []),
        ...(onCancel
          ? [
              {
                icon: "cancel" as const,
                bg: "bg-[#CF0202]",
                hover: "hover:bg-[#A80101]",
                label: "Cancel Case",
              },
            ]
          : []),
      ]
    : [];

  const changeDueDateFab: ActionButton[] = onChangeDueDate
    ? [
        {
          icon: "calendar",
          bg: "bg-[#1162A8]",
          hover: "hover:bg-[#0E5290]",
          label: "Change Due date",
        },
      ]
    : [];

  const pickupDropoffFab: ActionButton = isDropoffFab
    ? {
        icon: "drop-off",
        iconClassName: "h-[46.67px] w-[46.67px] max-w-none",
        bg: "bg-transparent",
        hover: "hover:opacity-90",
        label: pickupActionLabel,
      }
    : {
        icon: "pick-up",
        iconClassName: "h-[46.67px] w-[46.67px] max-w-none",
        bg: "bg-transparent",
        hover: "hover:opacity-90",
        label: pickupActionLabel,
      };
  const [expanded, setExpanded] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    setRole(storedRole);
  }, []);

  const labActions: ActionButton[] = [
    ...(showEditSlip
      ? [
          {
            icon: "edit-slip" as const,
            bg: "bg-[#6366F1]",
            hover: "hover:bg-[#4F46E5]",
            label: "Edit Slip",
          },
        ]
      : []),
    {
      icon: "printer",
      bg: "bg-[#F59E0B]",
      hover: "hover:bg-[#D97706]",
      label: "Print",
    },
    ...(showPickupDropoff ? [pickupDropoffFab] : []),
    ...(showReadyToSend
      ? [
          {
            icon: "paper-airplane" as const,
            bg: "bg-[#1162A8]",
            hover: "hover:bg-[#0E5290]",
            label: "Ready to send",
          },
        ]
      : []),
    ...(showDriverHistoryFab
      ? [
          {
            icon: "truck" as const,
            bg: "bg-[#6366F1]",
            hover: "hover:bg-[#4F46E5]",
            label: "Driver History",
          },
        ]
      : []),
    ...changeDueDateFab,
    ...caseStatusFabActions,
  ];

  const officeActions: ActionButton[] = [
    ...(showEditSlip
      ? [
          {
            icon: "edit-slip" as const,
            bg: "bg-[#6366F1]",
            hover: "hover:bg-[#4F46E5]",
            label: "Edit Slip",
          },
        ]
      : []),
    {
      icon: "printer",
      bg: "bg-[#F59E0B]",
      hover: "hover:bg-[#D97706]",
      label: "Print",
    },
    ...(showPickupDropoff ? [pickupDropoffFab] : []),
    {
      icon: "truck",
      bg: "bg-[#6366F1]",
      hover: "hover:bg-[#4F46E5]",
      label: "Driver History",
    },
    {
      icon: "phone",
      bg: "bg-[#1162A8]",
      hover: "hover:bg-[#0E5290]",
      label: "Call log",
    },
    {
      icon: "list",
      bg: "bg-[#64748B]",
      hover: "hover:bg-[#475569]",
      label: "Back to case list view",
    },
    ...changeDueDateFab,
    {
      icon: "paper-airplane",
      bg: "bg-[#1162A8]",
      hover: "hover:bg-[#0E5290]",
      label: "Send to QC",
    },
    {
      icon: "send-to-lab",
      iconClassName: "h-[24px] w-auto max-w-[28px]",
      bg: "bg-[#1162A8]",
      hover: "hover:bg-[#0E5290]",
      label: "Lab Connect",
    },
    {
      icon: "return-to-office",
      iconClassName: "h-[24px] w-auto max-w-[28px]",
      bg: "bg-[#1162A8]",
      hover: "hover:bg-[#0E5290]",
      label: "Send back to office",
    },
    {
      icon: "lightning-bolt",
      bg: "bg-[#CF0202]",
      hover: "hover:bg-[#A80101]",
      label: "Rush case",
    },
    ...caseStatusFabActions,
  ];

  const addStageFab: ActionButton | null = hasNextStage
    ? {
          icon: "add-stage",
          iconClassName: "h-[24px] w-auto max-w-[28px]",
          bg: "bg-[#6366F1]",
          hover: "hover:bg-[#4F46E5]",
          label: "Add stage",
        }
      : null;

  const officeQuickActions: ActionButton[] = [
    ...(addStageFab ? [addStageFab] : []),
    {
      icon: "printer",
      bg: "bg-[#F59E0B]",
      hover: "hover:bg-[#D97706]",
      label: "Print (multi product)",
    },
    {
      icon: "truck",
      bg: "bg-[#6366F1]",
      hover: "hover:bg-[#4F46E5]",
      label: "Driver History",
    },
  ];

  const labQuickActions: ActionButton[] = addStageFab ? [addStageFab] : [];

  const actionHandlers: Record<string, (() => void) | undefined> = {
    "Edit Slip": onEditSlip,
    Print: onPrint,
    "Print (multi product)": onPrint,
    "Pick up/Drop off": onPickupDropoff,
    "Pick up": onPickupDropoff,
    "Drop off": onPickupDropoff,
    "Driver History": onDriverHistory,
    "Call log": onCallLog,
    "Back to case list view": onBackToCaseList,
    "Change Due date": onChangeDueDate,
    "Send to QC": onSendToQC,
    "Lab Connect": onLabConnect,
    "Send back to office": onSendBackToOffice,
    "Rush case": onRush,
    "Resume case": onResume,
    "On hold": onHold,
    "Cancel Case": onCancel,
    "Add stage": onAddStage,
    "Ready to send": onReadyToSend,
  };

  const isLabAdmin = role === "lab_admin";
  const isOfficeAdmin = role === "office_admin";

  const expandableActions = isLabAdmin ? labActions : isOfficeAdmin ? officeActions : [];
  const quickActions = isOfficeAdmin
    ? officeQuickActions
    : isLabAdmin
      ? labQuickActions
      : [];

  if (!isLabAdmin && !isOfficeAdmin) return null;

  if (isFooterPrimaryAction) {
    return null;
  }

  const renderActionIcon = (action: ActionButton) => (
    <VirtualSlipActionIcon name={action.icon} className={action.iconClassName} />
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="fixed bottom-6 right-6 z-50 flex items-center">
        <div
          className={cn(
            "mr-[10px] flex items-center gap-[10px] overflow-hidden",
            !expanded && "pointer-events-none"
          )}
          aria-hidden={!expanded}
        >
          {expandableActions.map((action, i) => (
            <FabTooltip
              key={action.label}
              label={action.label}
              disabled={action.disabled}
              disabledMessage={action.disabledMessage}
              enabled={expanded}
            >
              <button
                type="button"
                aria-label={action.label}
                disabled={action.disabled || !expanded}
                tabIndex={expanded ? 0 : -1}
                onClick={action.disabled ? undefined : actionHandlers[action.label]}
                className={`${ACTION_BTN} ${action.bg} ${
                  action.disabled
                    ? "cursor-not-allowed opacity-60"
                    : `${action.hover} cursor-pointer`
                } transition-all duration-500 ease-in-out`}
                style={{
                  transform: expanded ? "translateX(0)" : "translateX(calc(100% + 10px))",
                  opacity: expanded ? (action.disabled ? 0.6 : 1) : 0,
                  visibility: expanded ? "visible" : "hidden",
                  transitionDelay: expanded
                    ? `${i * 30}ms`
                    : `${(expandableActions.length - 1 - i) * 30}ms`,
                }}
              >
                {renderActionIcon(action)}
              </button>
            </FabTooltip>
          ))}
        </div>

        <FabTooltip label={expanded ? "Hide actions" : "More actions"}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse quick actions" : "Expand quick actions"}
            aria-expanded={expanded}
            className={`${ACTION_BTN} bg-[#64748B] hover:bg-[#475569] cursor-pointer transition-transform duration-300`}
          >
            <VirtualSlipActionIcon name="ellipsis" className="h-[17px] w-[17px]" />
          </button>
        </FabTooltip>

        {quickActions.length > 0 && (
          <div className="ml-[10px] flex items-center gap-[10px]">
            {quickActions.map((action) => (
              <FabTooltip key={action.label} label={action.label}>
                <button
                  type="button"
                  aria-label={action.label}
                  onClick={actionHandlers[action.label]}
                  className={`${ACTION_BTN} ${action.bg} ${action.hover} cursor-pointer transition-colors duration-200`}
                >
                  <VirtualSlipActionIcon name={action.icon} className={action.iconClassName} />
                </button>
              </FabTooltip>
            ))}
          </div>
        )}

        {onAttachments && (
          <FabTooltip label="Attachments">
            <button
              type="button"
              aria-label="Attachments"
              onClick={onAttachments}
              className={`${ACTION_BTN} bg-[#1162A8] hover:bg-[#0E5290] ml-[10px] cursor-pointer transition-colors duration-200`}
            >
              <VirtualSlipActionIcon name="attachments" className="h-[22px] w-auto max-w-[26px]" />
            </button>
          </FabTooltip>
        )}

      {(hasImageAttachment || hasStlAttachment) && (
        <div className="ml-[10px] flex items-center gap-[10px]">
          {hasImageAttachment && (
            <FabTooltip label="Image attachment">
              <div
                aria-label="Has image attachment"
                className={`${ACTION_BTN} bg-white`}
              >
              <svg width="28" height="28" viewBox="0 0 32 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M28.7884 13.211V21.1801L26.6554 19.3481C26.1346 18.9228 25.4828 18.6904 24.8103 18.6904C24.1378 18.6904 23.486 18.9228 22.9652 19.3481L17.5216 24.0197C17.0007 24.4451 16.3489 24.6775 15.6765 24.6775C15.004 24.6775 14.3522 24.4451 13.8314 24.0197L13.3865 23.6533C12.9063 23.2567 12.3114 23.0247 11.6894 22.9918C11.0674 22.9588 10.4513 23.1265 9.93184 23.4701L3.49368 27.7884L3.34973 27.8931C2.83851 26.7222 2.58845 25.4541 2.61693 24.1768V13.211C2.61693 8.44775 5.45653 5.60815 10.2197 5.60815H21.1856C25.9488 5.60815 28.7884 8.44775 28.7884 13.211Z"
                  fill="url(#fa_paint0_img)"
                />
                <path
                  d="M14.8847 13.4596C14.8847 14.0742 14.7024 14.6751 14.3609 15.1862C14.0194 15.6973 13.534 16.0956 12.9661 16.3309C12.3982 16.5661 11.7734 16.6276 11.1705 16.5077C10.5676 16.3878 10.0139 16.0918 9.57922 15.6572C9.14458 15.2225 8.84858 14.6687 8.72866 14.0659C8.60875 13.463 8.67029 12.8381 8.90552 12.2702C9.14074 11.7024 9.53909 11.217 10.0502 10.8755C10.5613 10.534 11.1621 10.3517 11.7768 10.3517C12.6008 10.3524 13.3909 10.6801 13.9736 11.2628C14.5563 11.8454 14.884 12.6355 14.8847 13.4596Z"
                  fill="url(#fa_paint1_img)"
                />
                <path
                  d="M28.7882 21.1802V24.1768C28.7882 28.94 25.9486 31.7796 21.1854 31.7796H10.2196C6.88275 31.7796 4.47498 30.3794 3.34961 27.8931L3.49355 27.7884L9.93172 23.4702C10.4512 23.1265 11.0673 22.9588 11.6893 22.9918C12.3112 23.0248 12.9062 23.2567 13.3863 23.6534L13.8313 24.0198C14.3521 24.4451 15.0039 24.6775 15.6763 24.6775C16.3488 24.6775 17.0006 24.4451 17.5214 24.0198L22.9651 19.3482C23.4859 18.9228 24.1377 18.6904 24.8102 18.6904C25.4826 18.6904 26.1344 18.9228 26.6553 19.3482L28.7882 21.1802Z"
                  fill="url(#fa_paint2_img)"
                />
                <defs>
                  <linearGradient
                    id="fa_paint0_img"
                    x1="2.61693"
                    y1="16.7506"
                    x2="28.7884"
                    y2="16.7506"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#CAEDF8" />
                    <stop offset="1" stopColor="#D9D4F5" />
                  </linearGradient>
                  <linearGradient
                    id="fa_paint1_img"
                    x1="8.66895"
                    y1="13.4596"
                    x2="14.8847"
                    y2="13.4596"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#16B0E2" />
                    <stop offset="1" stopColor="#6E5AF0" />
                  </linearGradient>
                  <linearGradient
                    id="fa_paint2_img"
                    x1="3.34961"
                    y1="25.2354"
                    x2="1.30824"
                    y2="25.2354"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#16B0E2" />
                    <stop offset="1" stopColor="#6E5AF0" />
                  </linearGradient>
                </defs>
              </svg>
              </div>
            </FabTooltip>
          )}
          {hasStlAttachment && (
            <FabTooltip label="STL attachment">
              <div
                aria-label="Has STL attachment"
                className={`${ACTION_BTN} bg-white`}
              >
              <svg width="28" height="28" viewBox="0 0 53 63" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M23.7091 52.9624L6.81545 43.3743C6.42551 43.153 6.18457 42.7392 6.18457 42.2909V22.8231C6.18457 21.8678 7.21551 21.2679 8.04601 21.74L24.9397 31.3428C25.3292 31.5643 25.5698 31.9778 25.5698 32.4259V51.8789C25.5698 52.8339 24.5396 53.4337 23.7091 52.9624Z"
                  fill="url(#fa_paint0_stl)"
                />
                <path
                  d="M26.8105 51.8654V32.4734C26.8105 32.0277 27.0487 31.6159 27.4351 31.3936L44.2719 21.7073C45.1024 21.2294 46.139 21.8289 46.139 22.7871V42.1873C46.139 42.6332 45.9006 43.0452 45.514 43.2674L28.6772 52.9455C27.8466 53.4229 26.8105 52.8233 26.8105 51.8654Z"
                  fill="url(#fa_paint1_stl)"
                />
                <path
                  d="M43.7415 20.6064L26.8127 30.3078C26.4277 30.5285 25.9543 30.5276 25.57 30.3056L8.78021 20.6042C7.95255 20.126 7.9496 18.9323 8.77488 18.45L25.5647 8.63736C25.9517 8.4112 26.4303 8.41034 26.8181 8.63511L43.7469 18.4477C44.5743 18.929 44.5743 20.1292 43.7415 20.6064Z"
                  fill="url(#fa_paint2_stl)"
                />
                <defs>
                  <linearGradient
                    id="fa_paint0_stl"
                    x1="25.3568"
                    y1="53.9118"
                    x2="42.4437"
                    y2="12.7232"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#2BA5DE" />
                    <stop offset="0.475962" stopColor="#822A8B" />
                    <stop offset="1" stopColor="#C8549F" />
                  </linearGradient>
                  <linearGradient
                    id="fa_paint1_stl"
                    x1="25.3568"
                    y1="53.9118"
                    x2="42.4437"
                    y2="12.7232"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#2BA5DE" />
                    <stop offset="0.475962" stopColor="#822A8B" />
                    <stop offset="1" stopColor="#C8549F" />
                  </linearGradient>
                  <linearGradient
                    id="fa_paint2_stl"
                    x1="25.3568"
                    y1="53.9118"
                    x2="42.4437"
                    y2="12.7232"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#2BA5DE" />
                    <stop offset="0.475962" stopColor="#822A8B" />
                    <stop offset="1" stopColor="#C8549F" />
                  </linearGradient>
                </defs>
              </svg>
              </div>
            </FabTooltip>
          )}
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}
