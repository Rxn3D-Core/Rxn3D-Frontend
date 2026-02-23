"use client";

import { useState, useEffect } from "react";
import {
  Pencil,
  Printer,
  ClipboardCheck,
  History,
  Phone,
  List,
  Calendar,
  Send,
  FlaskConical,
  Building2,
  Zap,
  Pause,
  X,
  MoreHorizontal,
  Play,
  ChevronsRight,
} from "lucide-react";

interface ActionButton {
  icon: React.ReactNode;
  bg: string;
  hover: string;
  label: string;
  /** If true, button is rendered but visually grayed out and non-interactive */
  disabled?: boolean;
}

export interface FloatingActionsProps {
  /** Whether the case is already in progress (disables Resume case button) */
  caseInProgress?: boolean;
  /** Whether there is a succeeding stage configured in the product (shows Add stage for office_admin) */
  hasNextStage?: boolean;
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
}

export function FloatingActions({
  caseInProgress = false,
  hasNextStage = false,
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
}: FloatingActionsProps = {}) {
  const [expanded, setExpanded] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    setRole(storedRole);
  }, []);

  // ── Lab Admin Actions ──────────────────────────────────────────────────────
  const labActions: ActionButton[] = [
    {
      icon: <Pencil size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#6366F1]",
      hover: "hover:bg-[#4F46E5]",
      label: "Edit Slip",
    },
    {
      icon: <Printer size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#F59E0B]",
      hover: "hover:bg-[#D97706]",
      label: "Print",
    },
    {
      icon: <ClipboardCheck size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#34C759]",
      hover: "hover:bg-[#2DA44E]",
      label: "Pick up/Drop off",
    },
    {
      icon: <History size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#1162A8]",
      hover: "hover:bg-[#0E5290]",
      label: "Driver History",
    },
  ];

  // ── Office Admin Actions ───────────────────────────────────────────────────
  const officeActions: ActionButton[] = [
    {
      icon: <Pencil size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#6366F1]",
      hover: "hover:bg-[#4F46E5]",
      label: "Edit Slip",
    },
    {
      icon: <Printer size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#F59E0B]",
      hover: "hover:bg-[#D97706]",
      label: "Print",
    },
    {
      icon: <ClipboardCheck size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#34C759]",
      hover: "hover:bg-[#2DA44E]",
      label: "Pick up/Drop off",
    },
    {
      icon: <History size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#6366F1]",
      hover: "hover:bg-[#4F46E5]",
      label: "Driver History",
    },
    {
      icon: <Phone size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#1162A8]",
      hover: "hover:bg-[#0E5290]",
      label: "Call log",
    },
    {
      icon: <List size={21} className="text-white" strokeWidth={2} />,
      bg: "bg-[#64748B]",
      hover: "hover:bg-[#475569]",
      label: "Back to case list view",
    },
    {
      icon: <Calendar size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#1162A8]",
      hover: "hover:bg-[#0E5290]",
      label: "Change Due date",
    },
    {
      icon: <Send size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#1162A8]",
      hover: "hover:bg-[#0E5290]",
      label: "Send to QC",
    },
    {
      icon: <FlaskConical size={20} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#1162A8]",
      hover: "hover:bg-[#0E5290]",
      label: "Lab Connect",
    },
    {
      icon: <Building2 size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#1162A8]",
      hover: "hover:bg-[#0E5290]",
      label: "Send back to office",
    },
    {
      icon: <Zap size={17} className="text-white" strokeWidth={2} />,
      bg: "bg-[#CF0202]",
      hover: "hover:bg-[#A80101]",
      label: "Rush case",
    },
    {
      icon: <Play size={17} className="text-white" strokeWidth={1.5} />,
      bg: caseInProgress ? "bg-[#9CA3AF]" : "bg-[#34C759]",
      hover: caseInProgress ? "" : "hover:bg-[#2DA44E]",
      label: "Resume case",
      disabled: caseInProgress,
    },
    {
      icon: <Pause size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#FF9500]",
      hover: "hover:bg-[#E08600]",
      label: "On hold",
    },
    {
      icon: <X size={20} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#CF0202]",
      hover: "hover:bg-[#A80101]",
      label: "Cancel Case",
    },
  ];

  // ── Office Admin top-level quick actions (always visible, outside expand) ──
  // Add stage only shows if case is in office AND has a succeeding stage
  const officeQuickActions: ActionButton[] = [
    ...(hasNextStage
      ? [
          {
            icon: <ChevronsRight size={20} className="text-white" strokeWidth={2} />,
            bg: "bg-[#6366F1]",
            hover: "hover:bg-[#4F46E5]",
            label: "Add stage",
          },
        ]
      : []),
    {
      icon: <Printer size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#F59E0B]",
      hover: "hover:bg-[#D97706]",
      label: "Print (multi product)",
    },
    {
      icon: <History size={17} className="text-white" strokeWidth={1.5} />,
      bg: "bg-[#6366F1]",
      hover: "hover:bg-[#4F46E5]",
      label: "Driver History",
    },
  ];

  const actionHandlers: Record<string, (() => void) | undefined> = {
    "Edit Slip": onEditSlip,
    "Print": onPrint,
    "Print (multi product)": onPrint,
    "Pick up/Drop off": onPickupDropoff,
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
  };

  const isLabAdmin = role === "lab_admin";
  const isOfficeAdmin = role === "office_admin";

  // Determine which expandable actions and quick actions to show
  const expandableActions = isLabAdmin
    ? labActions
    : isOfficeAdmin
    ? officeActions
    : [];

  const quickActions = isOfficeAdmin ? officeQuickActions : [];

  // Don't render anything if role is unknown or unsupported
  if (!isLabAdmin && !isOfficeAdmin) return null;

  return (
    <div className="fixed bottom-6 right-6 flex items-center z-50">
      {/* Expandable action buttons */}
      <div className="flex items-center gap-[10px] overflow-hidden mr-[10px]">
        {expandableActions.map((action, i) => (
          <button
            key={action.label}
            type="button"
            aria-label={action.label}
            disabled={action.disabled}
            onClick={action.disabled ? undefined : actionHandlers[action.label]}
            className={`w-[46.67px] h-[46.67px] shrink-0 rounded-full ${action.bg} ${action.disabled ? "cursor-not-allowed opacity-60" : action.hover + " cursor-pointer"} flex items-center justify-center drop-shadow-[2px_4px_6px_rgba(0,0,0,0.25)] transition-all duration-500 ease-in-out`}
            style={{
              transform: expanded ? "translateX(0)" : "translateX(calc(100% + 10px))",
              opacity: expanded ? (action.disabled ? 0.6 : 1) : 0,
              transitionDelay: expanded
                ? `${i * 30}ms`
                : `${(expandableActions.length - 1 - i) * 30}ms`,
            }}
          >
            {action.icon}
          </button>
        ))}
      </div>

      {/* Ellipsis toggle — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-label="Toggle quick actions"
        className="w-[46.67px] h-[46.67px] shrink-0 rounded-full bg-[#64748B] hover:bg-[#475569] flex items-center justify-center drop-shadow-[2px_4px_6px_rgba(0,0,0,0.25)] transition-transform duration-300 cursor-pointer"
      >
        <MoreHorizontal size={17} className="text-white" strokeWidth={2} />
      </button>

      {/* Office admin: quick action buttons always visible to the right of ellipsis */}
      {quickActions.length > 0 && (
        <div className="flex items-center gap-[10px] ml-[10px]">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              aria-label={action.label}
              onClick={actionHandlers[action.label]}
              className={`w-[46.67px] h-[46.67px] shrink-0 rounded-full ${action.bg} ${action.hover} flex items-center justify-center drop-shadow-[2px_4px_6px_rgba(0,0,0,0.25)] transition-colors duration-200 cursor-pointer`}
            >
              {action.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
