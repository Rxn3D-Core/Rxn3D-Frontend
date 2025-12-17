"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";

type Slip = {
  id: number;
  createdAt: string;
  caseId?: number;
  caseNumber?: string;
  pan: string;
  panColor: string;
  panColorStyle?: React.CSSProperties;
  officeCode: string;
  patient: string;
  product: string;
  status: string;
  rush: boolean;
  location: string;
  attachment: boolean;
  dueDate: string;
  overdue: boolean;
  doctor?: string;
  user?: string;
  productType?: string;
  // ...add more fields as needed
};

type CallLog = any; // Replace with your call log type
type SlipNote = any; // Replace with your slip note type

type DriverPrintSlip = {
  case_id: number;
  slip_id: number;
  lab_name: string;
  office_code: string;
  pt_name: string;
  doctor_name: string;
  stage_code: string;
  stage_name: string;
  product_code: string;
  product_name: string;
  pickup_date: string;
  pickup_time: string;
  delivery_date: string;
  delivery_time: string;
  case_pan_number: string;
  case_number: string;
  slip_number: string;
};

type DriverPrintResponse = {
  slips: DriverPrintSlip[];
  total_slips: number;
  print_timestamp: string;
};

type ScanQrCodeResponse = {
  success: boolean;
  message: string;
  data: any[];
  session_key: string;
  current_office_code: string;
  scanned_cases_count: number;
};

type SubmitScannedSlipsResponse = {
  success: boolean;
  message: string;
  data?: any;
};

type SlipContextType = {
  slips: Slip[];
  callLogs: CallLog[];
  slipNotes: SlipNote[];
  loading: boolean;
  fetchLabSlips: (customerId: number) => Promise<void>;
  fetchOfficeSlips: (customerId: number) => Promise<void>;
  fetchCallLogs: () => Promise<void>;
  fetchSlipNotes: () => Promise<void>;
  fetchDriverPrintData: (slipIds: number[]) => Promise<DriverPrintResponse | null>;
  scanQrCode: (caseId: number, slipIds: number[]) => Promise<ScanQrCodeResponse | null>;
  submitScannedSlips: (slipIds: number[], signature: string) => Promise<SubmitScannedSlipsResponse | null>;
  fetchPickupDeliverySlips: (slipId: number) => Promise<any | null>;
  createCustomDeliveryDate: (slipId: number, delivery_date: string, delivery_time: string, notes?: string) => Promise<any | null>;
  fetchCustomDeliveryDates: (slipId: number) => Promise<any | null>;
};

const SlipContext = createContext<SlipContextType | undefined>(undefined);

