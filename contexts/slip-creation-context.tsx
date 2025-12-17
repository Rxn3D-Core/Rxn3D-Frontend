"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

// --- Types based on sample payload ---
export interface SlipCreationCase {
  lab_id: number
  office_id: number
  doctor: number
  patient_name: string
  case_status: string
}

export interface SlipCreationImpression {
  impression_id: number
  quantity: number
  notes?: string
}

export interface SlipCreationAddon {
  addon_id: number
  quantity: number
  notes?: string
}

export interface SlipCreationExtraction {
  extraction_id: number
  teeth_numbers: number[]
  notes?: string
}

export interface SlipCreationProductRush {
  is_rush: boolean
  requested_rush_date?: string
  notes?: string
}

export interface SlipCreationProduct {
  type: string
  category_id: number
  product_id: number
  subcategory_id: number
  stage_id: number
  grade_id: number
  teeth_selection: string
  teeth_shade_brand_id: number
  teeth_shade_id: number
  gum_shade_brand_id: number
  gum_shade_id: number
  status: string
  notes?: string
  rush?: SlipCreationProductRush
  impressions?: SlipCreationImpression[]
  addons?: SlipCreationAddon[]
  extractions?: SlipCreationExtraction[]
}

export interface SlipCreationNote {
  note: string
}

export interface SlipCreationSlip {
  status: string
  location_id?: number
  products: SlipCreationProduct[]
  notes?: SlipCreationNote[]
}

export interface SlipCreationPayload {
  case: SlipCreationCase
  slips: SlipCreationSlip[]
}

// --- API Data Types ---
export interface ConnectedLab {
  id: number
  connected_since: string
  status: string
  lab: {
    id: number
    name: string
    email: string
    logo_url: string
    city: string
    state: string
    country: string
    address: string
    website: string
    postal_code: string
  }
}

export interface ConnectedOffice {
  id: number
  connected_since: string
  status: string
  office: {
    id: number
    name: string
    email: string
    logo_url: string
    city: string
    state: string
    country: string
    address: string
    website: string
    postal_code: string
  }
}

export interface OfficeDoctor {
  id: number
  uuid: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  work_number: string
  license_number: string
  signature_url: string
  status: string
  role: string
  is_primary: boolean
  office: {
    id: number
    name: string
    email: string
  }
}

// Add AdvanceFilterOptions type
export interface AdvanceFilterOptions {
  category: string[];
  subCategory: string[];
  grades: string[];
  stages: string[];
}

// --- Context definition ---
interface SlipCreationContextType {
  payload: SlipCreationPayload | null
  setPayload: (payload: SlipCreationPayload) => void
  resetPayload: () => void

  // API Data & Fetchers
  connectedLabs: ConnectedLab[] | null
  fetchConnectedLabs: (params?: { search?: string; sort_by?: string; sort_order?: string }) => Promise<void>

  connectedOffices: ConnectedOffice[] | null
  fetchConnectedOffices: (params?: { search?: string; sort_by?: string; sort_order?: string }) => Promise<void>

  officeDoctors: OfficeDoctor[] | null
  officeDoctorsLoading: boolean
  fetchOfficeDoctors: (officeId: number) => Promise<void>

  labProducts: any[] | null
  fetchLabProducts: (labId: number, params?: Record<string, any>) => Promise<void>
  fetchProductDetails: (productId: number, customerId?: number) => Promise<any>

  productImpressions: any[] | null
  fetchProductImpressions: (productId: number, params?: Record<string, any>) => Promise<void>

  productAddons: any[] | null
  fetchProductAddons: (productId: number, params?: Record<string, any>, signal?: AbortSignal) => Promise<void>

  searchedProductAddons: any[] | null
  searchProductAddons: (productId: number, search: string, signal?: AbortSignal) => Promise<void>

  productTeethShades: any[] | null
  fetchProductTeethShades: (productId: number, params?: Record<string, any>) => Promise<void>

  productGumShades: any[] | null
  fetchProductGumShades: (productId: number, params?: Record<string, any>) => Promise<void>

  productMaterials: any[] | null
  fetchProductMaterials: (labId: number, productId: number, params?: Record<string, any>) => Promise<void>

  productRetentions: any[] | null
  fetchProductRetentions: (labId: number, productId: number, params?: Record<string, any>) => Promise<void>

  deliveryDate: any | null
  calculateDeliveryDate: (product_id: number, stage_id?: number) => Promise<void>

