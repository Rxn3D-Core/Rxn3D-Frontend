"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useSlipContext } from "@/app/lab-case-management/SlipContext";
import { useToast } from "@/hooks/use-toast";
import DriverHistoryModal from "@/components/driver-history-modal";
import { QrScanActionChooser } from "@/components/qr-scan-action-chooser";
import ReadyToSendModal from "@/components/ready-to-send-modal";
import type { QRScanResponse } from "@/services/slip";
import {
  loadDriverSessionKey,
  processDriverScanApiResult,
  saveDriverSessionKey,
  persistDriverScanBatch,
  clearDriverScanBatch,
  hasActiveDriverPickupSession,
  DRIVER_QR_SCANNER_OPEN_EVENT,
} from "@/lib/driver-qr-scan";
import { fetchSlipQrIdentify, type SlipQrIdentifyResult } from "@/lib/api/slip-qr-identify";
import {
  buildQrScanChooserActions,
  resolveActiveQrScanAudience,
  type QrScanChooserAction,
  type QrScanChooserActionId,
} from "@/lib/qr-scan-actions";
import { buildVirtualSlipPath } from "@/lib/virtual-slip-routes";
import { useSignatureRequirementSettings } from "@/hooks/use-signature-requirement-settings";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DriverQrLandingProps = {
  caseId: number;
  slipIds: number[];
};

/**
 * Landing handler when a slip QR is opened via the phone's native camera
 * (or any deep link to /case/{id}?slips=...).
 *
 * Outside an active pickup session → role-aware action chooser.
 * Inside an active session → existing scan-qr pickup/drop-off flow.
 */
