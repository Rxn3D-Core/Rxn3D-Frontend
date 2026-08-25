"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SLIP_LISTING_DEFAULT_PER_PAGE } from "@/app/lab-case-management/lab-slip-listing-constants";
import { formatSlipListingProducts } from "@/app/lab-case-management/slip-listing-product-label.mjs";
import { formatSlipListingTimestamp } from "@/lib/slip-listing-timestamp";

// Types based on the API response structure
export interface OfficeSlipProduct {
  id: number;
  product_code: string;
  product_name: string;
  type: string;
  stage_code: string;
  stage_name: string;
  is_rush: boolean;
  rush_details: any;
}

export interface OfficeSlipDelivery {
  delivery_date: string;
  delivery_time: string;
  pickup_date: string;
  pickup_time: string;
}

export interface OfficeSlipAttachments {
  has_attachments: boolean;
  has_stl_file: boolean;
  count: number;
}

export interface OfficeSlipLocation {
  id: number;
  name: string;
  description: string;
}

export interface OfficeSlipCasepan {
  id: number;
  number: string;
  name: string;
  color_code: string;
}

export interface OfficeSlip {
  id: number;
  slip_number: string;
  status: string;
  /** Pre-formatted listing timestamp when provided by API (matches lab listing). */
  timestamp?: string;
  created_at: string;
  updated_at: string;
  location: OfficeSlipLocation;
  casepan: OfficeSlipCasepan;
  delivery: OfficeSlipDelivery;
  is_rush: boolean;
  attachments: OfficeSlipAttachments;
  products: OfficeSlipProduct[];
  products_count: number;
  rush_products_count: number;
  new_stage_eligible?: string | boolean;
}

export interface OfficeCaseLab {
  id: number;
  name: string;
  email: string;
  logo_url: string | null;
}

export interface OfficeCaseDoctor {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface OfficeCaseCreatedBy {
  id: number;
  name: string;
  email: string;
}

export interface OfficeCaseStatistics {
  total_slips: number;
  active_slips: number;
  rush_slips: number;
  slips_with_attachments: number;
}

export interface OfficeCase {
  id: number;
  case_number: string;
  patient_name: string;
  case_status: string;
  created_at: string;
  updated_at: string;
  lab: OfficeCaseLab;
  doctor: OfficeCaseDoctor;
  created_by: OfficeCaseCreatedBy;
  slips: OfficeSlip[];
  statistics: OfficeCaseStatistics;
}

export interface OfficeSlipApiResponse {
  success: boolean;
  message: string;
  data: {
    data: OfficeCase[];
    pagination: {
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
    };
  };
}

// UI Slip type for the table display
export interface UISlip {
  id: number;
  createdAt: string;
  caseId?: number;
  caseNumber?: string;
  billingId?: number;
  pan: string;
  panColor: string;
  panColorStyle?: React.CSSProperties;
  officeCode: string;
  patient: string;
  product: string;
  status: string;
  rush: boolean;
  location: string;
  locationId?: number;
  newStageEligible?: boolean;
  attachment: boolean;
  dueDate: string;
  overdue: boolean;
  labName?: string;
  doctorName?: string;
  slipNumber?: string;
}

type OfficeSlipContextType = {
  slips: UISlip[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  } | null;
  fetchOfficeSlips: (
    customerId: number,
    page?: number,
    perPage?: number,
    options?: { statuses?: string[] }
  ) => Promise<void>;
  refreshSlips: () => Promise<void>;
};

const OfficeSlipContext = createContext<OfficeSlipContextType | undefined>(undefined);

export function OfficeSlipProvider({ children }: { children: ReactNode }) {
  const [slips, setSlips] = useState<UISlip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  } | null>(null);
  const [currentCustomerId, setCurrentCustomerId] = useState<number | null>(null);
  const router = useRouter();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  // Helper to get token from localStorage
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

