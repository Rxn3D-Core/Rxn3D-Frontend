"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SlipListingReadyToSendIcon } from "@/components/slip-listing/SlipListingReadyToSendIcon";
import {
  DeliveryInfoBar,
  DeliveryModalFooter,
  DeliveryModalHeader,
  DeliveryPills,
  DeliveryTimeline,
  SignaturePad,
  useSlipDriverTimeline,
  type DeliveryInfoField,
} from "@/components/driver-delivery/delivery-parts";

export interface ReadyToSendModalProps {
  open: boolean;
  onClose: () => void;
  /** Receives the captured signature (UI now; backend wiring pending). */
  onConfirm: (signature: string) => void | Promise<void>;
  submitting?: boolean;
  slipId: number;
  office?: string;
  patientName?: string;
  slipNumber?: string;
  location?: string;
  title?: string;
  /** When true, a signature must be captured before confirming. Default false. */
  signatureRequired?: boolean;
}

export default function ReadyToSendModal({
  open,
  onClose,
  onConfirm,
  submitting = false,
  slipId,
  office,
  patientName,
  slipNumber,
  location,
  title = "Ready to send",
  signatureRequired = false,
}: ReadyToSendModalProps) {
  const [signature, setSignature] = useState("");
  const canConfirm = !signatureRequired || Boolean(signature.trim());
  const timeline = useSlipDriverTimeline(
    Number.isFinite(slipId) ? slipId : null,
    open
  );

  useEffect(() => {
    if (!open) setSignature("");
  }, [open]);

  const infoFields: DeliveryInfoField[] = [
    { label: "Office", value: office },
    { label: "Pt name", value: patientName },
    { label: "Location", value: location },
    { label: "Slip #", value: slipNumber },
  ].filter((f) => Boolean(f.value));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[min(96vw,1080px)] max-w-none flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-0 shadow-xl max-h-[90dvh]"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <DeliveryModalHeader
          icon={<SlipListingReadyToSendIcon className="h-8 w-auto" />}
          title={title}
          onClose={onClose}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-2 sm:px-8">
          {infoFields.length > 0 ? <DeliveryInfoBar fields={infoFields} /> : null}

          <DeliveryPills
            items={[
              slipNumber ? `Slip# ${slipNumber}` : null,
              location || null,
            ]}
          />

          <DeliveryTimeline
            rows={timeline.rows}
            loading={timeline.loading}
            error={timeline.error}
          />

          {signatureRequired && (
            <div className="pt-2">
              <SignaturePad
                value={signature}
                onChange={setSignature}
                onSubmit={() => {
                  if (canConfirm && !submitting) void onConfirm(signature.trim());
                }}
                placeholder="Signature"
              />
            </div>
          )}
        </div>

        <DeliveryModalFooter
          onCancel={onClose}
          onConfirm={() => void onConfirm(signature.trim())}
          confirmLabel="Confirm"
          confirmDisabled={!canConfirm}
          submitting={submitting}
        />
      </DialogContent>
    </Dialog>
  );
}
