"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useSlipContext } from "@/app/lab-case-management/SlipContext";
import { useToast } from "@/hooks/use-toast";
import DriverHistoryModal from "@/components/driver-history-modal";
import type { QRScanResponse } from "@/services/slip";
import {
  loadDriverSessionKey,
  processDriverScanApiResult,
  saveDriverSessionKey,
} from "@/lib/driver-qr-scan";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DriverQrLandingProps = {
  caseId: number;
  slipIds: number[];
};

/**
 * Landing handler when a slip QR is opened via the phone's native camera
 * (or any deep link to /case/{id}?slips=...). Reuses the same driver pickup
 * flow as the in-app header scanner.
 */
export function DriverQrLanding({ caseId, slipIds }: DriverQrLandingProps) {
  const { user, isLoading: authLoading, token } = useAuth();
  const { scanQrCode, clearDriverSession } = useSlipContext();
  const { toast } = useToast();
  const router = useRouter();

  const [qrScanData, setQrScanData] = useState<QRScanResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const sessionRef = useRef<string | null>(loadDriverSessionKey());
  const hasScannedRef = useRef(false);

  const redirectToLogin = useCallback(() => {
    const returnPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : `/case/${caseId}?slips=${slipIds.join(",")}`;
    router.replace(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }, [router, caseId, slipIds]);

  const runScan = useCallback(async () => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    setScanning(true);
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
      toast({
        title: "QR Scan Successful",
        description: `Added ${outcome.validSlips.length} slip(s) for delivery`,
        duration: 3000,
      });
    } catch {
      setError("Failed to scan QR code.");
    } finally {
      setScanning(false);
    }
  }, [caseId, slipIds, scanQrCode, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user && !token) {
      redirectToLogin();
      return;
    }
    void runScan();
  }, [authLoading, user, token, redirectToLogin, runScan]);

  const clearSession = useCallback(() => {
    if (sessionRef.current) {
      void clearDriverSession(sessionRef.current);
      sessionRef.current = null;
    }
    saveDriverSessionKey(null);
  }, [clearDriverSession]);

  if (authLoading || scanning) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1162A8]" />
        <p className="text-lg text-muted-foreground">Processing slip QR code…</p>
      </div>
    );
  }

  if (error && !qrScanData?.data?.length) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center max-w-md mx-auto">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Unable to scan slip</h1>
        <p className="text-muted-foreground">{error}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.replace("/dashboard")}>
            Go to dashboard
          </Button>
          <Button
            onClick={() => {
              hasScannedRef.current = false;
              void runScan();
            }}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!qrScanData?.data?.length) return null;

  return (
    <DriverHistoryModal
      isOpen={modalOpen}
      onClose={() => {
        setModalOpen(false);
        setQrScanData(null);
        clearSession();
        router.replace("/dashboard");
      }}
      qrScanData={qrScanData.data}
      onSubmitted={() => {
        clearSession();
        router.replace("/dashboard");
      }}
    />
  );
}
