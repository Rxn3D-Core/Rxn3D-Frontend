// Slip Creation Service
// Handles API calls for creating slips/cases

import { SlipCreationApiError } from "@/lib/slip-creation-guardrails";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// Helper to ensure URL is absolute
const ensureAbsoluteUrl = (url: string): string => {
  // If API_BASE_URL is empty, throw an error
  if (!API_BASE_URL) {
    console.error('API_BASE_URL is not configured. Please set NEXT_PUBLIC_API_BASE_URL environment variable.')
    throw new Error('API_BASE_URL is not configured')
  }
  
  // If URL already starts with http:// or https://, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Ensure API_BASE_URL doesn't end with / and url doesn't start with /
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL
  const path = url.startsWith('/') ? url : `/${url}`
  
  return `${baseUrl}${path}`
}

// Helper to get token from localStorage
const getToken = (): string | null => {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
};

// Helper to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Helper to get auth headers for multipart
const getMultipartAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Don't set Content-Type for multipart - browser will set it with boundary
  };
};

// API Request/Response Types
export interface SlipCreationCase {
  lab_id: number;
  office_id: number;
  doctor: number;
  patient_name: string;
  gender?: string;
  age?: number;
  case_status?: string;
}

export interface SlipCreationRush {
  is_rush: boolean;
  requested_rush_date?: string;
  notes?: string;
}

export interface SlipCreationImpression {
  impression_id: number;
  quantity: number;
  notes?: string;
}

export interface SlipCreationExtraction {
  extraction_id: number;
  teeth_numbers: number[];
  notes?: string;
}

export interface SlipCreationAddon {
  addon_id: number;
  quantity: number;
  notes?: string;
}

export interface SlipCreationRetention {
  retention_id: number;
  teeth_number?: number;
}

export interface SlipCreationRetentionOption {
  retention_option_id: number;
  teeth_number: number;
}

export interface SlipCreationToothChart {
  tooth_number: number;
  chart_type?: string;
  retention_id?: number;
  retention_option_id?: number;
  extraction_id?: number;
  opposite_extraction_id?: number;
}

export interface SlipCreationTeethSelection {
  teeth_number: number;
  retention_option_id?: number;
  extraction_ids?: number[];
}

export interface SlipCreationImplantDetail {
  teeth_number: number;
  implant_id: number;
  implant_platform_id?: number;
  implant_platform_size_id?: number;
}

export interface SlipCreationAbutmentDetail {
  teeth_number: number;
  abutment_id?: number;
  abutment_type_id: number;
  abutment_option_id?: number;
}

export interface SlipCreationAdvanceField {
  teeth_number?: number | null;
  advance_field_id: number;
  advance_field_value?: string | null;
  /** Present only while building payload; stripped before JSON and sent as nested multipart file keys. */
  file?: File;
}

export interface SlipCreationShadeDetail {
  advance_field_id: number;
  teeth_shade_brand_id: number;
  teeth_shade_id: number;
}

export interface SlipCreationNote {
  note: string;
  /** Omitting this makes the backend default to "internal", which offices cannot see. */
  type?: "internal" | "stage" | "lab_connect";
}

export interface SlipCreationProduct {
  type: "Upper" | "Lower";
  category_id: number;
  product_id: number;
  subcategory_id: number;
  variation_id?: number;
  stage_id?: number;
  grade_id?: number;
  teeth_selection?: SlipCreationTeethSelection[];
  teeth_shade_brand_id?: number;
  teeth_shade_id?: number;
  gum_shade_brand_id?: number;
  gum_shade_id?: number;
  material_id?: number;
  status?: string;
  notes?: string;
  rush?: SlipCreationRush;
  impressions?: SlipCreationImpression[];
  opposite_impressions?: SlipCreationImpression[];
  extractions?: SlipCreationExtraction[];
  opposite_extractions?: SlipCreationExtraction[];
  addons?: SlipCreationAddon[];
  retentions?: SlipCreationRetention[];
  retention_options?: SlipCreationRetentionOption[];
  tooth_chart?: SlipCreationToothChart[];
  shade_details?: SlipCreationShadeDetail[];
  advance_fields?: SlipCreationAdvanceField[];
  implant_details?: SlipCreationImplantDetail[];
  abutment_details?: SlipCreationAbutmentDetail[];
  is_splinted?: "Yes" | "No";
  /** Comma-separated tooth numbers per connected splint group, e.g. `["4,5,6", "10,11"]`. */
  splinted_teeth?: string[];
  /** Comma-separated wing-retainer tooth numbers (the empty abutment neighbors only, not the pontic), e.g. "13,15". */
  wing_teeth?: string;
}

export interface SlipCreationSlip {
  slip_number?: string;
  status?: string;
  location_id?: number;
  casepan_id?: number;
  casepan_number?: string;
  created_by?: number;
  products: SlipCreationProduct[];
  notes?: SlipCreationNote[];
  pickup_date?: string | null;
  delivery_date?: string | null;
  delivery_time?: string | null;
}

export interface SlipCreationPayload {
  case: SlipCreationCase;
  slips: SlipCreationSlip[];
}

