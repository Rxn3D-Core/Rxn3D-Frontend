"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSlipDriverHistory,
  normalizeSlipDriverHistoryPayload,
} from "@/lib/api/slip-driver-history";
import {
  DeliveryInfoBar,
  DeliveryModalFooter,
  DeliveryModalHeader,
  DeliveryTimeline,
  SignaturePad,
  type DeliveryInfoField,
  type DeliveryTimelineRow,
} from "@/components/driver-delivery/delivery-parts";

export interface SlipDriverHistoryViewModalProps {
  open: boolean;
  onClose: () => void;
  slipId: number;
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
  slipId,
  office = "—",
  code = "—",
  patient = "—",
  pan = "----",
  caseNo = "—",
  stage = "—",
  deliveryDate = "—",
  isRush = false,
  onSubmitSignature,
}: SlipDriverHistoryViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState("");
  const [slipNumber, setSlipNumber] = useState("—");
  const [currentLocation, setCurrentLocation] = useState("—");
  const [apiOffice, setApiOffice] = useState<string | null>(null);
  const [apiCode, setApiCode] = useState<string | null>(null);
  const [apiPatient, setApiPatient] = useState<string | null>(null);
  const [apiCaseNo, setApiCaseNo] = useState<string | null>(null);
  const [apiStage, setApiStage] = useState<string | null>(null);
  const [apiDelivery, setApiDelivery] = useState<string | null>(null);
  const [apiRush, setApiRush] = useState<boolean | null>(null);
  const [timeline, setTimeline] = useState<DeliveryTimelineRow[]>([]);

  const loadHistory = useCallback(async () => {
    if (!slipId || Number.isNaN(slipId)) {
      setError("Invalid slip");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getSlipDriverHistory(slipId);
      if (!res.success) {
        setError(res.message || "Failed to load driver history");
        setTimeline([]);
        return;
      }

      const normalized = normalizeSlipDriverHistoryPayload(res.data, slipId);
      if (!normalized) {
        setError("Failed to load driver history");
        setTimeline([]);
        return;
      }

      setSlipNumber(normalized.slipNumber);
      setCurrentLocation(normalized.currentLocation);
      setTimeline(normalized.timeline);
      if (normalized.officeName) setApiOffice(normalized.officeName);
      if (normalized.officeCode) setApiCode(normalized.officeCode);
      if (normalized.patientName) setApiPatient(normalized.patientName);
      if (normalized.caseNumber) setApiCaseNo(normalized.caseNumber);
      if (normalized.stageName) setApiStage(normalized.stageName);
      if (normalized.deliveryDateLabel) setApiDelivery(normalized.deliveryDateLabel);
      if (normalized.isRush !== undefined) setApiRush(normalized.isRush);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load driver history");
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  }, [slipId]);

  useEffect(() => {
    if (open) {
      setSignature("");
      setApiOffice(null);
      setApiCode(null);
      setApiPatient(null);
      setApiCaseNo(null);
      setApiStage(null);
      setApiDelivery(null);
      setApiRush(null);
      void loadHistory();
    }
  }, [open, loadHistory]);

  const displayOffice = apiOffice ?? office;
  const displayCode = apiCode ?? code;
  const displayPatient = apiPatient ?? patient;
  const displayCaseNo = apiCaseNo ?? caseNo;
  const displayStage = apiStage ?? (stage !== "—" ? stage : currentLocation);
  const displayDelivery = apiDelivery ?? deliveryDate;
  const displayRush = apiRush ?? isRush;

  const infoFields: DeliveryInfoField[] = useMemo(
    () =>
      [
        { label: "Office", value: displayOffice },
        { label: "Code", value: displayCode },
        { label: "Pt name", value: displayPatient },
        { label: "Pan #", value: pan || "----" },
        { label: "Case #", value: displayCaseNo },
      ].filter((f) => Boolean(f.value)),
    [displayOffice, displayCode, displayPatient, pan, displayCaseNo]
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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-2 sm:px-8">
          {infoFields.length > 0 ? <DeliveryInfoBar fields={infoFields} /> : null}

          {/* Slip / stage / delivery pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 py-3">
            <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-1.5 text-[13px] font-medium text-[#374151]">
              Slip# {slipNumber}
            </span>
            {displayStage && displayStage !== "—" ? (
              <span className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-1.5 text-[13px] font-medium text-[#374151]">
                {displayStage}
              </span>
            ) : null}
            {displayDelivery && displayDelivery !== "—" ? (
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium",
                  displayRush
                    ? "bg-red-50 text-red-600"
                    : "border border-[#E5E7EB] bg-[#F9FAFB] text-[#374151]"
                )}
              >
                {displayRush ? <Zap className="h-3.5 w-3.5 text-red-600" /> : null}
                {displayDelivery}
              </span>
            ) : null}
          </div>

          <DeliveryTimeline
            rows={timeline}
            loading={loading}
            error={error}
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
