"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Loader2, Truck, User, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSlipDriverHistory,
  normalizeSlipDriverHistoryPayload,
} from "@/lib/api/slip-driver-history";

function PersonCell({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-300">
        <User className="h-3 w-3 text-gray-600" aria-hidden />
      </div>
      <span className="text-gray-900">{name}</span>
    </div>
  );
}

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
  /** When provided, Submit sends the signature text to the parent. */
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
  const [timeline, setTimeline] = useState<
    Array<{
      timestamp: string;
      location: string;
      user: string;
      receiver: string;
    }>
  >([]);

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

  const slipHistories = useMemo(
    () => [
      {
        slipNumber,
        stage: displayStage,
        deliveryDate: displayDelivery,
        isRush: displayRush,
      },
    ],
    [slipNumber, displayStage, displayDelivery, displayRush]
  );

  const handleSubmit = async () => {
    if (onSubmitSignature) {
      if (!signature.trim()) return;
      setSubmitting(true);
      try {
        await onSubmitSignature(signature.trim());
        setSignature("");
        onClose();
      } finally {
        setSubmitting(false);
      }
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl w-full mx-4 rounded-xl p-0 overflow-hidden bg-white shadow-2xl border-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Driver History</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-8 py-6">
          <div className="mb-8 grid grid-cols-2 gap-x-16 gap-y-4">
            <div className="space-y-4">
              <div className="flex">
                <span className="w-20 font-medium text-gray-700">Office:</span>
                <span className="font-semibold text-gray-900">{displayOffice}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-medium text-gray-700">Code:</span>
                <span className="font-semibold text-gray-900">{displayCode}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-medium text-gray-700">Patient:</span>
                <span className="font-semibold text-gray-900">{displayPatient}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex">
                <span className="w-20 font-medium text-gray-700">Pan #:</span>
                <span className="font-semibold text-gray-900">{pan || "----"}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-medium text-gray-700">Case #:</span>
                <span className="font-semibold text-gray-900">{displayCaseNo}</span>
              </div>
            </div>
          </div>

          <div className="mb-8 space-y-3">
            {slipHistories.map((s) => (
              <div
                key={s.slipNumber}
                className="flex items-center justify-between border-b border-gray-100 py-4 last:border-b-0"
              >
                <div className="flex items-center gap-1">
                  <ChevronRight className="h-5 w-5 text-gray-400" aria-hidden />
                  <div className="ml-2 flex flex-wrap items-center gap-4">
                    <div className="rounded-full bg-gray-100 px-4 py-2">
                      <span className="text-sm font-medium text-gray-700">
                        Slip #: {s.slipNumber}
                      </span>
                    </div>
                    <div className="rounded-full bg-gray-100 px-4 py-2">
                      <span className="text-sm font-medium text-gray-700">{s.stage}</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                        s.isRush ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {s.isRush && <Zap className="h-4 w-4 text-red-600" />}
                      {s.deliveryDate}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-600">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading driver history…</span>
            </div>
          ) : error ? (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : timeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-600">
              No driver history recorded for this slip yet.
            </p>
          ) : (
            <div className="mb-8">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-4 text-left text-base font-semibold text-gray-900">
                      Timestamp
                    </th>
                    <th className="py-4 text-left text-base font-semibold text-gray-900">
                      Location
                    </th>
                    <th className="py-4 text-left text-base font-semibold text-gray-900">
                      User
                    </th>
                    <th className="py-4 text-left text-base font-semibold text-gray-900">
                      Receiver
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-b-0">
                      <td className="py-4 text-gray-900">{row.timestamp}</td>
                      <td className="py-4 text-gray-900">{row.location}</td>
                      <td className="py-4">
                        <PersonCell name={row.user} />
                      </td>
                      <td className="py-4">
                        <PersonCell name={row.receiver} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="space-y-4">
            <Textarea
              className="min-h-[120px] w-full resize-none rounded-lg border-gray-300 text-base focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Signature *"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                className="rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-700"
                disabled={submitting || (Boolean(onSubmitSignature) && !signature.trim())}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Submitting…" : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
