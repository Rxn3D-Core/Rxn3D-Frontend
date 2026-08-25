"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl } from "@/lib/api/client";
import { SLIP_LISTING_DEFAULT_PER_PAGE } from "@/app/lab-case-management/lab-slip-listing-constants";
import { applySlipAttachmentState } from "./attachment-state.mjs";
import { formatSlipListingProducts } from "./slip-listing-product-label.mjs";
import { formatSlipListingTimestamp } from "@/lib/slip-listing-timestamp";
import { resolveListingCustomerId } from "@/lib/customer-scope";

type Slip = {
  id: number;
  createdAt: string;
  caseId?: number;
  caseNumber?: string;
  billingId?: number;
  /** Display identifier from API (`slip_number`) */
  slipNumber?: string;
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
  /** Digital impressions (is_digital_impression = Yes) for Attachments column. */
  digitalImpressions?: Array<{ id: number; name: string; url?: string | null }>;
  newStageEligible?: boolean;
  dueDate: string;
  overdue: boolean;
  doctor?: string;
  user?: string;
  productType?: string;
  /** `location.current.id` from API — use for reliable location UI vs string name */
  locationId?: number;
  // ...add more fields as needed
};

export type LabListingQuery = {
  q?: string;
  office_code?: string;
  status?: string;
  statuses?: string[];
  location_id?: number;
  location_ids?: number[];
  delivery_date_start?: string;
  delivery_date_end?: string;
  has_attachments?: boolean;
  product_name?: string;
  page?: number;
  per_page?: number;
  order_by?: string;
  sort_by?: "asc" | "desc";
};

export type LabListingPagination = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
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

type ReadyToSendResponse = {
  success: boolean;
  message?: string;
  data?: unknown;
};

type SlipContextType = {
  slips: Slip[];
  callLogs: CallLog[];
  slipNotes: SlipNote[];
  loading: boolean;
  labListingPagination: LabListingPagination | null;
  rushCasePanColor: string | null;
  fetchLabSlips: (customerId: number, query?: LabListingQuery) => Promise<void>;
  fetchOfficeSlips: (customerId: number) => Promise<void>;
  fetchCallLogs: () => Promise<void>;
  fetchSlipNotes: () => Promise<void>;
  fetchDriverPrintData: (slipIds: number[]) => Promise<DriverPrintResponse | null>;
  scanQrCode: (caseId: number, slipIds: number[], sessionKey?: string) => Promise<ScanQrCodeResponse | null>;
  clearDriverSession: (sessionKey: string) => Promise<{ success: boolean; message?: string } | null>;
  submitScannedSlips: (slipIds: number[], signature: string, options?: { notes?: string; images?: Record<number, File> }) => Promise<SubmitScannedSlipsResponse | null>;
  fetchPickupDeliverySlips: (slipId: number) => Promise<any | null>;
  createCustomDeliveryDate: (slipId: number, delivery_date: string, delivery_time: string, notes?: string) => Promise<any | null>;
  fetchCustomDeliveryDates: (slipId: number) => Promise<any | null>;
  readyToSend: (slipId: number, signature?: string) => Promise<ReadyToSendResponse | null>;
  updateSlipAttachmentState: (slipId: number, hasAttachment: boolean) => void;
};

const SlipContext = createContext<SlipContextType | undefined>(undefined);

