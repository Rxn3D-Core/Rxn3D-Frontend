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
  ImageDropzone,
  SignaturePad,
  useSlipDriverTimeline,
  type DeliveryInfoField,
} from "@/components/driver-delivery/delivery-parts";
import type { UploadedImage } from "@/lib/image-to-base64";
import { useToast } from "@/hooks/use-toast";

export interface ReadyToSendConfirmPayload {
  signature: string;
  image?: File | null;
}

export interface ReadyToSendModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: ReadyToSendConfirmPayload) => void | Promise<void>;
  submitting?: boolean;
  slipId: number;
  office?: string;
  patientName?: string;
  slipNumber?: string;
  location?: string;
  title?: string;
  /** When true, a signature must be captured before confirming. Default false. */
  signatureRequired?: boolean;
  /** When true, show the proof photo upload. Default false. */
  photoEnabled?: boolean;
  /** When true (and photoEnabled), a photo is required. Default false. */
  photoRequired?: boolean;
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
  photoEnabled = false,
  photoRequired = false,
}: ReadyToSendModalProps) {
  const { toast } = useToast();
  const [signature, setSignature] = useState("");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const signatureOk = !signatureRequired || Boolean(signature.trim());
  const photoOk = !photoRequired || Boolean(image);
  const canConfirm = signatureOk && photoOk;
  const timeline = useSlipDriverTimeline(
    Number.isFinite(slipId) ? slipId : null,
    open
  );

  useEffect(() => {
    if (!open) {
      setSignature("");
      setImage(null);
    }
  }, [open]);

  const infoFields: DeliveryInfoField[] = [
    { label: "Office", value: office },
    { label: "Pt name", value: patientName },
    { label: "Location", value: location },
    { label: "Slip #", value: slipNumber },
  ].filter((f) => Boolean(f.value));

  const submit = () => {
    if (!canConfirm || submitting) return;
    void onConfirm({
      signature: signature.trim(),
      image: image?.file ?? null,
    });
  };

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

          {(photoEnabled || signatureRequired) && (
            <div className="space-y-3 pt-2">
              {photoEnabled ? (
                <ImageDropzone
                  image={image}
                  onChange={setImage}
                  onRejected={(names) => {
                    toast({
                      title: "Only images are allowed",
                      description:
                        names.length > 0
                          ? `Skipped: ${names.join(", ")}`
                          : "Please choose an image file.",
                      variant: "destructive",
                    });
                  }}
                  required={photoRequired}
                  hint={
                    photoRequired
                      ? "A proof photo is required before confirming."
                      : "Optional proof photo for this ready-to-send action."
                  }
                />
              ) : null}

              {signatureRequired ? (
                <SignaturePad
                  value={signature}
                  onChange={setSignature}
                  onSubmit={submit}
                  placeholder="Signature"
                />
              ) : null}
            </div>
          )}
        </div>

        <DeliveryModalFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmLabel="Confirm"
          confirmDisabled={!canConfirm}
          submitting={submitting}
        />
      </DialogContent>
    </Dialog>
  );
}