export function DriverQrLanding({ caseId, slipIds }: DriverQrLandingProps) {
  const { user, isLoading: authLoading, token, profileRole } = useAuth();
  const { scanQrCode, clearDriverSession, readyToSend } = useSlipContext();
  const { toast } = useToast();
  const router = useRouter();

  const [qrScanData, setQrScanData] = useState<QRScanResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  const [showChooser, setShowChooser] = useState(false);
  const [chooserIdentifying, setChooserIdentifying] = useState(false);
  const [chooserLoading, setChooserLoading] = useState(false);
  const [identify, setIdentify] = useState<SlipQrIdentifyResult | null>(null);
  const [chooserActions, setChooserActions] = useState<QrScanChooserAction[]>([]);
  const [showReadyToSend, setShowReadyToSend] = useState(false);
  const [readyToSendSubmitting, setReadyToSendSubmitting] = useState(false);
  const { readyToSendRequired } = useSignatureRequirementSettings(showReadyToSend);

  const sessionRef = useRef<string | null>(loadDriverSessionKey());
  const hasBootedRef = useRef(false);

  const userRoles = user?.roles || (user?.role ? [user.role] : []);

  const redirectToLogin = useCallback(() => {
    const returnPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : `/case/${caseId}?slips=${slipIds.join(",")}`;
    router.replace(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }, [router, caseId, slipIds]);

  const clearSession = useCallback(() => {
    if (sessionRef.current) {
      void clearDriverSession(sessionRef.current);
      sessionRef.current = null;
    }
    saveDriverSessionKey(null);
  }, [clearDriverSession]);

  const runPickupScan = useCallback(async () => {
    setChooserLoading(true);
    setError(null);
    try {
      const res = await scanQrCode(caseId, slipIds, sessionRef.current || undefined);
      const outcome = processDriverScanApiResult(res, [], slipIds);

      if (outcome.sessionKey) {
        sessionRef.current = outcome.sessionKey;
        saveDriverSessionKey(outcome.sessionKey);
      }

      if (outcome.alreadyInSession) {
        if (outcome.response?.data?.length) {
          setQrScanData(outcome.response);
          setModalOpen(true);
          setShowChooser(false);
        }
        toast({
          title: "Already added",
          description: outcome.message,
          duration: 4000,
        });
        return;
      }

      if (!outcome.ok || !outcome.response?.data?.length) {
        setError(outcome.message);
        toast({
          title: "QR Scan Failed",
          description: outcome.message,
          variant: "destructive",
          duration: 6000,
        });
        return;
      }

      setQrScanData(outcome.response);
      setModalOpen(true);
      setShowChooser(false);
      toast({
        title: "QR Scan Successful",
        description: `Added ${outcome.validSlips.length} slip(s) for delivery`,
        duration: 3000,
      });
    } catch {
      setError("Failed to scan QR code.");
    } finally {
      setChooserLoading(false);
      setBooting(false);
    }
  }, [caseId, slipIds, scanQrCode, toast]);

  const openChooser = useCallback(async () => {
    setShowChooser(true);
    setChooserIdentifying(true);
    setError(null);
    try {
      const result = await fetchSlipQrIdentify(slipIds[0], caseId);
      setIdentify(result);

      const audience = resolveActiveQrScanAudience({
        profileRole,
        userRoles,
        customerType:
          typeof window !== "undefined"
            ? localStorage.getItem("customerType")
            : null,
      });

      setChooserActions(
        buildQrScanChooserActions({
          audience,
          locationRef: {
            locationId: result.locationId,
            location: result.location,
          },
          canPickupDropoff: audience === "lab" || audience === "driver",
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not identify this slip QR code.",
      );
      setShowChooser(false);
    } finally {
      setChooserIdentifying(false);
      setBooting(false);
    }
  }, [caseId, slipIds, userRoles, profileRole]);

  useEffect(() => {
    if (authLoading) return;
    if (!user && !token) {
      redirectToLogin();
      return;
    }
    if (hasBootedRef.current) return;
    hasBootedRef.current = true;

    if (hasActiveDriverPickupSession() || sessionRef.current) {
      void runPickupScan();
    } else {
      void openChooser();
    }
  }, [authLoading, user, token, redirectToLogin, runPickupScan, openChooser]);

  const handleChooserSelect = useCallback(
    async (actionId: QrScanChooserActionId) => {
      if (!identify) return;

      if (actionId === "view_vslip") {
        router.replace(buildVirtualSlipPath(identify.caseId, identify.slipId));
        return;
      }

      if (actionId === "ready_to_send") {
        setShowChooser(false);
        setShowReadyToSend(true);
        return;
      }

      if (actionId === "pickup" || actionId === "dropoff") {
        await runPickupScan();
      }
    },
    [identify, router, runPickupScan],
  );

  const handleReadyToSend = useCallback(
    async (signature: string) => {
      if (!identify) return;
      setReadyToSendSubmitting(true);
      try {
        const res = await readyToSend(identify.slipId, signature);
        if (res?.success !== false) {
          toast({
            title: "Success",
            description: res?.message || "Slip marked as ready to pick up.",
            duration: 3000,
          });
          setShowReadyToSend(false);
          router.replace(buildVirtualSlipPath(identify.caseId, identify.slipId));
        } else {
          toast({
            title: "Error",
            description: res?.message ?? "Could not mark slip ready to pick up.",
            variant: "destructive",
            duration: 5000,
          });
        }
      } catch {
        toast({
          title: "Error",
          description: "Could not mark slip ready to pick up.",
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        setReadyToSendSubmitting(false);
      }
    },
    [identify, readyToSend, toast, router],
  );

  if (authLoading || booting) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1162A8]" />
        <p className="text-lg text-muted-foreground">Processing slip QR code…</p>
      </div>
    );
  }

  if (error && !qrScanData?.data?.length && !showChooser && !showReadyToSend) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center max-w-md mx-auto">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Unable to open slip</h1>
        <p className="text-muted-foreground">{error}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.replace("/dashboard")}>
            Go to dashboard
          </Button>
          <Button
            onClick={() => {
              hasBootedRef.current = false;
              setBooting(true);
              setError(null);
              if (hasActiveDriverPickupSession() || sessionRef.current) {
                void runPickupScan();
              } else {
                void openChooser();
              }
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <QrScanActionChooser
        open={showChooser}
        identifying={chooserIdentifying}
        loading={chooserLoading}
        caseId={identify?.caseId}
        slipNumber={identify?.slipNumber}
        patientName={identify?.patientName}
        location={identify?.location}
        officeLabel={identify?.officeLabel}
        actions={chooserActions}
        onSelect={handleChooserSelect}
        onClose={() => {
          if (chooserLoading || chooserIdentifying) return;
          setShowChooser(false);
          router.replace("/dashboard");
        }}
      />

      <ReadyToSendModal
        open={showReadyToSend}
        onClose={() => {
          if (!readyToSendSubmitting) {
            setShowReadyToSend(false);
            router.replace("/dashboard");
          }
        }}
        onConfirm={handleReadyToSend}
        submitting={readyToSendSubmitting}
        slipId={identify?.slipId ?? 0}
        office={identify?.officeLabel}
        patientName={identify?.patientName}
        slipNumber={identify?.slipNumber}
        location={identify?.location}
        title="Mark Ready to Pick Up"
        signatureRequired={readyToSendRequired}
      />

      {qrScanData?.data?.length ? (
        <DriverHistoryModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setQrScanData(null);
            clearSession();
            clearDriverScanBatch();
            router.replace("/dashboard");
          }}
          qrScanData={qrScanData.data}
          onRequestScan={() => {
            persistDriverScanBatch(qrScanData);
            setModalOpen(false);
            window.dispatchEvent(new CustomEvent(DRIVER_QR_SCANNER_OPEN_EVENT));
          }}
          onSubmitted={() => {
            clearSession();
            clearDriverScanBatch();
            router.replace("/dashboard");
          }}
          onQrBatchChange={(remaining) => {
            if (!remaining.length) {
              setQrScanData(null);
              clearDriverScanBatch();
              return;
            }
            setQrScanData((prev) => {
              const next = {
                ...(prev && typeof prev === "object" ? prev : { success: true as const }),
                data: remaining,
                scanned_cases_count: remaining.length,
              } as QRScanResponse;
              persistDriverScanBatch(next);
              return next;
            });
          }}
          onClearBatch={() => {
            setModalOpen(false);
            setQrScanData(null);
            clearSession();
            clearDriverScanBatch();
            router.replace("/dashboard");
          }}
        />
      ) : null}
    </>
  );
}
