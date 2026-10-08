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
 * active pickup/drop-off session. Mobile-first bottom sheet layout.
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
        className="fixed bottom-0 left-1/2 top-auto z-50 flex w-full max-w-none translate-x-[-50%] translate-y-0 flex-col gap-0 rounded-t-2xl rounded-b-none border border-[#E5E7EB] bg-white p-0 shadow-xl max-h-[min(92dvh,720px)] overflow-hidden sm:bottom-auto sm:top-[50%] sm:w-[min(92vw,420px)] sm:translate-y-[-50%] sm:rounded-xl"
      >
        <div className="shrink-0 border-b border-[#E5E7EB] px-4 pb-3 pt-4 sm:px-5 sm:py-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#D1D5DB] sm:hidden" aria-hidden />
          <DialogTitle className="text-lg font-semibold text-[#111827] sm:text-xl">
            Slip identified
          </DialogTitle>
          <p className="mt-1 text-sm text-[#6B7280]">
            Choose an action. Scanning alone does not move the case.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {identifying ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-[#6B7280]">
              <Loader2 className="h-5 w-5 animate-spin text-[#1162A8]" />
              Looking up slip…
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                {slipNumber ? (
                  <>
                    <dt className="text-[#6B7280]">Slip</dt>
                    <dd className="break-words font-medium text-[#111827]">{slipNumber}</dd>
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
                    <dd className="break-words font-medium text-[#111827]">{patientName}</dd>
                  </>
                ) : null}
                {officeLabel ? (
                  <>
                    <dt className="text-[#6B7280]">Office</dt>
                    <dd className="break-words font-medium text-[#111827]">{officeLabel}</dd>
                  </>
                ) : null}
                {location ? (
                  <>
                    <dt className="text-[#6B7280]">Location</dt>
                    <dd className="break-words font-medium text-[#111827]">{location}</dd>
                  </>
                ) : null}
              </dl>

              {actions.length === 0 ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {emptyMessage}
                </p>
              ) : (
                <div className="flex flex-col gap-3 pt-2">
                  {actions.map((action) => (
                    <Button
                      key={action.id}
                      type="button"
                      disabled={busy}
                      variant={action.primary ? "default" : "outline"}
                      className={
                        action.primary
                          ? "h-12 w-full bg-[#1162A8] text-base font-semibold hover:bg-[#0E528C] sm:h-11"
                          : "h-12 w-full text-base sm:h-11"
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

        <div className="shrink-0 border-t border-[#E5E7EB] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-3">
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-full text-base sm:h-10"
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
