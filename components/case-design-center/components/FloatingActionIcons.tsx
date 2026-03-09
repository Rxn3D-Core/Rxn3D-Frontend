"use client";

import { Plus, Zap } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* ------------------------------------------------------------------ */
/*  SVG Icons                                                          */
/* ------------------------------------------------------------------ */

function AttachIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.5059 28.5555L29.6809 16.7296C29.9081 16.4893 30.2008 16.3145 30.5197 16.2228L30.8998 16.1179C32.988 15.5325 34.9058 17.4679 34.303 19.5517C34.2331 19.8007 34.102 20.0279 33.9273 20.2201L18.0909 37.6904C17.322 38.5423 16.2953 39.1233 15.1726 39.3505C12.2369 39.9403 9.76419 37.1356 10.7122 34.3003L10.7297 34.2523C10.9787 33.5096 11.3762 32.8281 11.9048 32.2514L29.5761 12.8109C30.6464 11.6313 32.0968 10.8624 33.6739 10.6396L33.7875 10.6222C37.1164 10.146 39.9516 13.0162 39.4318 16.332C39.2527 17.4679 38.759 18.5294 38.0032 19.3988L24.7705 34.5799" stroke="#269BD2" strokeMiterlimit="10"/>
    </svg>
  );
}

function RushIcon() {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.8224 7.4573L36.2279 4.87227C36.6154 4.79772 36.9329 5.13148 36.7568 5.42831L27.6889 20.7318C27.5189 21.0184 27.8101 21.3451 28.1889 21.2926L34.5014 20.4173C34.9088 20.3608 35.2003 20.7372 34.9704 21.0229L14.1787 46.8786C13.8676 47.2655 13.1498 46.9592 13.3454 46.5228L21.0353 29.3848C21.1646 29.0971 20.8643 28.803 20.5023 28.8623L13.8703 29.9527C13.5124 30.0117 13.2134 29.7243 13.3343 29.4377L22.4841 7.70973C22.5376 7.58301 22.6652 7.48745 22.8224 7.4573Z" fill="#F04B23"/>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  FloatingActionIcons                                                */
/* ------------------------------------------------------------------ */

interface FloatingActionIconsProps {
  /** Which side to position: mandibular = right, maxillary = left */
  arch: "mandibular" | "maxillary";
  /** Whether the icons should be visible */
  visible: boolean;
  /** Open the attach files modal */
  onAttach: () => void;
  /** Open the rush modal */
  onRush: () => void;
  /** Label for the rush tooltip */
  rushLabel: string;
  /** Optional: show an "Add ons" button before the attach button */
  onAddOns?: () => void;
}

export function FloatingActionIcons({
  arch,
  visible,
  onAttach,
  onRush,
  rushLabel,
  onAddOns,
}: FloatingActionIconsProps) {
  if (!visible) return null;

  const positionClass = arch === "mandibular"
    ? "absolute -right-[60px] top-3"
    : "absolute -left-[60px] top-3";

  return (
    <TooltipProvider delayDuration={300}>
      <div className={`${positionClass} hidden md:flex flex-col gap-[17px] z-10`}>
        {onAddOns && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onAddOns}
                className="w-[50px] h-[50px] flex items-center justify-center transition-opacity hover:opacity-80"
              >
                <Plus size={30} className="text-[#1E1E1E]" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side={arch === "mandibular" ? "left" : "right"}><p>Add ons</p></TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onAttach}
              className="w-[50px] h-[50px] flex items-center justify-center transition-opacity hover:opacity-80"
            >
              <AttachIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent side={arch === "mandibular" ? "left" : "right"}><p>Attach Files</p></TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onRush}
              className="w-[50px] h-[50px] flex items-center justify-center transition-opacity hover:opacity-80"
            >
              <RushIcon />
            </button>
          </TooltipTrigger>
          <TooltipContent side={arch === "mandibular" ? "left" : "right"}><p>{rushLabel}</p></TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
