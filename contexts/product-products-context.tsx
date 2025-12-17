"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback, useMemo } from "react"
import type { Product, ProductCreateForm, ProductPagination } from "@/lib/schemas"
import { ProductCreateFormSchema } from "@/lib/schemas"
import { AlertCircle, CheckCircle, Package, Save, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useLanguage } from "@/contexts/language-context"
import { useAuth } from "@/contexts/auth-context" // <-- adjust as needed

interface ValidationError {
  field: string
  message: string
}

interface ProductsContextType {
  products: Product[]
  pagination: ProductPagination
  isLoading: boolean
  error: string | null
  validationErrors: ValidationError[]
  searchQuery: string
  sortColumn: string | null
  sortDirection: "asc" | "desc" | null
  statusFilter: string | null
  subcategoryFilter: number | null
  selectedItems: number[]
  fetchProducts: (
    page?: number,
    perPage?: number,
    q?: string,
    column?: string | null,
    direction?: "asc" | "desc" | null,
    status?: string | null,
    subcategory_id?: number | null,
    selectedLabId?: number | null,
  ) => Promise<void>
  createProduct: (payload: ProductCreateForm, releasingStageIds?: (string | number)[]) => Promise<boolean>
  updateProduct: (id: number, payload: ProductCreateForm, releasingStageIds?: (string | number)[]) => Promise<boolean>
  deleteProduct: (id: number) => Promise<boolean>
  deleteMultipleProducts: (ids: number[]) => Promise<boolean>
  setSearchQuery: (query: string) => void
  setSortColumn: (column: string | null) => void
  setSortDirection: (direction: "asc" | "desc" | null) => void
  setStatusFilter: (status: string | null) => void
  setSubcategoryFilter: (id: number | null) => void
  setSelectedItems: (items: number[]) => void
  clearValidationErrors: () => void
  showAnimation: boolean
  animationType: "creating" | "updating" | "deleting" | "success" | "error" | null
  animationMessage: string
  getProductDetail: (id: number) => Promise<any | null>
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [pagination, setPagination] = useState<ProductPagination>({
    total: 0,
    per_page: 25,
    current_page: 1,
    last_page: 1,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [subcategoryFilter, setSubcategoryFilter] = useState<number | null>(null)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [showAnimation, setShowAnimation] = useState(false)
  const [animationType, setAnimationType] = useState<"creating" | "updating" | "deleting" | "success" | "error" | null>(null)
  const [animationMessage, setAnimationMessage] = useState("")
  const { currentLanguage } = useLanguage();
  const { t } = useTranslation();
  const { user } = useAuth()
  const isLabAdmin = user?.roles?.includes("lab_admin")

  const triggerAnimation = useCallback((type: "creating" | "updating" | "deleting" | "success" | "error", message: string) => {
    setShowAnimation(true)
    setAnimationType(type)
    setAnimationMessage(message)
    const timer = setTimeout(() => {
      setShowAnimation(false)
      setAnimationType(null)
      setAnimationMessage("")
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const clearValidationErrors = useCallback(() => {
    setValidationErrors([])
    setError(null)
  }, [])

  const parseValidationErrors = (errorData: any): ValidationError[] => {
    const errors: ValidationError[] = []

    if (errorData.errors) {
      Object.entries(errorData.errors).forEach(([field, messages]) => {
        if (Array.isArray(messages)) {
          messages.forEach((message: string) => {
            errors.push({ field, message })
          })
        }
      })
    }

    return errors
  }

  const getAuthToken = () => {
    const token = localStorage.getItem("token")
    if (!token) throw new Error(t("productContext.noAuthToken", "No authentication token found"))
    return token
  }

  const redirectToLogin = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  // Helper to build query params for fetchProducts
  function buildQueryParams(
    page: number,
    perPage: number,
    q: string | null,
    column: string | null,
    direction: "asc" | "desc" | null,
    status: string | null,
    subcategory_id: number | null,
  ) {
    const params = new URLSearchParams()
    params.append("page", String(page))
    params.append("per_page", String(perPage))
    if (q) params.append("q", q)
    if (column) params.append("order_by", column)
    if (direction) params.append("sort_by", direction)
    if (status) params.append("status", status)
    if (subcategory_id !== null && subcategory_id !== undefined) params.append("subcategory_id", String(subcategory_id))
    return params.toString()
  }

  // Helper to transform form state to correct payload structure
  function buildProductPayload(form: any, releasingStageIds: (string | number)[] = []): any {
    const payload: any = { ...form }

    // Set is_custom (default to "Yes" if not present)
    payload.is_custom = form.is_custom ?? "Yes"

    // Set has_multiple_grades based on grades length
    payload.has_multiple_grades = Array.isArray(form.grades) && form.grades.length > 1 ? "Yes" : "No"

    // Set price (from base_price if grades are disabled)
    if (form.has_grade_based_pricing === "No") {
      // Use base_price if present, else fallback to price if present
      if (form.base_price !== undefined && form.base_price !== null && form.base_price !== "") {
        payload.price = typeof form.base_price === "string" ? parseFloat(form.base_price) : form.base_price
      } else if (form.price !== undefined && form.price !== null && form.price !== "") {
        payload.price = typeof form.price === "string" ? parseFloat(form.price) : form.price
      } else {
        payload.price = 0
      }
      payload.grades = []
    } else if (Array.isArray(form.grades) && form.has_grade_based_pricing === "Yes") {
      const defaultGrade = form.grades.find((g: any) => g.is_default === "Yes")
      payload.price = defaultGrade?.price ? parseFloat(defaultGrade.price) : (form.base_price ? parseFloat(form.base_price) : 0)
    }

    // Map stages according to API validation rules:
    // stages.*.stage_id (required), stages.*.sequence (required), 
    // stages.*.status (required), stages.*.days (sometimes), 
    // stages.*.is_releasing_stage (sometimes)
    if (Array.isArray(form.stages) && form.stages.length > 0) {
      // Sort stages by sequence to ensure correct order, then reassign sequence based on array index
      const sortedStages = [...form.stages].sort((a: any, b: any) => {
        const seqA = a.sequence ?? 0
        const seqB = b.sequence ?? 0
        return seqA - seqB
      })
      
      // Map stages and assign sequence based on actual array order (1-based)
      payload.stages = sortedStages.map((s: any, index: number) => {
        const stageData: any = {
          stage_id: s.stage_id,
          sequence: index + 1, // Always set sequence based on array order
          status: s.status ?? "Active",
        }
        
        // Only include days if it exists and is not empty
        if (s.days !== undefined && s.days !== null && s.days !== "") {
          stageData.days = Number(s.days)
        }
        
        // Always include is_releasing_stage (default to "No" if not set)
        const isReleasing = releasingStageIds.includes(s.stage_id) || s.is_releasing_stage === "Yes"
        stageData.is_releasing_stage = isReleasing ? "Yes" : (s.is_releasing_stage ?? "No")
        
        // Include is_default (default to "No" if not set)
        stageData.is_default = s.is_default === "Yes" ? "Yes" : "No"
        
        // Calculate stage price:
        // - If grade-based pricing: use default grade's price from stage.grade_prices
        //   If no default grade, use the first grade's price
        // - Otherwise: use economy_price or standard_price
        let stagePrice: number | null = null
        
        if (form.has_grade_based_pricing === "Yes" && Array.isArray(form.grades) && form.grades.length > 0) {
          // Check if grade_prices exists and has values
          const gradePrices = s.grade_prices
          const hasGradePrices = gradePrices && typeof gradePrices === "object" && Object.keys(gradePrices).length > 0
          
          if (hasGradePrices) {
            // Find the default grade first
            let targetGrade = form.grades.find((g: any) => g.is_default === "Yes")
            
            // If no default grade, use the first grade
            if (!targetGrade && form.grades.length > 0) {
              targetGrade = form.grades[0]
            }
            
            if (targetGrade) {
              const gradeId = targetGrade.grade_id || targetGrade.id
              
              // Try multiple key formats to find the price
              let gradePrice: any = null
              
              // Try as number key, string key, and all variations
              if (gradeId !== undefined && gradeId !== null) {
                // Try all possible key formats
                const numId = Number(gradeId)
                const strId = String(gradeId)
                
                gradePrice = gradePrices[gradeId] || 
                            gradePrices[numId] ||
                            gradePrices[strId] ||
                            gradePrices[gradeId?.toString()] ||
                            gradePrices[`${gradeId}`]
              }
              
              // If still not found, iterate through all grades to find a match
              if ((gradePrice === undefined || gradePrice === null || gradePrice === "")) {
                for (const grade of form.grades) {
                  const gId = grade.grade_id || grade.id
                  if (gId !== undefined && gId !== null) {
                    const numGId = Number(gId)
                    const strGId = String(gId)
                    const foundPrice = gradePrices[gId] || 
                                      gradePrices[numGId] ||
                                      gradePrices[strGId] ||
                                      gradePrices[gId?.toString()] ||
                                      gradePrices[`${gId}`]
                    
                    if (foundPrice !== undefined && foundPrice !== null && foundPrice !== "") {
                      gradePrice = foundPrice
                      break
                    }
                  }
                }
              }
              
              // Last resort: get the first non-empty price value from grade_prices
              // This should catch cases where the key format doesn't match
              if ((gradePrice === undefined || gradePrice === null || gradePrice === "") && Object.keys(gradePrices).length > 0) {
                // Try to get any value from grade_prices
                const keys = Object.keys(gradePrices)
                for (const key of keys) {
                  const priceVal = gradePrices[key]
                  // Check if it's a valid non-empty price
                  if (priceVal !== undefined && priceVal !== null && priceVal !== "" && priceVal !== "0" && priceVal !== 0) {
                    gradePrice = priceVal
                    break
                  }
                }
              }
              
              // Parse and set the price
              if (gradePrice !== undefined && gradePrice !== null && gradePrice !== "" && gradePrice !== "0" && gradePrice !== 0) {
                const parsedPrice = parseFloat(String(gradePrice))
                if (!isNaN(parsedPrice) && parsedPrice > 0) {
                  stagePrice = parsedPrice
                }
              }
            }
          }
          
          // If we still don't have a price and grade_prices exists, try one more time with direct access
          if ((stagePrice === null || stagePrice === 0) && gradePrices && Object.keys(gradePrices).length > 0) {
            // Get the first non-zero price value directly
            for (const key of Object.keys(gradePrices)) {
              const val = gradePrices[key]
              if (val && val !== "" && val !== "0" && val !== 0) {
                const parsed = parseFloat(String(val))
                if (!isNaN(parsed) && parsed > 0) {
                  stagePrice = parsed
                  break
                }
              }
            }
          }
          
          // If still no price found and grade-based pricing is enabled, try economy_price/standard_price as fallback
          // (This can happen if the UI is showing economy_price but grade-based pricing is enabled)
          if (stagePrice === null || stagePrice === 0) {
            if (s.economy_price !== undefined && s.economy_price !== null && s.economy_price !== "") {
              const parsedPrice = parseFloat(s.economy_price)
              if (!isNaN(parsedPrice) && parsedPrice > 0) {
                stagePrice = parsedPrice
              }
            } else if (s.standard_price !== undefined && s.standard_price !== null && s.standard_price !== "") {
              const parsedPrice = parseFloat(s.standard_price)
              if (!isNaN(parsedPrice) && parsedPrice > 0) {
                stagePrice = parsedPrice
              }
            }
          }
        } else {
          // Use economy_price or standard_price (they should be the same for non-grade pricing)
          if (s.economy_price !== undefined && s.economy_price !== null && s.economy_price !== "") {
            const parsedPrice = parseFloat(s.economy_price)
            if (!isNaN(parsedPrice)) {
              stagePrice = parsedPrice
            }
          } else if (s.standard_price !== undefined && s.standard_price !== null && s.standard_price !== "") {
            const parsedPrice = parseFloat(s.standard_price)
            if (!isNaN(parsedPrice)) {
              stagePrice = parsedPrice
            }
          }
        }
        
        // Always include price (even if 0) - this is required for the backend
        if (stagePrice !== null && !isNaN(stagePrice)) {
          stageData.price = stagePrice
        } else {
          stageData.price = 0
        }
        
        // Remove grade_prices from the payload - it should only be in stage_grades
        // The price field above already contains the calculated value
        delete stageData.grade_prices
        
        return stageData
      })
    } else {
      // If stages section is disabled or empty, ensure stages is not sent or is empty array
      payload.stages = []
    }

    // Build stage_grades according to API validation rules:
    // stage_grades.*.stage_id (required_with:stage_grades), 
    // stage_grades.*.grade_id (required_with:stage_grades), 
    // stage_grades.*.status (required_with:stage_grades)
    // stage_grades.*.price (included for backend processing)
    // Include stage_grades whenever there are stages with grade_prices
    if (Array.isArray(form.stages) && form.stages.length > 0) {
      payload.stage_grades = []
      // Use sorted stages to match the order used in stages payload
      const sortedStages = [...form.stages].sort((a: any, b: any) => {
        const seqA = a.sequence ?? 0
        const seqB = b.sequence ?? 0
        return seqA - seqB
      })
      
      sortedStages.forEach((stage: any) => {
        if (stage.grade_prices && typeof stage.grade_prices === "object" && Object.keys(stage.grade_prices).length > 0) {
          Object.entries(stage.grade_prices).forEach(([gradeIdStr, price]: [string, any]) => {
            // Skip if price is empty or invalid
            if (price === undefined || price === null || price === "") {
              return
            }
            
            // Parse the grade ID (handle both string and number)
            const gradeId = Number(gradeIdStr)
            if (isNaN(gradeId)) {
              return
            }
            
            // Verify grade exists in selected grades if grades array exists
            // If no grades array, include all grade_prices entries
            if (Array.isArray(form.grades) && form.grades.length > 0) {
              const gradeExists = form.grades.some((g: any) => {
                const gId = g.grade_id || g.id
                return gId?.toString() === gradeIdStr || 
                       Number(gId) === gradeId ||
                       g.grade_id === gradeId ||
                       g.id === gradeId
              })
              
              if (!gradeExists) {
                return
              }
            }
            
            // Parse and validate price
            const priceValue = typeof price === "string" ? parseFloat(price) : (typeof price === "number" ? price : null)
            
            if (priceValue !== null && !isNaN(priceValue) && priceValue >= 0) {
              payload.stage_grades.push({
                stage_id: stage.stage_id,
                grade_id: gradeId,
                price: priceValue,
                status: "Active",
              })
            }
          })
        }
      })
      
      // If no stage_grades were added, set to empty array
      if (payload.stage_grades.length === 0) {
        payload.stage_grades = []
      }
    } else {
      // If no stages, ensure stage_grades is not sent or is empty array
      payload.stage_grades = []
    }

    ["office_pricing", "office_grade_pricing", "office_stage_pricing", "office_stage_grade_pricing"].forEach(key => {
      if (Array.isArray(form[key])) {
        payload[key] = form[key].filter((item: any) => item.price !== undefined && item.price !== "")
          .map((item: any) => ({
            ...item,
            price: parseFloat(item.price),
            status: item.status ?? "Active",
          }))
      }
    })

    // Map grades: ensure price is number
    if (Array.isArray(form.grades)) {
      payload.grades = form.grades.map((g: any, idx: number) => ({
        grade_id: g.grade_id,
        sequence: g.sequence ?? idx + 1,
        is_default: g.is_default ?? "No",
        status: g.status ?? "Active",
        price: g.price ? parseFloat(g.price) : 0,
      }))
    }

    // Map retentions: ensure not empty if selected
    if (Array.isArray(form.retentions)) {
      payload.retentions = form.retentions.map((r: any, idx: number) => ({
        retention_id: r.retention_id,
        sequence: r.sequence ?? idx + 1,
        status: r.status ?? "Active",
      }))
    }

    // Map other arrays (impressions, gum_shades, teeth_shades, materials, addons, extractions)
    ["impressions", "gum_shades", "teeth_shades", "materials", "addons", "extractions"].forEach((key) => {
      if (!Array.isArray(form[key])) {
        return
      }

      if (key === "addons") {
        const normalizedAddons = form[key].map((item: any, idx: number) => ({
          ...item,
          sequence: item.sequence ?? idx + 1,
          status: item.status ?? "Active",
        }))

        payload[key] = normalizedAddons.map((addon: any) => {
          const quantitySource =
            addon.quantity !== undefined && addon.quantity !== "" ? Number(addon.quantity) : undefined
          const parsedQuantity =
            quantitySource !== undefined && !Number.isNaN(quantitySource) && quantitySource >= 1
              ? Math.max(1, Math.floor(quantitySource))
              : 1

          const priceSource = addon.price
          const parsedPrice =
            priceSource !== undefined && priceSource !== ""
              ? Number(priceSource)
              : undefined

          return {
            ...addon,
            quantity: parsedQuantity,
            is_default: addon.is_default === "Yes" ? "Yes" : "No",
            ...(parsedPrice !== undefined && !Number.isNaN(parsedPrice) ? { price: parsedPrice } : {}),
          }
        })
      } else if (key === "materials") {
        // Handle materials with price support
        payload[key] = form[key].map((item: any, idx: number) => {
          const priceSource = item.price
          const parsedPrice =
            priceSource !== undefined && priceSource !== null && priceSource !== ""
              ? (typeof priceSource === "number" ? priceSource : parseFloat(priceSource))
              : 0
          
          return {
            ...item,
            material_id: item.material_id,
            sequence: item.sequence ?? idx + 1,
            status: item.status ?? "Active",
            price: !Number.isNaN(parsedPrice) && parsedPrice >= 0 ? Math.min(parsedPrice, 999999.99) : 0,
          }
        })
      } else {
        payload[key] = form[key].map((item: any, idx: number) => ({
          ...item,
          sequence: item.sequence ?? idx + 1,
          status: item.status ?? "Active",
        }))
      }
    })

    // Remove unused fields
    delete payload.base_price

    return payload
  }

  const fetchProducts = useCallback(
    async (
      page = pagination.current_page, 
      perPage = pagination.per_page,
      q = searchQuery,
      column = sortColumn,
      direction = sortDirection,
      status = statusFilter,
      subcategory_id = subcategoryFilter,
      selectedLabId?: number | null,
    ) => {
      setIsLoading(true)
      setError(null)
      setValidationErrors([])
      const token = getAuthToken()
      if (!token) {
        setError(t("productContext.authRequired", "Authentication required to fetch products."))
        setProducts([])
        setPagination({ ...pagination, total: 0, current_page: 1, last_page: 1, per_page: 25 })
        setIsLoading(false)
        triggerAnimation("error", t("productContext.authRequiredAnimation", "Authentication required. Please log in."))
        return
      }

      try {
        const params = buildQueryParams(page, perPage, q, column, direction, status, subcategory_id)
        let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products?${params}&lang=${currentLanguage}`
        
        // Determine which ID to use based on user role
        const userRoles = user?.roles || (user?.role ? [user.role] : [])
        const isLabAdmin = userRoles.includes("lab_admin")
        const isSuperAdmin = userRoles.includes("superadmin")
        const isOfficeAdmin = userRoles.includes("office_admin")
        const isDoctor = userRoles.includes("doctor")
        
        let customerId = null;
        
        if (isLabAdmin || isSuperAdmin) {
          // For lab_admin or superadmin roles, use customer_id from localStorage
          // First try to get from localStorage
          if (typeof window !== "undefined") {
            const storedCustomerId = localStorage.getItem("customerId");
            if (storedCustomerId) {
              customerId = parseInt(storedCustomerId, 10);
            }
          }
          
          // Fallback to user.customers if not found in localStorage
          if (!customerId && user?.customers?.length) {
            customerId = user.customers[0]?.id;
          }
        } else if (isOfficeAdmin || isDoctor) {
          // For office_admin or doctor roles, always use selectedLabId from localStorage as customer_id
          if (typeof window !== "undefined") {
            const storedLabId = localStorage.getItem("selectedLabId");
            if (storedLabId) {
              customerId = parseInt(storedLabId, 10);
            } else if (selectedLabId) {
              // Fallback to parameter if localStorage doesn't have it
              customerId = selectedLabId;
            }
          } else if (selectedLabId) {
            // Fallback to parameter if window is undefined
            customerId = selectedLabId;
          }
        } else {
          // For other roles, use selectedLabId if available
          if (selectedLabId) {
            customerId = selectedLabId;
          } else if (typeof window !== "undefined") {
            // Try localStorage as fallback
            const storedLabId = localStorage.getItem("selectedLabId");
            if (storedLabId) {
              customerId = parseInt(storedLabId, 10);
            }
          }
        }
        
        // Append customer_id if we have one
        if (customerId) {
          url += `&customer_id=${customerId}`;
        }

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return
          }
          const errorData = await response.json().catch(() => ({ message: t("productContext.fetchFailed", "Failed to fetch products.") }))
          throw new Error(errorData.message || t("productContext.httpError", `HTTP error! status: ${response.status}`))
        }
        const result = await response.json()
        // Ensure products is always an array to prevent rendering errors
        const productsData = result.data?.data
        const safeProducts = Array.isArray(productsData) 
          ? productsData 
          : (productsData && typeof productsData === 'object' && 'data' in productsData && Array.isArray(productsData.data))
            ? productsData.data
            : []
        setProducts(safeProducts)
        setPagination(result.data.pagination || {
          total: 0,
          per_page: 25,
          current_page: 1,
          last_page: 1,
        })
      } catch (err) {
        console.error("Failed to fetch products:", err)
        const errorMessage = err instanceof Error ? err.message : t("productContext.loadFailed", "Failed to load products. Please try again.")
        setError(errorMessage)
        setProducts([])
        triggerAnimation("error", errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [
      // Remove frequently changing dependencies to prevent infinite loops
      // Keep only stable dependencies that don't change on every render
      currentLanguage,
      t,
      user,
    ],
  )

  const createProduct = useCallback(
    async (payload: ProductCreateForm & Record<string, any>, releasingStageIds: (string | number)[] = []) => {
      setIsLoading(true)
      setError(null)
      setValidationErrors([])

      try {
        const token = getAuthToken()
        let finalPayload = buildProductPayload(payload, releasingStageIds)

        if (payload.image) {
          finalPayload.image = payload.image
        }

        if (isLabAdmin && user?.customers && user.customers.length > 0) {
          const customerId = user.customers[0]?.id
          if (customerId) {
            finalPayload.customer_id = customerId
          }
        }

        if (Array.isArray(finalPayload.office_stage_grade_pricing)) {
          finalPayload.office_stage_grade_pricing = finalPayload.office_stage_grade_pricing.filter(
            (item: any) => item && item.grade_id && item.stage_id
          )
        }

        // Only remove pricing-related fields for non-lab products (products without customer_id)
        // Lab products (with customer_id) need stage_grades for grade-wise stage pricing
        if (!finalPayload.customer_id) {
          delete finalPayload.price
          delete finalPayload.price_type
          delete finalPayload.grade_prices
          delete finalPayload.stage_prices
          delete finalPayload.stage_grades
          delete finalPayload.office_pricing
          delete finalPayload.office_grade_pricing
          delete finalPayload.office_stage_pricing
          delete finalPayload.office_stage_grade_pricing

          // Remove price from grades, stages, addons if present
          if (Array.isArray(finalPayload.grades)) {
            finalPayload.grades = finalPayload.grades.map(({ price, ...rest }: any) => rest)
          }
          if (Array.isArray(finalPayload.stages)) {
            finalPayload.stages = finalPayload.stages.map(({ price, ...rest }: any) => rest)
          }
          if (Array.isArray(finalPayload.addons)) {
            finalPayload.addons = finalPayload.addons.map(({ price, ...rest }: any) => rest)
          }
        } else {
          // For lab products (with customer_id), keep stage_grades and ensure it's included
          // stage_grades is built by buildProductPayload from stage.grade_prices
          // It should always be included (even if empty array) to ensure proper updates
          if (!Array.isArray(finalPayload.stage_grades)) {
            finalPayload.stage_grades = []
          }
          
          // Remove other pricing fields for non-admin users, but keep stage_grades
          if (!isLabAdmin) {
            delete finalPayload.price
            delete finalPayload.price_type
            delete finalPayload.grade_prices
            delete finalPayload.stage_prices
            delete finalPayload.office_pricing
            delete finalPayload.office_grade_pricing
            delete finalPayload.office_stage_pricing
            delete finalPayload.office_stage_grade_pricing
          }
        }

        // Schema validation temporarily disabled
        const customerId = localStorage.getItem("customerId")
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products?customer_id=${customerId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(finalPayload),
        })

        if (response.status === 401) {
          redirectToLogin()
          return false
        }

        const result = await response.json()

        if (!response.ok) {
          if (response.status === 422) {
            const errors = parseValidationErrors(result)
            setValidationErrors(errors)
            setError(result.error_description || t("productContext.validationFailed", "Validation failed. Please check the form and try again."))
            triggerAnimation("error", result.error_description || t("productContext.validationErrorAnimation", "Please fix the validation errors and try again."))
            return false
          } else {
            throw new Error(result.message || t("productContext.httpError", `HTTP error! status: ${response.status}`))
          }
        }

        triggerAnimation("success", result.message || t("productContext.createSuccess", "Product created successfully!"))
        // Refresh products list
        await fetchProducts(
          pagination.current_page,
          pagination.per_page,
          searchQuery,
          sortColumn,
          sortDirection,
          statusFilter,
          subcategoryFilter,
        )
        return true
      } catch (err: any) {
        console.error("Failed to create product:", err)
        setError(err.message || t("productContext.createFailed", "Failed to create product."))
        triggerAnimation("error", err.message || t("productContext.createFailed", "Failed to create product."))
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [
      fetchProducts,
      pagination,
      searchQuery,
      sortColumn,
      sortDirection,
      statusFilter,
      subcategoryFilter,
      triggerAnimation,
      t,
      user,
    ],
  )

  const updateProduct = useCallback(
    async (id: number, payload: ProductCreateForm & Record<string, any>, releasingStageIds: (string | number)[] = []) => {
      // Log at the very start

      setIsLoading(true)
      setError(null)
      setValidationErrors([])
      triggerAnimation("updating", t("productContext.updating", "Updating Product..."))

      try {

        // Schema validation temporarily disabled


        const token = getAuthToken()
        let finalPayload = buildProductPayload(payload, releasingStageIds)

        // Pass image if present in payload
        if (payload.image) {
          finalPayload.image = payload.image
        }

        // Add customer_id for lab_admin
        if (isLabAdmin && user?.customers?.length) {
          const customerId = user.customers[0]?.id;
          if (customerId) {
            finalPayload.customer_id = customerId;
          }
        }

        // Clean up office_stage_grade_pricing: remove items missing grade_id or stage_id
        if (Array.isArray(finalPayload.office_stage_grade_pricing)) {
          finalPayload.office_stage_grade_pricing = finalPayload.office_stage_grade_pricing.filter(
            (item: any) => item && item.grade_id && item.stage_id
          )
        }

        // Only remove pricing-related fields for non-lab products (products without customer_id)
        // Lab products (with customer_id) need stage_grades for grade-wise stage pricing
        if (!finalPayload.customer_id) {
          delete finalPayload.price
          delete finalPayload.price_type
          delete finalPayload.grade_prices
          delete finalPayload.stage_prices
          delete finalPayload.stage_grades
          delete finalPayload.office_pricing
          delete finalPayload.office_grade_pricing
          delete finalPayload.office_stage_pricing
          delete finalPayload.office_stage_grade_pricing

          // Remove price from grades, stages, addons if present
          if (Array.isArray(finalPayload.grades)) {
            finalPayload.grades = finalPayload.grades.map(({ price, ...rest }: any) => rest)
          }
          if (Array.isArray(finalPayload.stages)) {
            finalPayload.stages = finalPayload.stages.map(({ price, ...rest }: any) => rest)
          }
          if (Array.isArray(finalPayload.addons)) {
            finalPayload.addons = finalPayload.addons.map(({ price, ...rest }: any) => rest)
          }
        } else {
          // For lab products (with customer_id), keep stage_grades and ensure it's included
          // stage_grades is built by buildProductPayload from stage.grade_prices
          // It should always be included (even if empty array) to ensure proper updates
          if (!Array.isArray(finalPayload.stage_grades)) {
            finalPayload.stage_grades = []
          }
          
          // Remove other pricing fields for non-admin users, but keep stage_grades
          if (!isLabAdmin) {
            delete finalPayload.price
            delete finalPayload.price_type
            delete finalPayload.grade_prices
            delete finalPayload.stage_prices
            delete finalPayload.office_pricing
            delete finalPayload.office_grade_pricing
            delete finalPayload.office_stage_pricing
            delete finalPayload.office_stage_grade_pricing
          }
        }

        // Log before fetch
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(finalPayload),
        })

        // Log after fetch

        if (response.status === 401) {
          redirectToLogin()
          return false
        }

        const result = await response.json()

        if (!response.ok) {
          if (response.status === 422) {
            const errors = parseValidationErrors(result)
            setValidationErrors(errors)
            setError(result.error_description || t("productContext.validationFailed", "Validation failed. Please check the form and try again."))
            triggerAnimation("error", result.error_description || t("productContext.validationErrorAnimation", "Please fix the validation errors and try again."))
            // Log validation errors for debugging
            return false
          } else {
            throw new Error(result.message || t("productContext.httpError", `HTTP error! status: ${response.status}`))
          }
        }

        triggerAnimation("success", result.message || t("productContext.updateSuccess", "Product updated successfully!"))
        
        // Use a more stable approach to refresh products - call fetchProducts with current state values
        // instead of relying on the dependency array
        await fetchProducts(
          pagination.current_page,
          pagination.per_page,
          searchQuery,
          sortColumn,
          sortDirection,
          statusFilter,
          subcategoryFilter,
        )
        return true
      } catch (err: any) {
        console.error("Failed to update product:", err)
        setError(err.message || t("productContext.updateFailed", "Failed to update product."))
        triggerAnimation("error", err.message || t("productContext.updateFailed", "Failed to update product."))
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [
      // Remove fetchProducts from dependencies to prevent infinite loops
      // Keep only the essential dependencies that don't change frequently
      triggerAnimation,
      t,
      user,
      isLabAdmin,
      pagination.current_page,
      pagination.per_page,
      searchQuery,
      sortColumn,
      sortDirection,
      statusFilter,
      subcategoryFilter,
    ],
  )

  const deleteProduct = useCallback(
    async (id: number) => {
      setIsLoading(true)
      setError(null)
      triggerAnimation("deleting", t("productContext.deleting", "Deleting Product..."))

      try {
        const token = getAuthToken()
        let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products/${id}`
        
        // Add customer_id query param for lab_admin
        if (isLabAdmin && user?.customers?.length) {
          const customerId = user.customers[0]?.id;
          if (customerId) {
            url += `?customer_id=${customerId}`;
          }
        }

        const response = await fetch(url, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.status === 401) {
          redirectToLogin()
          return false
        }

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message || t("productContext.httpError", `HTTP error! status: ${response.status}`))
        }

        triggerAnimation("success", result.message || t("productContext.deleteSuccess", "Product deleted successfully!"))
        
        // Clear selection if deleted product was selected
        setSelectedItems(prev => prev.filter(itemId => itemId !== id))
        
        fetchProducts(
          pagination.current_page,
          pagination.per_page,
          searchQuery,
          sortColumn,
          sortDirection,
          statusFilter,
          subcategoryFilter,
        )
        return true
      } catch (err: any) {
        console.error("Failed to delete product:", err)
        setError(err.message || t("productContext.deleteFailed", "Failed to delete product."))
        triggerAnimation("error", err.message || t("productContext.deleteFailed", "Failed to delete product."))
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [
      pagination,
      searchQuery,
      sortColumn,
      sortDirection,
      statusFilter,
      subcategoryFilter,
      triggerAnimation,
      t,
      setSelectedItems,
      user,
    ],
  )

  const deleteMultipleProducts = useCallback(
    async (ids: number[]) => {
      setIsLoading(true)
      setError(null)
      triggerAnimation("deleting", t("productContext.deletingMultiple", "Deleting Products..."))

      try {
        const token = getAuthToken()
        let payload: { ids: number[]; customer_id?: number } = { ids }
        
        // Add customer_id for lab_admin
        if (isLabAdmin && user?.customers?.length) {
          const customerId = user.customers[0]?.id;
          if (customerId) {
            payload.customer_id = customerId;
          }
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products/bulk-delete`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })

        if (response.status === 401) {
          redirectToLogin()
          return false
        }

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.message || t("productContext.httpError", `HTTP error! status: ${response.status}`))
        }

        triggerAnimation("success", result.message || t("productContext.deleteMultipleSuccess", "Products deleted successfully!"))
        
        // Clear all selections
        setSelectedItems([])
        
        fetchProducts(
          pagination.current_page,
          pagination.per_page,
          searchQuery,
          sortColumn,
          sortDirection,
          statusFilter,
          subcategoryFilter,
        )
        return true
      } catch (err: any) {
        console.error("Failed to delete products:", err)
        setError(err.message || t("productContext.deleteMultipleFailed", "Failed to delete products."))
        triggerAnimation("error", err.message || t("productContext.deleteMultipleFailed", "Failed to delete products."))
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [
      pagination,
      searchQuery,
      sortColumn,
      sortDirection,
      statusFilter,
      subcategoryFilter,
      triggerAnimation,
      t,
      setSelectedItems,
      user,
    ],
  )

  // Add getProductDetail with role-based customer_id logic
  const getProductDetail = useCallback(
    async (id: number, selectedLabId?: number): Promise<any | null> => {
      try {
        const token = getAuthToken()
        let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products/${id}?lang=${currentLanguage}`
        
        // Get user role information
        const userRoles = user?.roles || (user?.role ? [user.role] : [])
        const isLabAdmin = userRoles.includes("lab_admin")
        const isSuperAdmin = userRoles.includes("superadmin")
        
        // Determine which customer_id to use based on user role
        let effectiveCustomerId: number | null = null;
        
        if (isLabAdmin || isSuperAdmin) {
          // For lab_admin or superadmin roles, use customer_id from localStorage
          if (typeof window !== "undefined") {
            const storedCustomerId = localStorage.getItem("customerId");
            if (storedCustomerId) {
              effectiveCustomerId = Number(storedCustomerId);
            }
          }
        } else {
          // For other roles, use selectedLabId
          if (selectedLabId) {
            effectiveCustomerId = selectedLabId;
          }
        }
        
        if (effectiveCustomerId) {
          url += `&customer_id=${effectiveCustomerId}`
        }
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) {
          if (response.status === 401) {
            redirectToLogin()
            return null
          }
          const errorData = await response.json().catch(() => ({ message: t("productContext.fetchFailed", "Failed to fetch product detail.") }))
          throw new Error(errorData.message || t("productContext.httpError", `HTTP error! status: ${response.status}`))
        }
        const result = await response.json()
        return result.data
      } catch (err) {
        console.error("Failed to fetch product detail:", err)
        return null
      }
    },
    [currentLanguage, t, user]
  )

  const value = useMemo(() => ({
    products,
    pagination,
    isLoading,
    error,
    validationErrors,
    searchQuery,
    sortColumn,
    sortDirection,
    statusFilter,
    subcategoryFilter,
    selectedItems,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    deleteMultipleProducts,
    setSearchQuery,
    setSortColumn,
    setSortDirection,
    setStatusFilter,
    setSubcategoryFilter,
    setSelectedItems,
    clearValidationErrors,
    showAnimation,
    animationType,
    animationMessage,
    getProductDetail,
  }), [
    products,
    pagination,
    isLoading,
    error,
    validationErrors,
    searchQuery,
    sortColumn,
    sortDirection,
    statusFilter,
    subcategoryFilter,
    selectedItems,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    deleteMultipleProducts,
    showAnimation,
    animationType,
    animationMessage,
    getProductDetail,
  ])

  return (
    <ProductsContext.Provider value={value}>
      {children}
      {/* Animation Overlay */}
      {showAnimation && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[100]">
          <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center max-w-md">
            {animationType === "creating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  <Save className="h-16 w-16 animate-bounce" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {t("productContext.creating", "Creating Product...")}
                </p>
                <p className="text-sm text-[#a19d9d] text-center">
                  {t("productContext.creatingWait", "Please wait while we create your product.")}
                </p>
              </>
            )}

            {animationType === "updating" && (
              <>
                <div className="mb-4 text-[#1162a8]">
                  <Package className="h-16 w-16 animate-pulse" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {t("productContext.updating", "Updating Product...")}
                </p>
                <p className="text-sm text-[#a19d9d] text-center">
                  {t("productContext.updatingWait", "Please wait while we update your product.")}
                </p>
              </>
            )}

            {animationType === "deleting" && (
              <>
                <div className="mb-4 text-red-500">
                  <Trash2 className="h-16 w-16 animate-pulse" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {t("productContext.deleting", "Deleting Product...")}
                </p>
                <p className="text-sm text-[#a19d9d] text-center">
                  {t("productContext.deletingWait", "Please wait while we delete the product(s).")}
                </p>
              </>
            )}

            {animationType === "success" && (
              <>
                <div className="mb-4 text-green-500">
                  <CheckCircle className="h-16 w-16" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {t("productContext.success", "Success!")}
                </p>
                <p className="text-sm text-[#a19d9d] text-center">{animationMessage}</p>
              </>
            )}

            {animationType === "error" && (
              <>
                <div className="mb-4 text-red-500">
                  <AlertCircle className="h-16 w-16" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {t("productContext.error", "Error")}
                </p>
                <p className="text-sm text-[#a19d9d] text-center">{animationMessage}</p>
              </>
            )}
          </div>
        </div>
      )}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const { t } = useTranslation();
  const context = useContext(ProductsContext)
  if (context === undefined) {
    throw new Error(t("productContext.useProductsError", "useProducts must be used within a ProductsProvider"))
  }
  return context
}