export function SlipProvider({ children }: { children: ReactNode }) {
  const [slips, setSlips] = useState<Slip[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [slipNotes, setSlipNotes] = useState<SlipNote[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  // Helper to get token from localStorage
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  // Helper to handle 401 responses
  const handleUnauthorized = () => {
    if (typeof window !== "undefined") {
      // Clear token and user data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Redirect to login
      router.push("/login");
    }
  };

  // Helper to map API slip to UI slip
  const mapApiSlip = (apiSlip: any): Slip => ({
    id: apiSlip.id,
    createdAt: apiSlip.timestamp,
    caseId: apiSlip.case?.id,
    caseNumber: apiSlip.case?.case_number,
    pan: apiSlip.casepan?.number || "",
    panColor: "", // leave empty, use panColorStyle for inline style
    panColorStyle: apiSlip.casepan?.color_code
      ? { backgroundColor: apiSlip.casepan.color_code }
      : undefined,
    officeCode: apiSlip.office?.code || "",
    patient: apiSlip.case?.patient_name || "",
    product: apiSlip.products?.map((p: any) => p.name).join(", ") || "",
    status: apiSlip.status || "",
    rush: !!apiSlip.is_rush,
    location: apiSlip.location?.current?.name || "",
    attachment: !!apiSlip.attachments?.has_attachments,
    dueDate: apiSlip.delivery_date?.final_date || "",
    overdue: false, // You can set this based on your logic
    doctor: apiSlip.case?.doctor?.name || apiSlip.doctor || undefined,
    user: apiSlip.user?.name || apiSlip.user || undefined,
    productType: apiSlip.products?.[0]?.type || apiSlip.productType || undefined,
    // ...add more fields as needed
  });

  const fetchLabSlips = useCallback(async (customerId: number) => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/slip/listing/lab?customer_id=${customerId}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        }
      );
      
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      
      const api = await res.json();
      // Defensive: handle missing data
      const arr = api?.data?.data || [];
      setSlips(arr.map(mapApiSlip));
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const fetchOfficeSlips = useCallback(async (customerId: number) => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/slip/listing/office?customer_id=${customerId}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        }
      );
      
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      
      const api = await res.json();
      const arr = api?.data?.data || [];
      setSlips(arr.map(mapApiSlip));
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const fetchCallLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/slip/call-logs`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        }
      );
      
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      
      const data = await res.json();
      setCallLogs(data || []);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const fetchSlipNotes = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/slip/notes`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
        }
      );
      
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      
      const data = await res.json();
      setSlipNotes(data || []);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  const fetchDriverPrintData = useCallback(async (slipIds: number[]): Promise<DriverPrintResponse | null> => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/slip/driver-print`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ slip_ids: slipIds }),
        }
      );
      
      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }
      
      const response = await res.json();
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching driver print data:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // Scan QR Code API
  const scanQrCode = useCallback(async (caseId: number, slipIds: number[]): Promise<ScanQrCodeResponse | null> => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/slip/scan-qr`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ case_id: caseId, slip_ids: slipIds }),
        }
      );
      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }
      const response = await res.json();
      return response;
    } catch (error) {
      console.error('Error scanning QR code:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // Create Custom Delivery Date API
  const createCustomDeliveryDate = useCallback(async (
    slipId: number,
    delivery_date: string,
    delivery_time: string,
    notes?: string,
  ): Promise<any | null> => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/slip/custom-delivery-dates/${slipId}/create`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ delivery_date, delivery_time, notes }),
        }
      );

      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }

      const response = await res.json();
      return response;
    } catch (error) {
      console.error('Error creating custom delivery date:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // Fetch Custom Delivery Dates API
  const fetchCustomDeliveryDates = useCallback(async (slipId: number): Promise<any | null> => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/slip/custom-delivery-dates/${slipId}`,
        {
          method: 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }

      const response = await res.json();
      return response;
    } catch (error) {
      console.error('Error fetching custom delivery dates:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // Submit Scanned Slips API
  const submitScannedSlips = useCallback(async (slipIds: number[], signature: string): Promise<SubmitScannedSlipsResponse | null> => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/slip/submit-scanned-slips`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ slip_ids: slipIds, signature }),
        }
      );

      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }

      const response = await res.json();

      // If submission succeeded, attempt to refresh lab and office slip listings
      if (response && response.success) {
        try {
          if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const customerId = user?.customers?.[0]?.id;
            const customerType = localStorage.getItem('customerType'); // expected 'lab' or 'office'
            if (customerId) {
              if (customerType === 'lab') {
                void fetchLabSlips(customerId);
              } else if (customerType === 'office') {
                void fetchOfficeSlips(customerId);
              } else {
                // fallback: refresh both
                void fetchLabSlips(customerId);
                void fetchOfficeSlips(customerId);
              }
            }
          }
        } catch (err) {
          console.error('Error refetching slips after submitScannedSlips:', err);
        }
      }

      return response;
    } catch (error) {
      console.error('Error submitting scanned slips:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, fetchLabSlips, fetchOfficeSlips]);

  const fetchPickupDeliverySlips = useCallback(async (slipId: number): Promise<any | null> => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/slip/pickup-delivery-slips`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slip_id: slipId }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }

      const response = await res.json();
      return response;
    } catch (error) {
      console.error('Error fetching pickup/delivery slips:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [])

  return (
    <SlipContext.Provider value={{
      slips,
      callLogs,
      slipNotes,
      loading,
      fetchLabSlips,
      fetchOfficeSlips,
      fetchCallLogs,
      fetchSlipNotes,
      fetchDriverPrintData,
      scanQrCode,
      submitScannedSlips,
      createCustomDeliveryDate,
      fetchCustomDeliveryDates,
      fetchPickupDeliverySlips,
    }}>
      {children}
    </SlipContext.Provider>
  );
}

export function useSlipContext() {
  const ctx = useContext(SlipContext);
  if (!ctx) throw new Error("useSlipContext must be used within a SlipProvider");
  return ctx;
}
