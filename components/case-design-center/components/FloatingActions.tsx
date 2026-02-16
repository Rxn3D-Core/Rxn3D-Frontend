"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Printer,
  ClipboardCheck,
  Phone,
  List,
  Calendar,
  Send,
  FlaskConical,
  Truck,
  Building2,
  Zap,
  Pause,
  X,
  MoreHorizontal,
} from "lucide-react";

export function FloatingActions() {
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
