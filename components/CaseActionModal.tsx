// components/CaseActionModal.tsx

import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import clsx from "clsx";

type CaseActionType = "hold" | "resume" | "cancel" | "cancelled";

interface CaseActionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (reason: string) => void;
  actionType: CaseActionType;
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  buttonText?: string;
  buttonColor?: "error" | "success" | "warning";
  reasonPlaceholder?: string;
  warning?: string;
  successMessage?: string;
}

const buttonClassMap: Record<string, { bg: string, icon: string }> = {
  error: { bg: "#D32F2F", icon: "#ffffff" },
  success: { bg: "#43A047", icon: "#ffffff" },
  warning: { bg: "#FFB400", icon: "#ffffff" },
};

const CaseActionModal: React.FC<CaseActionModalProps> = ({
  open,
  onClose,
  onSubmit,
  actionType,
  title,
  description,
  icon,
  iconBgColor,
  iconColor,
  buttonText,
  buttonColor,
  reasonPlaceholder,
  warning,
  successMessage,
}) => {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (onSubmit) onSubmit(reason.trim());
    setReason("");
  };

  // "Case Cancelled" special modal (success state)
  if (actionType === "cancelled") {
    return (
      <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
        <DialogContent className="max-w-lg p-0 overflow-visible">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-start p-8 gap-4">
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 flex items-center justify-center rounded-full flex-shrink-0"
                style={{ backgroundColor: buttonColor ? buttonClassMap[buttonColor].bg : iconBgColor }}
              >
                {React.cloneElement(icon as React.ReactElement, {
                  size: 28,
                  color: buttonColor ? buttonClassMap[buttonColor].icon : iconColor,
                })}
              </div>
              <div>
                <div className="font-semibold text-lg text-gray-900">{title}</div>
                <div className="text-sm text-gray-600">{successMessage || "You have successfully cancelled the case."}</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
              <DialogContent className="max-w-lg p-0 overflow-visible">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col p-8">
          {/* Header with icon and text */}
          <div className="flex items-center gap-4 mb-8">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: buttonColor ? buttonClassMap[buttonColor].bg : iconBgColor }}
            >
              {React.cloneElement(icon as React.ReactElement, {
                size: 28,
                color: buttonColor ? buttonClassMap[buttonColor].icon : iconColor,
              })}
            </div>
            <div>
              <div className="font-semibold text-lg text-gray-900 mb-1">{title}</div>
              <div className="text-sm text-gray-600">{description}</div>
            </div>
          </div>

          {/* Textarea */}
          <Textarea
            placeholder={reasonPlaceholder}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="mb-8 border border-gray-300 rounded-md px-4 py-3 w-full text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
          />

          {/* Warning text if provided */}
          {warning && (
            <div className="text-xs text-gray-500 mb-6">{warning}</div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="px-8 py-2.5 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="px-8 py-2.5 text-sm font-medium rounded-md text-white"
              style={{ 
                backgroundColor: buttonColor ? buttonClassMap[buttonColor].bg : '#6B7280',
                borderColor: buttonColor ? buttonClassMap[buttonColor].bg : '#6B7280'
              }}
              onClick={handleSubmit}
              disabled={!reason.trim()}
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CaseActionModal;