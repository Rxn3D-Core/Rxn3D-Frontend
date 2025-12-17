// app/components/PrintDriverTagsModal.tsx

"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Check } from "lucide-react"


interface PrintDriverTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: any;
  onRegularPrint: (slip: any, allSlots: boolean[]) => void;
  onGenerateLabels: (slip: any, selectedSlots: boolean[]) => void;
}

export default function PrintDriverTagsModal({
  isOpen,
  onClose,
  slip,
  onRegularPrint,
  onGenerateLabels,
}: PrintDriverTagsModalProps) {
// (removed erroneous destructuring block)
  const SLOT_COUNT = 8
  const [selectedSlots, setSelectedSlots] = useState<boolean[]>(
    Array(SLOT_COUNT).fill(false)
  )

  const handleSlotToggle = (index: number) => {
    setSelectedSlots((prev) => {
      const newSlots = [...prev]
      newSlots[index] = !newSlots[index]
      return newSlots
    })
  }

  const handleSelectAll = () => setSelectedSlots(Array(SLOT_COUNT).fill(true))
  const handleUncheckAll = () => setSelectedSlots(Array(SLOT_COUNT).fill(false))
  const selectedCount = selectedSlots.filter(Boolean).length

  const handleRegularPrintClick = () => {
    const allSlots = Array(SLOT_COUNT).fill(true);
    onRegularPrint(slip, allSlots);
    onClose();
  }

  const handleGenerateLabelsClick = () => {
    onGenerateLabels(slip, selectedSlots);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[520px] p-0 rounded-2xl shadow-2xl border-0 bg-white">
        <div className="p-6">
          <DialogHeader className="flex flex-row justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg width="42" height="43" viewBox="0 0 42 43" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0.0498047" y="0.972656" width="41.2246" height="41.2246" rx="6" fill="#1162A8"/>
                <g clipPath="url(#clip0_690_5726)">
                <path d="M17.1208 17.8359H17.1279M26.747 22.6434L21.6683 28.0209C21.5367 28.1604 21.3805 28.271 21.2085 28.3465C21.0365 28.422 20.8521 28.4609 20.666 28.4609C20.4798 28.4609 20.2955 28.422 20.1235 28.3465C19.9515 28.271 19.7953 28.1604 19.6637 28.0209L13.5791 21.5859V14.0859H20.6624L26.747 20.5284C27.0109 20.8095 27.159 21.1897 27.159 21.5859C27.159 21.9822 27.0109 22.3624 26.747 22.6434Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
                <defs>
                <clipPath id="clip0_690_5726">
                <rect width="17" height="18" fill="white" transform="translate(12.1621 12.5859)"/>
                </clipPath>
                </defs>
                </svg>

              </div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Print Driver Tags
              </DialogTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="h-8 w-8 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <DialogDescription className="text-base font-medium text-gray-700 mb-1">
            Select Label slots to print
          </DialogDescription>
          <p className="text-sm text-gray-500 mb-6">
            Click the positions you want to print. To print a full sheet, use Regular Print.
          </p>

          {/* Grid: 2x4 slots */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {selectedSlots.map((isSelected, index) => (
              <div
                key={index}
                className={`relative border-2 rounded-xl h-20 flex flex-col items-center justify-center p-3 cursor-pointer transition-all duration-200 ease-in-out
                  ${isSelected 
                    ? "border-blue-500 bg-blue-50 shadow-sm scale-[0.98]" 
                    : "border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white"
                  }
                `}
                onClick={() => handleSlotToggle(index)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="w-full h-full flex flex-col gap-1.5 justify-center items-center opacity-60">
                  <div className="w-4/5 h-1 bg-gray-400 rounded-full" />
                  <div className="w-3/4 h-1 bg-gray-400 rounded-full" />
                  <div className="w-4/5 h-1 bg-gray-400 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Counter & select/unselect all buttons */}
          <div className="flex flex-col items-center mb-6">
            <div className="mb-3 text-gray-600 text-sm">
              <span className="font-semibold text-gray-900">{selectedCount}</span> of {SLOT_COUNT} slots selected
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
                className="h-8 px-4 text-xs font-medium border-gray-300 hover:bg-gray-50"
              >
                Select all
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleUncheckAll}
                className="h-8 px-4 text-xs font-medium border-gray-300 hover:bg-gray-50"
              >
                Uncheck all
              </Button>
            </div>
          </div>

          {/* Footer action buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 h-11 font-medium border-gray-300 hover:bg-gray-50" 
              onClick={handleRegularPrintClick}
            >
              Regular print
            </Button>
            <Button
              className="flex-1 h-11 font-medium bg-blue-600 hover:bg-blue-700 text-white"
              disabled={selectedCount === 0}
              onClick={handleGenerateLabelsClick}
            >
              Generate labels
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