  // Helper to handle 401 responses
  const handleUnauthorized = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/login");
    }
  };

  // Helper to map API slip to UI slip
  const mapApiSlipToUI = (apiCase: OfficeCase): UISlip[] => {
    return apiCase.slips.map((slip) => ({
      id: slip.id,
      createdAt: formatSlipListingTimestamp(slip.timestamp ?? slip.created_at),
      caseId: apiCase.id,
      caseNumber: apiCase.case_number,
      billingId:
        (slip as any).billing_id ??
        (slip as any).billingId ??
        (slip as any).invoice_id ??
        (slip as any).invoiceId ??
        (slip as any).billing?.id ??
        (slip as any).invoice?.id ??
        (slip as any).billing_invoice?.id ??
        (slip as any).slip_billing?.id ??
        (apiCase as any).billing_id ??
        (apiCase as any).billingId ??
        (apiCase as any).invoice_id ??
        (apiCase as any).invoiceId ??
        (apiCase as any).billing?.id ??
        (apiCase as any).invoice?.id ??
        undefined,
      pan: slip.casepan?.number || "----",
      panColor: "", // leave empty, use panColorStyle for inline style
      panColorStyle: slip.casepan?.color_code
        ? { backgroundColor: slip.casepan.color_code }
        : undefined,
      officeCode: apiCase.lab?.name || "",
      patient: apiCase.patient_name || "",
      product: formatSlipListingProducts(slip.products),
      status: slip.status || "",
      rush: slip.is_rush || false,
      location: slip.location?.name || "",
      locationId: typeof slip.location?.id === "number" ? slip.location.id : undefined,
      newStageEligible:
        typeof slip.new_stage_eligible === "string"
          ? slip.new_stage_eligible.trim().toLowerCase() === "yes"
          : Boolean(slip.new_stage_eligible),
      attachment: slip.attachments?.has_attachments || false,
      dueDate: slip.delivery?.delivery_date ? new Date(slip.delivery.delivery_date).toLocaleDateString() : "",
      overdue: false, // You can implement overdue logic based on delivery date
      labName: apiCase.lab?.name,
      doctorName: apiCase.doctor?.name,
      slipNumber: slip.slip_number,
    }));
  };

  const fetchOfficeSlips = useCallback(async (
    customerId: number,
    page: number = 1,
    perPage: number = SLIP_LISTING_DEFAULT_PER_PAGE,
    options?: { statuses?: string[] }
  ) => {
    setLoading(true);
    setError(null);
    setCurrentCustomerId(customerId);
    
    try {
      const token = getToken();
      const url = new URL(`${API_BASE_URL}/slip/listing/office`);
      url.searchParams.append("customer_id", customerId.toString());
      url.searchParams.append("page", page.toString());
      url.searchParams.append("per_page", perPage.toString());
      options?.statuses?.filter(Boolean).forEach((status) => {
        url.searchParams.append("statuses[]", status);
      });

      const res = await fetch(url.toString(), {
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
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const apiResponse: OfficeSlipApiResponse = await res.json();
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.message || "Failed to fetch office slips");
      }

      // Map API data to UI format
      const uiSlips: UISlip[] = [];
      apiResponse.data.data.forEach((apiCase) => {
        uiSlips.push(...mapApiSlipToUI(apiCase));
      });

      setSlips(uiSlips);
      setPagination(apiResponse.data.pagination);
    } catch (err) {
      console.error("Error fetching office slips:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch office slips");
      setSlips([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, router]);

  const refreshSlips = useCallback(async () => {
    if (currentCustomerId) {
      await fetchOfficeSlips(currentCustomerId);
    }
  }, [currentCustomerId, fetchOfficeSlips]);

  return (
    <OfficeSlipContext.Provider
      value={{
        slips,
        loading,
        error,
        pagination,
        fetchOfficeSlips,
        refreshSlips,
      }}
    >
      {children}
    </OfficeSlipContext.Provider>
  );
}

export function useOfficeSlipContext() {
  const ctx = useContext(OfficeSlipContext);
  if (!ctx) throw new Error("useOfficeSlipContext must be used within OfficeSlipProvider");
  return ctx;
}