/** Nested multipart file attachment for POST /slip/create */
export interface SlipCreationMultipartFile {
  formKey: string;
  file: File;
}

function appendFormDataValue(formData: FormData, key: string, value: unknown): void {
  if (value === undefined || value === null) return;
  if (value instanceof File) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "object" && item !== null && !(item instanceof File)) {
        Object.entries(item).forEach(([childKey, childValue]) => {
          appendFormDataValue(formData, `${key}[${index}][${childKey}]`, childValue);
        });
      } else {
        appendFormDataValue(formData, `${key}[${index}]`, item);
      }
    });
    return;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) => {
      appendFormDataValue(formData, `${key}[${childKey}]`, childValue);
    });
    return;
  }
  formData.append(key, String(value));
}

export function buildSlipCreateFormData(
  payload: SlipCreationPayload,
  multipartFiles: SlipCreationMultipartFile[] = []
): FormData {
  const formData = new FormData();
  appendFormDataValue(formData, "case", payload.case);
  payload.slips.forEach((slip, slipIndex) => {
    Object.entries(slip).forEach(([key, value]) => {
      if (key === "products" && Array.isArray(value)) return;
      appendFormDataValue(formData, `slips[${slipIndex}][${key}]`, value);
    });
    slip.products.forEach((product, productIndex) => {
      Object.entries(product).forEach(([key, value]) => {
        appendFormDataValue(
          formData,
          `slips[${slipIndex}][products][${productIndex}][${key}]`,
          value
        );
      });
    });
  });
  for (const { formKey, file } of multipartFiles) {
    formData.append(formKey, file);
  }
  return formData;
}

export interface SlipCreationResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    case_number: string;
    patient_name: string;
    gender: string;
    age?: number;
    case_status: string;
    created_at: string;
    updated_at: string;
    slips?: Array<{
      id: number;
      slip_number: string;
      status: string;
      location?: { id: number; name: string; is_active: boolean } | null;
      casepan?: { id: number; number: string; name: string; code: string; color_code: string; type: string } | null;
      delivery?: {
        delivery_date: string | null;
        delivery_time: string | null;
        pickup_date: string | null;
        pickup_time: string | null;
      } | null;
    }>;
  };
  errors?: Record<string, string[]>;
}

interface ApiErrorBody {
  message?: string;
  error?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

class SlipCreationService {
  /**
   * Create a slip/case via API
   * @param payload - The slip creation payload
   * @param files - Optional array of files for advance_fields (if any advance fields have file uploads)
   * @returns Promise with the API response
   */
  async createSlip(
    payload: SlipCreationPayload,
    multipartFiles?: SlipCreationMultipartFile[] | File[]
  ): Promise<SlipCreationResponse> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      const normalizedFiles: SlipCreationMultipartFile[] = (() => {
        if (!multipartFiles?.length) return [];
        const first = multipartFiles[0] as SlipCreationMultipartFile | File;
        if (first && typeof first === "object" && "formKey" in first && "file" in first) {
          return multipartFiles as SlipCreationMultipartFile[];
        }
        return (multipartFiles as File[]).map((file, index) => ({
          formKey: `files[${index}]`,
          file,
        }));
      })();

      const hasFiles = normalizedFiles.length > 0;

      if (hasFiles) {
        return await this.createSlipWithFiles(payload, normalizedFiles);
      } else {
        // Use JSON for regular requests
        return await this.createSlipJSON(payload);
      }
    } catch (error) {
      console.error("Slip creation error:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to create slip");
    }
  }

  /**
   * Create slip with JSON payload (no file uploads)
   */
  private async createSlipJSON(
    payload: SlipCreationPayload
  ): Promise<SlipCreationResponse> {
    const url = ensureAbsoluteUrl("/slip/create");
    const response = await fetch(url, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Unauthorized - Redirecting to login");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as ApiErrorBody;
      const errorMessage =
        errorData.message ||
        errorData.error ||
        `Failed to create slip: ${response.statusText}`;
      throw new SlipCreationApiError(errorMessage, {
        status: response.status,
        code: errorData.code,
        errors: errorData.errors,
      });
    }

    const data: SlipCreationResponse = await response.json();
    return data;
  }

  /**
   * Create slip with multipart/form-data (with file uploads)
   */
  private async createSlipWithFiles(
    payload: SlipCreationPayload,
    multipartFiles: SlipCreationMultipartFile[]
  ): Promise<SlipCreationResponse> {
    const formData = buildSlipCreateFormData(payload, multipartFiles);

    const url = ensureAbsoluteUrl("/slip/create");
    const response = await fetch(url, {
      method: "POST",
      headers: getMultipartAuthHeaders(),
      body: formData,
    });

    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Unauthorized - Redirecting to login");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as ApiErrorBody;
      const errorMessage =
        errorData.message ||
        errorData.error ||
        `Failed to create slip: ${response.statusText}`;
      throw new SlipCreationApiError(errorMessage, {
        status: response.status,
        code: errorData.code,
        errors: errorData.errors,
      });
    }

    const data: SlipCreationResponse = await response.json();
    return data;
  }
}

// Export a singleton instance
export const slipCreationService = new SlipCreationService();



