export function SlipProvider({ children }: { children: ReactNode }) {
  const [slips, setSlips] = useState<Slip[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [slipNotes, setSlipNotes] = useState<SlipNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [labListingPagination, setLabListingPagination] = useState<LabListingPagination | null>(null);
  const [rushCasePanColor, setRushCasePanColor] = useState<string | null>(null);
  const router = useRouter();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  /** Preserves last lab listing query so refetches (ready-to-send, driver submit, etc.) keep filters */
  const lastLabListingRef = useRef<{ customerId: number; query: LabListingQuery } | null>(null);
  const labListingRequestIdRef = useRef(0);

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
    createdAt: formatSlipListingTimestamp(
      apiSlip.timestamp ?? apiSlip.created_at ?? "",
    ),
    caseId: apiSlip.case?.id,
    caseNumber: apiSlip.case?.case_number,
    billingId:
      apiSlip.billing_id ??
      apiSlip.billingId ??
      apiSlip.invoice_id ??
      apiSlip.invoiceId ??
      apiSlip.billing?.id ??
      apiSlip.invoice?.id ??
      apiSlip.billing_invoice?.id ??
      apiSlip.slip_billing?.id ??
      undefined,
    slipNumber: apiSlip.slip_number ?? apiSlip.number ?? undefined,
    pan: apiSlip.casepan?.number || "",
    panColor: "", // leave empty, use panColorStyle for inline style
    panColorStyle: apiSlip.casepan?.color_code
      ? { backgroundColor: apiSlip.casepan.color_code }
      : undefined,
    officeCode: apiSlip.office?.code || "",
    patient: apiSlip.case?.patient_name || "",
    product: formatSlipListingProducts(apiSlip.products),
    status: apiSlip.status || "",
    rush: !!apiSlip.is_rush,
    location: apiSlip.location?.current?.name || "",
    attachment: !!apiSlip.attachments?.has_attachments,
    digitalImpressions: Array.isArray(apiSlip.attachments?.digital_impressions)
      ? apiSlip.attachments.digital_impressions
          .filter((item: any) => item && (item.name || item.code))
          .map((item: any) => ({
            id: Number(item.id),
            name: String(item.name || item.code || "").trim(),
            url: item.url ? String(item.url) : null,
          }))
          .filter((item: { name: string }) => item.name.length > 0)
      : [],
    newStageEligible:
      typeof apiSlip.new_stage_eligible === "string"
        ? apiSlip.new_stage_eligible.trim().toLowerCase() === "yes"
        : Boolean(apiSlip.new_stage_eligible),
    dueDate: apiSlip.delivery_date?.final_date || "",
    overdue: false, // You can set this based on your logic
    doctor: apiSlip.case?.doctor?.name || apiSlip.doctor || undefined,
    user: apiSlip.user?.name || apiSlip.user || undefined,
    productType: apiSlip.products?.[0]?.type || apiSlip.productType || undefined,
    locationId: typeof apiSlip.location?.current?.id === "number" ? apiSlip.location.current.id : undefined,
    // ...add more fields as needed
  });

  const fetchLabSlips = useCallback(async (customerId: number, query?: LabListingQuery) => {
    const effectiveQuery: LabListingQuery =
      query !== undefined
        ? query
        : lastLabListingRef.current?.customerId === customerId
          ? lastLabListingRef.current.query
          : {};
    lastLabListingRef.current = { customerId, query: { ...effectiveQuery } };

    const requestId = ++labListingRequestIdRef.current;
    const isStale = () => labListingRequestIdRef.current !== requestId;

    setLoading(true);
    try {
      if (!API_BASE_URL) {
        console.error(
          "fetchLabSlips: NEXT_PUBLIC_API_BASE_URL is not set. Copy .env.example to .env.local and restart the dev server."
        );
        if (!isStale()) {
          setSlips([]);
          setLabListingPagination(null);
        }
        return;
      }

      const token = getToken();
      const buildLabListingUrl = (queryOverride: LabListingQuery = {}) => {
        const requestQuery = { ...effectiveQuery, ...queryOverride };
        const params = new URLSearchParams();
        params.set("customer_id", String(customerId));
        if (requestQuery.q) params.set("q", requestQuery.q);
        if (requestQuery.office_code) params.set("office_code", requestQuery.office_code);
        if (requestQuery.status) params.set("status", requestQuery.status);
        requestQuery.statuses?.filter(Boolean).forEach((status) => {
          params.append("statuses[]", status);
        });
        if (requestQuery.location_id != null && !Number.isNaN(requestQuery.location_id)) {
          params.set("location_id", String(requestQuery.location_id));
        }
        requestQuery.location_ids
          ?.filter((id) => id != null && !Number.isNaN(id))
          .forEach((id) => {
            params.append("location_ids[]", String(id));
          });
        if (requestQuery.delivery_date_start) params.set("delivery_date_start", requestQuery.delivery_date_start);
        if (requestQuery.delivery_date_end) params.set("delivery_date_end", requestQuery.delivery_date_end);
        if (requestQuery.has_attachments === true) params.set("has_attachments", "1");
        if (requestQuery.product_name) params.set("product_name", requestQuery.product_name);
        if (requestQuery.page != null) params.set("page", String(requestQuery.page));
        if (requestQuery.per_page != null) params.set("per_page", String(requestQuery.per_page));
        if (requestQuery.order_by) params.set("order_by", requestQuery.order_by);
        if (requestQuery.sort_by) params.set("sort_by", requestQuery.sort_by);
        const qs = params.toString();
        return `${buildApiUrl("/slip/listing/lab")}${qs ? `?${qs}` : ""}`;
      };

      const requestLabListing = async (url: string) => fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/json",
        },
      });

      const url = buildLabListingUrl();

      const res = await requestLabListing(url);

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        console.error(`fetchLabSlips: HTTP ${res.status} for ${url}`);
        if (!isStale()) {
          setSlips([]);
          setLabListingPagination(null);
        }
        return;
      }

      const api = await res.json();
      if (isStale()) return;
      const arr = api?.data?.data || [];
      setSlips(arr.map(mapApiSlip));
      setRushCasePanColor(api?.data?.rush_casepan_color ?? null);
      const p = api?.data?.pagination;
      if (p && typeof p.total === "number") {
        setLabListingPagination({
          total: p.total,
          per_page: p.per_page ?? effectiveQuery.per_page ?? arr.length,
          current_page: p.current_page ?? effectiveQuery.page ?? 1,
          last_page: Math.max(1, p.last_page ?? 1),
        });
      } else {
        setLabListingPagination({
          total: arr.length,
          per_page: effectiveQuery.per_page ?? (arr.length > 0 ? arr.length : SLIP_LISTING_DEFAULT_PER_PAGE),
          current_page: effectiveQuery.page ?? 1,
          last_page: 1,
        });
      }
    } catch (error) {
      console.error("fetchLabSlips: network or request error", error);
      if (!isStale()) {
        setSlips([]);
        setLabListingPagination(null);
      }
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [API_BASE_URL]);

  const updateSlipAttachmentState = useCallback((slipId: number, hasAttachment: boolean) => {
    setSlips((currentSlips) => applySlipAttachmentState(currentSlips, slipId, hasAttachment));
  }, []);

  const fetchOfficeSlips = useCallback(async (customerId: number) => {
    setLoading(true);
    try {
      if (!API_BASE_URL) {
        console.error("fetchOfficeSlips: NEXT_PUBLIC_API_BASE_URL is not set.");
        setSlips([]);
        return;
      }

      const token = getToken();
      const url = `${buildApiUrl("/slip/listing/office")}?customer_id=${customerId}`;
      const res = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        console.error(`fetchOfficeSlips: HTTP ${res.status}`);
        setSlips([]);
        return;
      }

      const api = await res.json();
      const arr = api?.data?.data || [];
      setSlips(arr.map(mapApiSlip));
    } catch (error) {
      console.error("fetchOfficeSlips: network or request error", error);
      setSlips([]);
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

  // Scan QR Code API. Omit sessionKey on the first scan; pass the returned
  // session_key on every subsequent scan to stay in the same driver session.
  const scanQrCode = useCallback(async (caseId: number, slipIds: number[], sessionKey?: string): Promise<ScanQrCodeResponse | null> => {
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
          body: JSON.stringify({ case_id: caseId, slip_ids: slipIds, ...(sessionKey ? { session_key: sessionKey } : {}) }),
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

  // Clear the driver session after a pickup batch completes (resets office lock).
  const clearDriverSession = useCallback(async (sessionKey: string): Promise<{ success: boolean; message?: string } | null> => {
    try {
      const token = getToken();
      const res = await fetch(
        `${API_BASE_URL}/slip/clear-driver-session`,
        {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_key: sessionKey }),
        }
      );
      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }
      return await res.json();
    } catch (error) {
      console.error('Error clearing driver session:', error);
      return null;
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
  const submitScannedSlips = useCallback(async (slipIds: number[], signature: string, options?: { notes?: string; images?: Record<number, File> }): Promise<SubmitScannedSlipsResponse | null> => {
    setLoading(true);
    try {
      const token = getToken();
      const imageEntries = options?.images ? Object.entries(options.images) : [];
      const hasImages = imageEntries.length > 0;

      let requestInit: RequestInit;
      if (hasImages) {
        // multipart/form-data — attach pickup/drop photos as images[{slip_id}].
        const form = new FormData();
        slipIds.forEach((id) => form.append('slip_ids[]', String(id)));
        form.append('signature', signature);
        if (options?.notes) form.append('notes', options.notes);
        for (const [slipId, file] of imageEntries) {
          form.append(`images[${slipId}]`, file);
        }
        requestInit = {
          method: 'POST',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: form,
        };
      } else {
        requestInit = {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ slip_ids: slipIds, signature, ...(options?.notes ? { notes: options.notes } : {}) }),
        };
      }

      const res = await fetch(
        `${API_BASE_URL}/slip/submit-scanned-slips`,
        requestInit
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
            const customerId = resolveListingCustomerId();
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
  }, [API_BASE_URL])

  /**
   * POST /slip/action/{slipId}/ready-to-send. When a signature is captured
   * (lab's require_signature_ready_to_send setting), it is sent as
   * { signature }; without it, no body is sent.
   */
  const readyToSend = useCallback(async (slipId: number, signature?: string): Promise<ReadyToSendResponse | null> => {
    setLoading(true);
    try {
      const token = getToken();
      const trimmedSignature = signature?.trim();
      const hasBody = Boolean(trimmedSignature);
      const res = await fetch(buildApiUrl(`/slip/action/${slipId}/ready-to-send`), {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(hasBody ? { "Content-Type": "application/json" } : {}),
        },
        ...(hasBody ? { body: JSON.stringify({ signature: trimmedSignature }) } : {}),
      });

      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }

      const response: ReadyToSendResponse = await res.json().catch(() => ({
        success: false,
        message: "Invalid response",
      }));

      if (!res.ok && !response.success) {
        return {
          success: false,
          message: response.message || `Request failed (${res.status})`,
        };
      }

      if (response?.success) {
        try {
          if (typeof window !== "undefined") {
            const customerId = resolveListingCustomerId();
            const customerType = localStorage.getItem("customerType");
            if (customerId) {
              if (customerType === "lab") {
                void fetchLabSlips(customerId);
              } else if (customerType === "office") {
                void fetchOfficeSlips(customerId);
              } else {
                void fetchLabSlips(customerId);
                void fetchOfficeSlips(customerId);
              }
            }
          }
        } catch (err) {
          console.error("Error refetching slips after readyToSend:", err);
        }
      }

      return response;
    } catch (error) {
      console.error("Error marking slip ready to send:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, fetchLabSlips, fetchOfficeSlips]);

  return (
    <SlipContext.Provider value={{
      slips,
      callLogs,
      slipNotes,
      loading,
      labListingPagination,
      rushCasePanColor,
      fetchLabSlips,
      fetchOfficeSlips,
      fetchCallLogs,
      fetchSlipNotes,
      fetchDriverPrintData,
      scanQrCode,
      clearDriverSession,
      submitScannedSlips,
      createCustomDeliveryDate,
      fetchCustomDeliveryDates,
      fetchPickupDeliverySlips,
      readyToSend,
      updateSlipAttachmentState,
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
