"use client";

import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { QrScanChooserAction } from "@/lib/qr-scan-actions";
import type { QrScanChooserActionId } from "@/lib/qr-scan-actions";

export type QrScanActionChooserProps = {
  open: boolean;
  loading?: boolean;
  identifying?: boolean;
  caseId?: number;
  slipNumber?: string;
  patientName?: string;
  location?: string;
  officeLabel?: string;
  actions: QrScanChooserAction[];
  emptyMessage?: string;
  onSelect: (actionId: QrScanChooserActionId) => void;
  onClose: () => void;
};

/**
 * Post-scan action sheet shown after a slip QR is identified and there is no
 * active pickup/drop-off session. Does not change slip location by itself.
 */
export function QrScanActionChooser({
  open,
  loading = false,
  identifying = false,
  caseId,
  slipNumber,
  patientName,
  location,
  officeLabel,
  actions,
  emptyMessage = "No actions available for this slip at its current location.",
  onSelect,
  onClose,
}: QrScanActionChooserProps) {
  const busy = loading || identifying;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent
        showCloseButton={!busy}
        className="w-[min(92vw,420px)] max-w-none rounded-xl border border-[#E5E7EB] bg-white p-0 shadow-xl"
      >
        <div className="border-b border-[#E5E7EB] px-5 py-4">
          <DialogTitle className="text-lg font-semibold text-[#111827]">
            Slip identified
          </DialogTitle>
          <p className="mt-1 text-sm text-[#6B7280]">
            Choose an action. Scanning alone does not move the case.
          </p>
        </div>

        <div className="space-y-3 px-5 py-4">
          {identifying ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#6B7280]">
              <Loader2 className="h-5 w-5 animate-spin text-[#1162A8]" />
              Looking up slip…
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                {slipNumber ? (
                  <>
                    <dt className="text-[#6B7280]">Slip</dt>
                    <dd className="font-medium text-[#111827]">{slipNumber}</dd>
                  </>
                ) : null}
                {caseId ? (
                  <>
                    <dt className="text-[#6B7280]">Case</dt>
                    <dd className="font-medium text-[#111827]">#{caseId}</dd>
                  </>
                ) : null}
                {patientName ? (
                  <>
                    <dt className="text-[#6B7280]">Patient</dt>
                    <dd className="font-medium text-[#111827]">{patientName}</dd>
                  </>
                ) : null}
                {officeLabel ? (
                  <>
                    <dt className="text-[#6B7280]">Office</dt>
                    <dd className="font-medium text-[#111827]">{officeLabel}</dd>
                  </>
                ) : null}
                {location ? (
                  <>
                    <dt className="text-[#6B7280]">Location</dt>
                    <dd className="font-medium text-[#111827]">{location}</dd>
                  </>
                ) : null}
              </dl>

              {actions.length === 0 ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {emptyMessage}
                </p>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  {actions.map((action) => (
                    <Button
                      key={action.id}
                      type="button"
                      disabled={busy}
                      variant={action.primary ? "default" : "outline"}
                      className={
                        action.primary
                          ? "h-11 w-full bg-[#1162A8] text-base hover:bg-[#0E528C]"
                          : "h-11 w-full text-base"
                      }
                      onClick={() => onSelect(action.id)}
                    >
                      {loading && action.primary ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-[#E5E7EB] px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
