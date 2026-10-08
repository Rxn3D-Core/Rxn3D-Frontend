"use client";

import { Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { SlipUndoLocationPreview } from "@/lib/slip-location";

export interface UndoLocationConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  preview: SlipUndoLocationPreview | null;
  loading?: boolean;
  slipNumber?: string;
  patientName?: string;
}

export function UndoLocationConfirmModal({
  open,
  onClose,
  onConfirm,
  preview,
  loading = false,
  slipNumber,
  patientName,
}: UndoLocationConfirmModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <Undo2 className="h-5 w-5" />
            </span>
            Undo location step?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-[#374151]">
          {(slipNumber || patientName) && (
            <p className="text-[#6B7280]">
              {slipNumber ? `Slip ${slipNumber}` : "Slip"}
              {patientName ? ` · ${patientName}` : ""}
            </p>
          )}

          {preview ? (
            <>
              <p>
                This will send the slip to the previous location:{" "}
                <strong>{preview.toLabel}</strong>
                {" "}(from {preview.fromLabel}).
              </p>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="mb-1.5 font-medium text-amber-950">What will happen</p>
                <ul className="list-disc space-y-1 pl-4 text-amber-950/90">
                  {preview.effects.map((effect) => (
                    <li key={effect}>{effect}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p>This location cannot be undone.</p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={loading} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            className="bg-amber-600 hover:bg-amber-700"
            disabled={loading || !preview}
            onClick={() => void onConfirm()}
          >
            {loading ? "Sending…" : "Send to previous location"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
