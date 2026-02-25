"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StageSelectionModal({
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
        <DialogHeader className="p-3 sm:p-4">
          <DialogTitle
            className="font-semibold"
            style={{
              fontFamily: "Verdana",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            <span className="text-xl sm:text-[30px]">Select stage</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto sm:overflow-y-auto max-h-[70vh]">
          {/* Mobile: horizontal carousel */}
          <div className="flex sm:hidden gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide">
            {stages.map((stage) => {
              const isSelected = selectedStage === stage.name;
              return (
                <div
                  key={stage.name}
                  onClick={() => onSelect(stage.name)}
                  className={cn(
                    "relative border-2 rounded-xl overflow-hidden transition-all duration-200 bg-white flex flex-col cursor-pointer p-1.5 gap-2 snap-center flex-shrink-0 w-[140px]",
                    isSelected
                      ? "border-blue-500 shadow-xl"
                      : "border-gray-300 hover:border-blue-500 hover:shadow-lg"
                  )}
                >
                  <div className="w-full bg-gray-50 overflow-hidden relative flex items-center justify-center aspect-square rounded-lg border border-[#E0E0E0]">
                    <div className="text-gray-400 text-xl font-bold flex items-center justify-center absolute inset-0">
                      {stage.letter}
                    </div>
                  </div>
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
              return (
                <div
                  key={stage.name}
                  onClick={() => onSelect(stage.name)}
                  className={cn(
                    "relative border-2 rounded-xl overflow-hidden transition-all duration-200 bg-white flex flex-col cursor-pointer p-2 gap-[10px]",
                    isSelected
                      ? "border-blue-500 shadow-xl"
                      : "border-gray-300 hover:border-blue-500 hover:shadow-lg"
                  )}
                >
                  <div className="w-full bg-gray-50 overflow-hidden relative flex items-center justify-center aspect-square rounded-lg border border-[#E0E0E0]">
                    <div className="text-gray-400 text-2xl font-bold flex items-center justify-center absolute inset-0">
                      {stage.letter}
                    </div>
                  </div>
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
