"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  CaseDriverHistorySection,
  DeliveryInfoBar,
  DeliveryModalFooter,
  DeliveryModalHeader,
  SignaturePad,
  type DeliveryInfoField,
} from "@/components/driver-delivery/delivery-parts";

export interface SlipDriverHistoryViewModalProps {
  open: boolean;
  onClose: () => void;
  slipId: number;
  caseId?: number;
  office?: string;
  code?: string;
  patient?: string;
  pan?: string;
  caseNo?: string;
  stage?: string;
  deliveryDate?: string;
  isRush?: boolean;
  /** When provided, the modal captures a signature and submits it on Confirm. */
  onSubmitSignature?: (signature: string) => void | Promise<void>;
}

export function SlipDriverHistoryViewModal({
  open,
  onClose,
  slipId: _slipId,
  caseId,
  office = "—",
  code = "—",
  patient = "—",
  pan = "----",
  caseNo = "—",
  onSubmitSignature,
}: SlipDriverHistoryViewModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [signature, setSignature] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setSignature("");
  }, [open]);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, []);

  const infoFields: DeliveryInfoField[] = useMemo(
    () =>
      [
        { label: "Office", value: office },
        { label: "Code", value: code },
        { label: "Pt name", value: patient },
        { label: "Pan #", value: pan || "----" },
        { label: "Case #", value: caseNo },
      ].filter((f) => Boolean(f.value)),
    [office, code, patient, pan, caseNo]
  );

  const handleSubmit = async () => {
    if (!onSubmitSignature) {
      onClose();
      return;
    }
    if (!signature.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitSignature(signature.trim());
      setSignature("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[min(96vw,1080px)] max-w-none flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-0 shadow-xl max-h-[90dvh]"
      >
        <DialogTitle className="sr-only">Driver History</DialogTitle>

        <DeliveryModalHeader
          icon={
            <Image
              src="/icons/virtual-slip-center/driver-history.svg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8"
            />
          }
          title="Driver History"
          onClose={onClose}
        />

        <div ref={scrollContainerRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-2 sm:px-8">
          {infoFields.length > 0 ? <DeliveryInfoBar fields={infoFields} sticky /> : null}

          <CaseDriverHistorySection
            caseId={caseId}
            open={open}
            onLoaded={scrollToBottom}
          />

          {onSubmitSignature ? (
            <div className="pt-2">
              <SignaturePad
                value={signature}
                onChange={setSignature}
                onSubmit={() => {
                  if (signature.trim() && !submitting) void handleSubmit();
                }}
                placeholder="Signature"
              />
            </div>
          ) : null}
        </div>

        {onSubmitSignature ? (
          <DeliveryModalFooter
            onCancel={onClose}
            onConfirm={handleSubmit}
            confirmLabel="Confirm"
            confirmDisabled={!signature.trim()}
            submitting={submitting}
          />
        ) : (
          <div className="flex shrink-0 items-center justify-center border-t border-[#F3F4F6] px-6 py-5 sm:px-8">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg bg-[#0E66B2] px-8 text-sm font-medium text-white transition-colors hover:bg-[#0c5a9f]"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
