"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { buildApiUrl } from "@/lib/api/client";
import { slipService, QRScanPayload, QRScanResponse, QRScanResponseData } from "@/services/slip";
import {
  processDriverScanApiResult,
  saveDriverSessionKey,
  loadDriverSessionKey,
  parseDriverQrText,
} from "@/lib/driver-qr-scan";

// Types for the driver slip context
export interface DriverSlipLocation {
  id: number;
  name: string;
}

export interface DriverSlipData {
  id: number;
  slip_number: string;
  current_location: DriverSlipLocation;
}

export interface DriverHistoryEntry {
  id: number;
  timestamp: string;
  location: string;
  user: string;
  receiver?: string;
  notes?: string;
}

export interface DriverSlipResponse {
  success: boolean;
  message: string;
  data: {
    slip: DriverSlipData;
    driver_history: DriverHistoryEntry[];
  };
}

// Export QR scan types for easy access
export type { QRScanResponse, QRScanResponseData, QRScanPayload };

interface DriverSlipContextType {
  driverSlipData: DriverSlipResponse | null;
  qrScanData: QRScanResponse | null;
  loading: boolean;
  qrScanLoading: boolean;
  error: string | null;
  qrScanError: string | null;
  sessionKey: string | null;
  fetchDriverSlipHistory: (slipId: number) => Promise<void>;
  scanQRCode: (qrText: string, sessionKey?: string) => Promise<QRScanResponse | null>;
  clearDriverSlipData: () => void;
  clearQRScanData: () => void;
  setSessionKey: (key: string | null) => void;
}

const DriverSlipContext = createContext<DriverSlipContextType | undefined>(undefined);

export function DriverSlipProvider({ children }: { children: ReactNode }) {
  const [driverSlipData, setDriverSlipData] = useState<DriverSlipResponse | null>(null);
  const [qrScanData, setQrScanData] = useState<QRScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrScanLoading, setQrScanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrScanError, setQrScanError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  // Helper to get token from localStorage
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  const fetchDriverSlipHistory = async (slipId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await fetch(buildApiUrl(`/slip/driver-history/slip/${slipId}`), {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch driver history: ${response.statusText}`);
      }

      const data: DriverSlipResponse = await response.json();
      setDriverSlipData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred while fetching driver history";
      setError(errorMessage);
      console.error("Driver slip history fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const scanQRCode = async (qrText: string, currentSessionKey?: string): Promise<QRScanResponse | null> => {
    setQrScanLoading(true);
    setQrScanError(null);

    try {
      const parsedData = parseDriverQrText(qrText);
      
      if (!parsedData || parsedData.slip_ids.length === 0) {
        throw new Error("Invalid QR code format. Unable to extract case and slip information.");
      }

      const payload: QRScanPayload = {
        case_id: parsedData.case_id,
        slip_ids: parsedData.slip_ids,
        ...(currentSessionKey || sessionKey ? { session_key: currentSessionKey || sessionKey! } : {})
      };

      const response = await slipService.scanQR(payload);
      const outcome = processDriverScanApiResult(response, qrScanData?.data ?? [], parsedData.slip_ids);

      if (!outcome.ok || !outcome.response) {
        throw new Error(outcome.message);
      }

      const sanitizedResponse = outcome.response;

      if (!slipService.validateQRScanResult(sanitizedResponse)) {
        throw new Error("Invalid response from QR scan API");
      }

      setQrScanData(sanitizedResponse);
      setSessionKey(sanitizedResponse.session_key);
      saveDriverSessionKey(sanitizedResponse.session_key);

      return sanitizedResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred while scanning QR code";
      setQrScanError(errorMessage);
      console.error("QR scan error:", err);
      return null;
    } finally {
      setQrScanLoading(false);
    }
  };

  const clearDriverSlipData = () => {
    setDriverSlipData(null);
    setError(null);
  };

  const clearQRScanData = () => {
    setQrScanData(null);
    setQrScanError(null);
    setSessionKey(null);
    saveDriverSessionKey(null);
  };

  const setSessionKeyValue = (key: string | null) => {
    setSessionKey(key);
    saveDriverSessionKey(key);
  };

  // Load session key from localStorage on mount
  React.useEffect(() => {
    const savedSessionKey = loadDriverSessionKey();
    if (savedSessionKey) {
      setSessionKey(savedSessionKey);
    }
  }, []);

  const contextValue: DriverSlipContextType = {
    driverSlipData,
    qrScanData,
    loading,
    qrScanLoading,
    error,
    qrScanError,
    sessionKey,
    fetchDriverSlipHistory,
    scanQRCode,
    clearDriverSlipData,
    clearQRScanData,
    setSessionKey: setSessionKeyValue,
  };

  return (
    <DriverSlipContext.Provider value={contextValue}>
      {children}
    </DriverSlipContext.Provider>
  );
}

export function useDriverSlip() {
  const context = useContext(DriverSlipContext);
  if (!context) {
    throw new Error("useDriverSlip must be used within a DriverSlipProvider");
  }
  return context;
}