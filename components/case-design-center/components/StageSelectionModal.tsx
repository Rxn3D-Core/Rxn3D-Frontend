"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NewStageEligibilityStageRef } from "@/lib/api/slip-new-stage-eligibility";
import { StageHistoryBlock } from "./StageHistoryBlock";

type StageOption = {
  name: string;
  letter: string;
  image_url?: string | null;
  stage_id?: number;
  sequence?: number;
};

function StageOptionImage({
  stage,
  letterClassName,
}: {
  stage: StageOption;
  letterClassName: string;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const showImage = Boolean(stage.image_url) && !imageFailed;

  return (
    <div className="w-full bg-gray-50 overflow-hidden relative flex items-center justify-center aspect-square rounded-lg border border-[#E0E0E0]">
      {showImage ? (
        <img
          src={stage.image_url!}
          alt={stage.name}
          className="max-w-full max-h-full object-contain object-center rounded-lg"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className={letterClassName}>{stage.letter}</div>
      )}
    </div>
  );
}

export function StageSelectionModal({
  stages,
  selectedStage,
  stageHistory,
  onSelect,
  onClose,
  archLabel,
  lastCompletedStageId,
  lastCompletedSequence,
}: {
  stages: StageOption[];
  selectedStage?: string;
  stageHistory?: NewStageEligibilityStageRef[];
  onSelect: (stageName: string, stageId?: number) => void;
  onClose: () => void;
  /** When provided, appended to the title: "Select stage for <archLabel>" */
  archLabel?: string;
  /** stage_id of the last completed stage — this stage is selectable (repeat) but earlier ones are not. */
  lastCompletedStageId?: number;
  /** sequence of the last completed stage — stages with lower sequence are disabled. */
  lastCompletedSequence?: number;
}) {
  const isDisabled = (stage: StageOption): boolean => {
    if (lastCompletedSequence == null) return false;
    if (stage.stage_id != null && stage.stage_id === lastCompletedStageId) return false;
    if (stage.sequence != null) return stage.sequence < lastCompletedSequence;
    return false;
  };
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-screen max-w-[100vw] max-h-[100vh] sm:max-w-[100vw] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-3 sm:p-4">
          <DialogTitle
            className="font-semibold"
            style={{
              fontFamily: "Verdana",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            <span className="text-xl sm:text-[30px]">
              {archLabel ? `Select stage for ${archLabel}` : "Select stage"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {stageHistory && stageHistory.length > 0 ? (
          <div className="px-3 sm:px-6 pb-2">
            <StageHistoryBlock history={stageHistory} />
          </div>
        ) : null}

        <div className="px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto sm:overflow-y-auto max-h-[70vh]">
          {/* Mobile: horizontal carousel */}
          <div className="flex sm:hidden gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
            {stages.map((stage) => {
              const isSelected = selectedStage === stage.name;
              const disabled = isDisabled(stage);
              return (
                <div
                  key={stage.name}
                  onClick={() => !disabled && onSelect(stage.name, stage.stage_id)}
                  className={cn(
                    "relative border-2 rounded-xl overflow-hidden transition-all duration-200 bg-white flex flex-col p-1.5 gap-2 snap-center flex-shrink-0 w-[140px]",
                    disabled
                      ? "border-gray-200 opacity-40 cursor-not-allowed"
                      : isSelected
                        ? "border-blue-500 shadow-xl cursor-pointer"
                        : "border-gray-300 hover:border-blue-500 hover:shadow-lg cursor-pointer"
                  )}
                >
                  <StageOptionImage
                    stage={stage}
                    letterClassName="text-gray-400 text-xl font-bold flex items-center justify-center absolute inset-0"
                  />
                  <div
                    className="flex items-center justify-center text-center text-[14px]"
                    style={{
                      fontFamily: "Verdana",
                      fontWeight: 400,
                      lineHeight: "1.2",
                      letterSpacing: "-0.02em",
                      color: "#000000",
                    }}
                  >
                    {stage.name}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Desktop: grid layout */}
          <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {stages.map((stage) => {
              const isSelected = selectedStage === stage.name;
              const disabled = isDisabled(stage);
              return (
                <div
                  key={stage.name}
                  onClick={() => !disabled && onSelect(stage.name, stage.stage_id)}
                  className={cn(
                    "relative border-2 rounded-xl overflow-hidden transition-all duration-200 bg-white flex flex-col p-2 gap-[10px]",
                    disabled
                      ? "border-gray-200 opacity-40 cursor-not-allowed"
                      : isSelected
                        ? "border-blue-500 shadow-xl cursor-pointer"
                        : "border-gray-300 hover:border-blue-500 hover:shadow-lg cursor-pointer"
                  )}
                >
                  <StageOptionImage
                    stage={stage}
                    letterClassName="text-gray-400 text-2xl font-bold flex items-center justify-center absolute inset-0"
                  />
                  <div
                    className="flex items-center justify-center text-center text-[18px] lg:text-[22.949px]"
                    style={{
                      fontFamily: "Verdana",
                      fontWeight: 400,
                      lineHeight: "1.2",
                      letterSpacing: "-0.02em",
                      color: "#000000",
                    }}
                  >
                    {stage.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t p-3 sm:p-4 flex justify-end gap-2">
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
