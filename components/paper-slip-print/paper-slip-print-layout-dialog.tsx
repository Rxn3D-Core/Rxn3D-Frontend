"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { PaperSlipPrintLayout } from "@/lib/paper-slip-print-layout";

export interface PaperSlipPrintLayoutDialogProps {
  open: boolean;
  initialLayout: PaperSlipPrintLayout;
  onCancel: () => void;
  onConfirm: (layout: PaperSlipPrintLayout) => void;
}

export function PaperSlipPrintLayoutDialog({
  open,
  initialLayout,
  onCancel,
  onConfirm,
}: PaperSlipPrintLayoutDialogProps) {
  const [layout, setLayout] = useState<PaperSlipPrintLayout>(initialLayout);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">How do you want to print?</DialogTitle>
        </DialogHeader>

        <RadioGroup
          value={layout}
          onValueChange={(value) => {
            if (value === "full" || value === "half") setLayout(value);
          }}
          className="mt-2 gap-3"
          aria-label="Paper slip print layout"
        >
          <label
            htmlFor="paper-slip-layout-full"
            className="flex cursor-pointer items-start gap-3 rounded-md border border-[#e5e7eb] p-3 has-[[data-state=checked]]:border-[#1162A8] has-[[data-state=checked]]:bg-[#f0f7fc]"
          >
            <RadioGroupItem id="paper-slip-layout-full" value="full" className="mt-0.5" />
            <span className="min-w-0">
              <Label htmlFor="paper-slip-layout-full" className="cursor-pointer text-[14px] font-medium text-[#111827]">
                Full page
              </Label>
              <span className="mt-1 block text-[13px] leading-5 text-[#6b7280]">
                Portrait — one slip per Letter / A4 sheet.
              </span>
            </span>
          </label>

          <label
            htmlFor="paper-slip-layout-half"
            className="flex cursor-pointer items-start gap-3 rounded-md border border-[#e5e7eb] p-3 has-[[data-state=checked]]:border-[#1162A8] has-[[data-state=checked]]:bg-[#f0f7fc]"
          >
            <RadioGroupItem id="paper-slip-layout-half" value="half" className="mt-0.5" />
            <span className="min-w-0">
              <Label htmlFor="paper-slip-layout-half" className="cursor-pointer text-[14px] font-medium text-[#111827]">
                Half page
              </Label>
              <span className="mt-1 block text-[13px] leading-5 text-[#6b7280]">
                Landscape — two slips side by side. Cut down the middle; each half is a portrait slip.
              </span>
            </span>
          </label>
        </RadioGroup>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onConfirm(layout)}>
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
