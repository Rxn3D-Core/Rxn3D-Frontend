// Slip Creation Service
// Handles API calls for creating slips/cases

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
  case_status?: string;
}

export interface SlipCreationRush {
  is_rush: boolean;
  requested_rush_date: string;
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

export interface SlipCreationAdvanceField {
  teeth_number?: number | null;
  advance_field_id: number;
  advance_field_value?: string | null;
  file?: File;
  file_index?: number; // For multipart form data
}

export interface SlipCreationNote {
  note: string;
}

export interface SlipCreationProduct {
  type: "Upper" | "Lower";
  category_id: number;
  product_id: number;
  subcategory_id: number;
  stage_id?: number;
  grade_id?: number;
  teeth_selection?: string;
  teeth_shade_brand_id?: number;
  teeth_shade_id?: number;
  gum_shade_brand_id?: number;
  gum_shade_id?: number;
  retention_id?: number;
  retention_option_id?: number;
  material_id?: number;
  status?: string;
  notes?: string;
  rush?: SlipCreationRush;
  impressions?: SlipCreationImpression[];
  extractions?: SlipCreationExtraction[];
  addons?: SlipCreationAddon[];
  advance_fields?: SlipCreationAdvanceField[];
}

export interface SlipCreationSlip {
  location_id?: number;
  created_by?: number;
  products: SlipCreationProduct[];
  notes?: SlipCreationNote[];
}

export interface SlipCreationPayload {
  case: SlipCreationCase;
  slips: SlipCreationSlip[];
}

export interface SlipCreationResponse {
  success: boolean;
  message: string;
  data?: {
    case_id: number;
    case_number: string;
    slips?: Array<{
      slip_id: number;
      slip_number: string;
    }>;
  };
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
    files?: File[]
  ): Promise<SlipCreationResponse> {
    try {
      const token = getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      // Check if we have files to upload
      const hasFiles = files && files.length > 0;

      if (hasFiles) {
        // Use multipart/form-data for file uploads
        return await this.createSlipWithFiles(payload, files);
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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message ||
        errorData.error ||
        `Failed to create slip: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data: SlipCreationResponse = await response.json();
    return data;
  }

  /**
   * Create slip with multipart/form-data (with file uploads)
   */
  private async createSlipWithFiles(
    payload: SlipCreationPayload,
    files: File[]
  ): Promise<SlipCreationResponse> {
    const formData = new FormData();

    // Add JSON data as a form field
    formData.append("data", JSON.stringify(payload));

    // Add files with indexed keys
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

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
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData.message ||
        errorData.error ||
        `Failed to create slip: ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data: SlipCreationResponse = await response.json();
    return data;
  }
}

// Export a singleton instance
export const slipCreationService = new SlipCreationService();



