  rushFee: any | null
  calculateRushFee: (labId: number, product_id: number, stage_id?: number, target_delivery_date?: string) => Promise<void>

  caseDetails: any | null
  fetchCaseDetails: (caseId: number) => Promise<void>

  slipDetails: any | null
  fetchSlipDetails: (slipId: number, lang?: string) => Promise<void>

  virtualSlipDetails: any | null
  fetchVirtualSlipDetails: (slipId: number) => Promise<void>

  // NEW: attachments for a slip
  slipAttachments: any[] | null
  fetchSlipAttachments: (slipId: number) => Promise<any[]>

  uploadSlipAttachment: (
    slipId: number,
    file: File,
    notes?: string
  ) => Promise<any>

  holdSlip: (slipId: number, reason: string) => Promise<any>
  resumeSlip: (slipId: number, reason: string) => Promise<any>
  cancelSlip: (slipId: number, reason: string) => Promise<any>

  // Generate paper slips
  generatePaperSlips: (caseIds: number[]) => Promise<any>

  // Request a rush for a slip using TanStack React Query
  requestSlipRush: (slipId: number, payload: { requested_delivery_date: string }) => Promise<any>
}

const SlipCreationContext = createContext<SlipCreationContextType | undefined>(undefined)

export function SlipCreationProvider({ children }: { children: ReactNode }) {
  const [payload, setPayloadState] = useState<SlipCreationPayload | null>(null)

  // --- API states ---
  const [connectedLabs, setConnectedLabs] = useState<ConnectedLab[] | null>(null)
  const [connectedOffices, setConnectedOffices] = useState<ConnectedOffice[] | null>(null)
  const [officeDoctors, setOfficeDoctors] = useState<OfficeDoctor[] | null>(null)
  const [officeDoctorsLoading, setOfficeDoctorsLoading] = useState<boolean>(false)
  const [labProducts, setLabProducts] = useState<any[] | null>(null)
  const [productImpressions, setProductImpressions] = useState<any[] | null>(null)
  const [productAddons, setProductAddons] = useState<any[] | null>(null)
  const [searchedProductAddons, setSearchedProductAddons] = useState<any[] | null>(null)
  const [productTeethShades, setProductTeethShades] = useState<any[] | null>(null)
  const [productGumShades, setProductGumShades] = useState<any[] | null>(null)
  const [productMaterials, setProductMaterials] = useState<any[] | null>(null)
  const [productRetentions, setProductRetentions] = useState<any[] | null>(null)
  const [deliveryDate, setDeliveryDate] = useState<any | null>(null)
  const [rushFee, setRushFee] = useState<any | null>(null)
  const [caseDetails, setCaseDetails] = useState<any | null>(null)
  const [slipDetails, setSlipDetails] = useState<any | null>(null)
  const [virtualSlipDetails, setVirtualSlipDetails] = useState<any | null>(null)
  const [slipAttachments, setSlipAttachments] = useState<any[] | null>(null)

  // Get token from localStorage (if available)
  let token = ""
  if (typeof window !== "undefined") {
    token = localStorage.getItem("token") || ""
  }

  // TanStack Query client and mutation for rush request
  const queryClient = useQueryClient()

  type RushVariables = { slipId: number; payload: { requested_delivery_date: string } }

  const rushMutation = useMutation<any, Error, RushVariables>({
    mutationFn: async ({ slipId, payload }: RushVariables) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/slip/${slipId}/rush`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (res.status === 401) {
        window.location.href = "/login"
        return Promise.reject(new Error("Unauthorized"))
      }

      const json = await res.json()
      if (!json.success) throw new Error(json.message || "Rush request failed")
      return json.data
    },
    onSuccess: (data: any, variables: RushVariables) => {
      if (variables?.slipId) {
        queryClient.invalidateQueries({ queryKey: ["slipDetails", variables.slipId] })
        queryClient.invalidateQueries({ queryKey: ["slipAttachments", variables.slipId] })
      }
    },
    onError: (err: Error) => {
      console.error("Rush request failed", err)
    },
  })

  const requestSlipRush = useCallback(async (slipId: number, payload: { requested_delivery_date: string }) => {
    return rushMutation.mutateAsync({ slipId, payload })
  }, [rushMutation])

  // --- API fetchers ---
  const fetchConnectedLabs = useCallback(async (params?: { search?: string; sort_by?: string; sort_order?: string }) => {
    try {
      // Get role from localStorage "role"
      let role = "";
      if (typeof window !== "undefined") {
        role = localStorage.getItem("role") || "";
      }
      const endpoint =
        role === "lab_admin"
          ? "/v1/slip/connected-offices"
          : "/v1/slip/connected-labs";
      const url = new URL(endpoint, process.env.NEXT_PUBLIC_API_BASE_URL);
      if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v))
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      if (role === "lab_admin") {
        setConnectedOffices(json.data || [])
        setConnectedLabs([]) // Clear labs to avoid mixing
      } else {
        setConnectedLabs(json.data || [])
        setConnectedOffices([]) // Clear offices to avoid mixing
      }
    } catch (e) {
      setConnectedLabs(null)
      setConnectedOffices(null)
    }
  }, [token])

  const fetchConnectedOffices = useCallback(async (params?: { search?: string; sort_by?: string; sort_order?: string }) => {
    try {
      const url = new URL("/v1/slip/connected-offices", process.env.NEXT_PUBLIC_API_BASE_URL)
      if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v))
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      setConnectedOffices(json.data || [])
    } catch (e) {
      setConnectedOffices(null)
    }
  }, [token])

  const fetchOfficeDoctors = useCallback(async (officeId: number) => {
    setOfficeDoctorsLoading(true)
    try {
      const url = new URL(`/v1/slip/office/${officeId}/doctors`, process.env.NEXT_PUBLIC_API_BASE_URL)
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      setOfficeDoctors(json.data || [])
    } catch (e) {
      setOfficeDoctors(null)
    } finally {
      setOfficeDoctorsLoading(false)
    }
  }, [token])

  const fetchLabProducts = useCallback(async (labId: number, params?: Record<string, any>) => {
    try {
      // If the role is office_admin or doctor, use selectedLabId from localStorage for labId
      let effectiveLabId = labId;
      let customerId = null;
      
      if (typeof window !== "undefined") {
        const role = localStorage.getItem("role");
        const isLabAdmin = role === "lab_admin";
        const isSuperAdmin = role === "superadmin";
        const isOfficeAdmin = role === "office_admin";
        const isDoctor = role === "doctor";
        
        if (isOfficeAdmin || isDoctor) {
          const storedLabId = localStorage.getItem("selectedLabId");
          if (storedLabId) {
            effectiveLabId = Number(storedLabId);
            customerId = effectiveLabId; // Use the selectedLabId as customer_id
          }
        } else if (isLabAdmin || isSuperAdmin) {
          // For lab_admin or superadmin, use customerId from localStorage
          const storedCustomerId = localStorage.getItem("customerId");
          if (storedCustomerId) {
            customerId = parseInt(storedCustomerId, 10);
          }
        }
      }
      
      // Use the new library/products endpoint
      const url = new URL(`/v1/library/products`, process.env.NEXT_PUBLIC_API_BASE_URL);
      
      // Add customer_id if available
      if (customerId) {
        url.searchParams.append('customer_id', customerId.toString());
      }
      
      // Add other params, mapping sort_by to order_by and sort_order to sort_by
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== null && v !== undefined && v !== '') {
            // Map sort_by to order_by and sort_order to sort_by for the new API
            if (k === 'sort_by' && typeof v === 'string') {
              url.searchParams.append('order_by', String(v));
            } else if (k === 'sort_order') {
              url.searchParams.append('sort_by', String(v));
            } else {
              // For all other params, keep them as is
              url.searchParams.append(k, String(v));
            }
          }
        });
      }
      
      const res = await fetch(url.toString(), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (res.status === 401) { window.location.href = '/login'; return }
      const json = await res.json()
      // The /library/products endpoint returns { status, message, data: { data: [...], pagination: {...} } }
      const products = json.data?.data || json.data || []
      setLabProducts(products)
      return products
    } catch (e) {
      setLabProducts(null)
      return []
    }
  }, [token])

  // Add function to fetch individual product details from library API
  const fetchProductDetails = useCallback(async (productId: number, labId?: number) => {
    try {
      // Get user role information
      const userRole = typeof window !== "undefined" ? localStorage.getItem("role") : null;
      let userRoles: string[] = [];
      
      if (userRole) {
        try {
          userRoles = JSON.parse(userRole);
        } catch {
          userRoles = [userRole];
        }
      }

      // Determine which customer_id to use based on user role
      let effectiveCustomerId: number | null = null;
      
      if (userRoles.includes("lab_admin") || userRoles.includes("superadmin")) {
        // For lab_admin or superadmin roles, use customer_id from localStorage
        if (typeof window !== "undefined") {
          const storedCustomerId = localStorage.getItem("customerId");
          if (storedCustomerId) {
            effectiveCustomerId = Number(storedCustomerId);
          }
        }
      } else {
        const selectedLabId = localStorage.getItem("selectedLabId");
        // For other roles, use labId parameter (which is the selectedLabId)
        if (selectedLabId) {
          effectiveCustomerId = Number(selectedLabId);
        }
      }

      // Build URL with required parameters
      const url = new URL(`/v1/library/products/${productId}`, process.env.NEXT_PUBLIC_API_BASE_URL);
      url.searchParams.append('lang', 'en');
      if (effectiveCustomerId) {
        url.searchParams.append('customer_id', effectiveCustomerId.toString());
      }

      const res = await fetch(url.toString(), { 
        headers: token ? { Authorization: `Bearer ${token}` } : {} 
      });
      
      if (res.status === 401) { 
        window.location.href = '/login'; 
        return null;
      }
      
      const json = await res.json();
      return json.data || json; // Return the product data
    } catch (e) {
      console.error('Error fetching product details:', e);
      return null;
    }
  }, [token])

  const fetchProductImpressions = useCallback(async (productId: number, params?: Record<string, any>) => {
    try {
      // Get the correct lab ID based on user role
      const role = localStorage.getItem("role")
      const labId = role === "office_admin" 
        ? localStorage.getItem("selectedLabId") 
        : localStorage.getItem('customerId')
      
      // Validate labId before making the request
      if (!labId || labId === 'null' || labId === 'undefined') {
        console.warn('fetchProductImpressions - labId is missing or invalid:', labId)
        setProductImpressions(null)
        return []
      }
      
      const url = new URL(`/v1/slip/lab/${labId}/products/${productId}/impressions`, process.env.NEXT_PUBLIC_API_BASE_URL)
      if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v))
      const res = await fetch(url.toString(), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (res.status === 401) { window.location.href = '/login'; return [] }
      const json = await res.json()
      setProductImpressions(json.data || [])
      return json.data || []
    } catch (e) {
      setProductImpressions(null)
      return []
    }
  }, [token])

  const fetchProductAddons = useCallback(async (productId: number, params?: Record<string, any>, signal?: AbortSignal) => {
    try {
      // Get the correct lab ID based on user role
      const role = localStorage.getItem("role")
      const labId = role === "office_admin" || role === "doctor"
        ? localStorage.getItem("selectedLabId") 
        : localStorage.getItem("customerId")
      const url = new URL(`/v1/slip/lab/${labId}/products/${productId}/addons`, process.env.NEXT_PUBLIC_API_BASE_URL)
      if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v))
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal,
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      setProductAddons(json.data || [])
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // Request was cancelled, don't update state
        return
      }
      setProductAddons(null)
    }
  }, [token])

  // Add: Search for specific addons by search term
  const searchProductAddons = useCallback(async (productId: number, search: string, signal?: AbortSignal) => {
    try {
      // Get the correct lab ID based on user role
      const role = localStorage.getItem("role")
      const labId = role === "office_admin" 
        ? localStorage.getItem("selectedLabId") 
        : localStorage.getItem("customerId")
      const url = new URL(`/v1/slip/lab/${labId}/products/${productId}/addons`, process.env.NEXT_PUBLIC_API_BASE_URL)
      if (search) url.searchParams.append("search", search)
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal,
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      setSearchedProductAddons(json.data || [])
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        // Request was cancelled, don't update state
        return
      }
      setSearchedProductAddons(null)
    }
  }, [token])

  const fetchProductTeethShades = useCallback(async (productId: number, params?: Record<string, any>) => {
    try {
      // Get the correct lab ID based on user role
      const role = localStorage.getItem("role")
      const labId = role === "office_admin" 
        ? localStorage.getItem("selectedLabId") 
        : localStorage.getItem('customerId')
      
      // Validate labId before making the request
      if (!labId || labId === 'null' || labId === 'undefined') {
        console.warn('fetchProductTeethShades - labId is missing or invalid:', labId)
        setProductTeethShades(null)
        return []
      }
      
      const url = new URL(`/v1/slip/lab/${labId}/products/${productId}/teeth-shades`, process.env.NEXT_PUBLIC_API_BASE_URL)
      if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v))
      const res = await fetch(url.toString(), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (res.status === 401) { window.location.href = '/login'; return [] }
      const json = await res.json()
      setProductTeethShades(json.data || [])
      return json.data || []
    } catch (e) {
      setProductTeethShades(null)
      return []
    }
  }, [token])

  const fetchProductGumShades = useCallback(async (productId: number, params?: Record<string, any>) => {
    try {
      // Get the correct lab ID based on user role
      const role = localStorage.getItem("role")
      const labId = role === "office_admin" 
        ? localStorage.getItem("selectedLabId") 
        : localStorage.getItem('customerId')
      
      // Validate labId before making the request
      if (!labId || labId === 'null' || labId === 'undefined') {
        console.warn('fetchProductGumShades - labId is missing or invalid:', labId)
        setProductGumShades(null)
        return []
      }
      
      const url = new URL(`/v1/slip/lab/${labId}/products/${productId}/gum-shades`, process.env.NEXT_PUBLIC_API_BASE_URL)
      if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v))
      const res = await fetch(url.toString(), { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      if (res.status === 401) { window.location.href = '/login'; return [] }
      const json = await res.json()
      setProductGumShades(json.data || [])
      return json.data || []
    } catch (e) {
      setProductGumShades(null)
      return []
    }
  }, [token])

  const fetchProductMaterials = useCallback(async (labId: number, productId: number, params?: Record<string, any>) => {
    try {
      const url = new URL(`/v1/slip/lab/${labId}/products/${productId}/materials`, process.env.NEXT_PUBLIC_API_BASE_URL)
      if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v))
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      setProductMaterials(json.data || [])
    } catch (e) {
      setProductMaterials(null)
    }
  }, [token])

  const fetchProductRetentions = useCallback(async (labId: number, productId: number, params?: Record<string, any>) => {
    try {
      const url = new URL(`/v1/slip/lab/${labId}/products/${productId}/retentions`, process.env.NEXT_PUBLIC_API_BASE_URL)
      if (params) Object.entries(params).forEach(([k, v]) => v && url.searchParams.append(k, v))
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      setProductRetentions(json.data || [])
    } catch (e) {
      setProductRetentions(null)
    }
  }, [token])

  const calculateDeliveryDate = useCallback(async (product_id: number, stage_id?: number) => {
    try {
      // Get the correct lab ID based on user role
      const role = localStorage.getItem("role")
      const labId = role === "office_admin" || role === "doctor"
        ? localStorage.getItem("selectedLabId") 
        : localStorage.getItem("customerId")
      const url = new URL(`/v1/slip/lab/${labId}/delivery-date`, process.env.NEXT_PUBLIC_API_BASE_URL)
      url.searchParams.append("product_id", String(product_id))
      if (stage_id) url.searchParams.append("stage_id", String(stage_id))
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return null;
      }
      const json = await res.json()
      setDeliveryDate(json.data || null)
      return json.data || null
    } catch (e) {
      setDeliveryDate(null)
      return null
    }
  }, [token])

  const calculateRushFee = useCallback(async (labId: number, product_id: number, stage_id?: number, target_delivery_date?: string) => {
    try {
      const url = new URL(`/v1/slip/lab/${labId}/rush-fee`, process.env.NEXT_PUBLIC_API_BASE_URL)
      url.searchParams.append("product_id", String(product_id))
      if (stage_id) url.searchParams.append("stage_id", String(stage_id))
      if (target_delivery_date) url.searchParams.append("target_delivery_date", target_delivery_date)
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      setRushFee(json.data || null)
    } catch (e) {
      setRushFee(null)
    }
  }, [token])

  const fetchCaseDetails = useCallback(async (caseId: number) => {
    try {
      const url = new URL(`/v1/slip/case/${caseId}/details`, process.env.NEXT_PUBLIC_API_BASE_URL)
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      setCaseDetails(json.data || null)
    } catch (e) {
      setCaseDetails(null)
    }
  }, [token])

  const fetchSlipDetails = useCallback(async (slipId: number, lang?: string) => {
    try {
      const url = new URL(`/v1/slip/slip/${slipId}/details`, process.env.NEXT_PUBLIC_API_BASE_URL)
      if (lang) url.searchParams.append("lang", lang)
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      setSlipDetails(json.data || null)
    } catch (e) {
      setSlipDetails(null)
    }
  }, [token])

  const fetchVirtualSlipDetails = useCallback(async (slipId: number) => {
    try {
      const url = new URL(`/v1/slip/slip/${slipId}/details`, process.env.NEXT_PUBLIC_API_BASE_URL)
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      setVirtualSlipDetails(json.data || null)
    } catch (e) {
      setVirtualSlipDetails(null)
    }
  }, [token])

  // Fetch attachments for a slip
  const fetchSlipAttachments = useCallback(async (slipId: number) => {
    try {
      const url = new URL(`/v1/slip/attachments/${slipId}`, process.env.NEXT_PUBLIC_API_BASE_URL)
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login";
        return []
      }
      const json = await res.json()
      setSlipAttachments(json.data || [])
      return json.data || []
    } catch (e) {
      setSlipAttachments(null)
      return []
    }
  }, [token])

  // --- Upload slip attachment API ---
  const uploadSlipAttachment = useCallback(
    async (
      slipId: number,
      file: File,
      notes?: string
    ) => {
      if (!slipId || !file) throw new Error("Slip ID and file are required")
      const formData = new FormData()
      formData.append("file", file)
      if (notes) formData.append("notes", notes)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/slip/attachments/${slipId}/upload`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      )
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const json = await res.json()
      if (!json.success) throw new Error(json.message || "Attachment upload failed")
      return json.data
    },
    [token]
  )

  // --- Hold, Resume, Cancel APIs ---
  const holdSlip = useCallback(async (slipId: number, reason: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/slip/action/${slipId}/hold`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reason }),
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Failed to put slip on hold");
    return json;
  }, [token]);

  const resumeSlip = useCallback(async (slipId: number, reason: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/slip/action/${slipId}/resume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reason }),
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Failed to resume slip");
    return json;
  }, [token]);

  const cancelSlip = useCallback(async (slipId: number, reason: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/slip/action/${slipId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ reason }),
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Failed to cancel slip");
    return json;
  }, [token]);


  // --- Generate Paper Slips API ---
  const generatePaperSlips = useCallback(async (caseIds: number[]) => {
    if (!Array.isArray(caseIds) || caseIds.length === 0) throw new Error("caseIds must be a non-empty array");
    const customerType = typeof window !== "undefined" ? localStorage.getItem("customerType") : null
    const bodyPayload = customerType === "office" ? { case_ids: caseIds } : { slip_ids: caseIds }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/slip/generate-paper-slips`, {
      method: "POST",
      headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(bodyPayload),
    });
    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      // If the response is HTML, open print preview directly
      const html = await res.text();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
      return null;
    } else {
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to generate paper slips");
      return json.data;
    }
  }, [token]);

  const setPayload = useCallback((newPayload: SlipCreationPayload) => setPayloadState(newPayload), [])
  const resetPayload = useCallback(() => setPayloadState(null), [])

  return (
    <SlipCreationContext.Provider
      value={{
        payload,
        setPayload,
        resetPayload,
        connectedLabs,
        fetchConnectedLabs,
        connectedOffices,
        fetchConnectedOffices,
        officeDoctors,
        officeDoctorsLoading,
        fetchOfficeDoctors,
        labProducts,
        fetchLabProducts,
        fetchProductDetails,
        productImpressions,
        fetchProductImpressions,
        productAddons,
        fetchProductAddons,
        searchedProductAddons,
        searchProductAddons,
        productTeethShades,
        fetchProductTeethShades,
        productGumShades,
        fetchProductGumShades,
        productMaterials,
        fetchProductMaterials,
        productRetentions,
        fetchProductRetentions,
        deliveryDate,
        calculateDeliveryDate,
        rushFee,
        calculateRushFee,
        caseDetails,
        fetchCaseDetails,
        slipDetails,
        fetchSlipDetails,
        virtualSlipDetails,
        fetchVirtualSlipDetails,
        slipAttachments,
        fetchSlipAttachments,
        uploadSlipAttachment,
        holdSlip,
        resumeSlip,
        cancelSlip,
        generatePaperSlips,
        requestSlipRush,
      }}
    >
      {children}
    </SlipCreationContext.Provider>
  )
}

export function useSlipCreation() {
  const ctx = useContext(SlipCreationContext)
  if (!ctx) throw new Error("useSlipCreation must be used within SlipCreationProvider")
  return ctx
}
