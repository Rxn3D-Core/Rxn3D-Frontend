import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/auth-context'
import { getAuthToken, redirectToLogin } from '@/lib/auth-utils'

type ApiErrorPayload = {
  message: string
  errors: Record<string, any> | null
  status: number
  raw?: any
}

const safeParseJson = async (response: Response) => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

const buildApiError = (response: Response, payload: any): ApiErrorPayload => ({
  message: payload?.error_description || payload?.message || response.statusText || `HTTP error! status: ${response.status}`,
  errors: payload?.errors || null,
  status: payload?.status_code || response.status,
  raw: payload,
})

interface ProductUpdatePayload {
  id: number
  payload: any
  releasingStageIds?: (string | number)[]
}

interface ProductCreatePayload {
  payload: any
  releasingStageIds?: (string | number)[]
}

export function useProductMutations() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isLabAdmin = user?.roles?.includes("lab_admin")

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, payload, releasingStageIds = [] }: ProductUpdatePayload) => {
      const token = getAuthToken()
      let finalPayload = { ...payload }
      
      // Handle releasingStageIds - mark stages as releasing if needed
      if (releasingStageIds.length > 0 && Array.isArray(finalPayload.stages)) {
        finalPayload.stages = finalPayload.stages.map((stage: any) => {
          const stageId = stage.stage_id || stage.id
          if (releasingStageIds.includes(stageId)) {
            return { ...stage, is_releasing_stage: "Yes" }
          }
          return stage
        })
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
          finalPayload.grades = finalPayload.grades.map(({ price, ...rest }) => rest)
        }
        if (Array.isArray(finalPayload.stages)) {
          finalPayload.stages = finalPayload.stages.map(({ price, ...rest }) => rest)
        }
        if (Array.isArray(finalPayload.addons)) {
          finalPayload.addons = finalPayload.addons.map(({ price, ...rest }) => rest)
        }
      } else {
        // For lab products (with customer_id), keep stage_grades but remove other pricing fields for non-admin users
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

      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products/${id}`
      
      console.log('🔄 Updating product:', { id, url: apiUrl, payload: finalPayload })
      
      let response: Response
      try {
        response = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(finalPayload),
          redirect: "manual", // Don't follow redirects automatically - handle them manually
        })
      } catch (fetchError: any) {
        // Handle network errors (like SSL errors from redirects)
        console.error("❌ Fetch error:", fetchError)
        const errorMessage = fetchError.message || String(fetchError)
        
        // Check for SSL errors or localhost redirects
        if (errorMessage.includes("Failed to fetch") || 
            errorMessage.includes("ERR_SSL") || 
            errorMessage.includes("localhost:3000") ||
            errorMessage.includes("net::ERR_") ||
            errorMessage.includes("ERR_")) {
          // Create ApiErrorPayload directly instead of using Response with invalid status
          const apiError: ApiErrorPayload = {
            message: "The API server is returning an invalid redirect. This is a server configuration issue. Please try using the 'Save Product' button instead, or contact your administrator.",
            errors: null,
            status: 302,
            raw: { error_description: "API redirect error - server misconfiguration detected" }
          }
          console.error("🚨 Redirect error detected:", apiError)
          throw apiError
        }
        throw fetchError
      }

      // Check if response is valid (status 0 means request failed)
      if (response.status === 0) {
        console.error("❌ Request failed with status 0 - likely a redirect or network issue")
        // Can't use Response with status 0, so throw a regular error with ApiError structure
        const error: ApiErrorPayload = {
          message: "The request failed due to a network error or server redirect. This is likely a server configuration issue. Please try using the 'Save Product' button instead, or contact your administrator.",
          errors: null,
          status: 0,
          raw: { error_description: "Request failed - status 0" }
        }
        throw error
      }

      if (response.status === 401) {
        redirectToLogin()
        throw new Error("Unauthorized")
      }

      // Handle redirect responses (302, 301, etc.)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("Location")
        console.warn(`⚠️ API returned redirect ${response.status} to: ${location}`)
        
        // If redirect is to localhost or relative path, it's likely a misconfiguration
        if (location && (location.includes("localhost") || location.includes("127.0.0.1") || location.startsWith("/"))) {
          const apiError = buildApiError(
            response,
            {
              message: `The API server returned an invalid redirect to "${location}". This is a server configuration issue. Please try using the 'Save Product' button instead, or contact your administrator.`,
              error_description: `Invalid redirect location: ${location}`
            }
          )
          console.error("🚨 Invalid redirect detected:", apiError)
          throw apiError
        }
        
        // If we have a valid absolute URL, retry the request
        if (location && location.startsWith("http") && !location.includes("localhost")) {
          console.log(`Following redirect to: ${location}`)
          try {
            const redirectResponse = await fetch(location, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(finalPayload),
              redirect: "manual",
            })
            
            if (redirectResponse.status === 401) {
              redirectToLogin()
              throw new Error("Unauthorized")
            }
            
            const apiResult = await safeParseJson(redirectResponse)
            
            if (!redirectResponse.ok) {
              throw buildApiError(redirectResponse, apiResult)
            }
            
            return apiResult
          } catch (redirectError: any) {
            // If redirect also fails, throw a clear error
            if (redirectError.message?.includes("Failed to fetch") || redirectError.message?.includes("ERR_SSL")) {
              const apiError: ApiErrorPayload = {
                message: "Failed to follow API redirect. The redirect location may be invalid or unreachable.",
                errors: null,
                status: 302,
                raw: { error_description: "Redirect follow failed" }
              }
              throw apiError
            }
            throw redirectError
          }
        }
        
        // If no valid location header, treat as error
        throw buildApiError(
          response,
          {
            message: `API returned redirect ${response.status} but no valid Location header was provided.`,
            error_description: "Missing redirect location"
          }
        )
      }

      const apiResult = await safeParseJson(response)

      if (!response.ok) {
        console.error("❌ API returned error:", response.status, apiResult)
        throw buildApiError(response, apiResult)
      }

      console.log("✅ Product updated successfully:", apiResult)
      return apiResult
    },
    onSuccess: () => {
      // Invalidate and refetch products query
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => {
      console.error("❌ Failed to update product:", error)
    },
  })

  const createProductMutation = useMutation({
    mutationFn: async ({ payload, releasingStageIds = [] }: ProductCreatePayload) => {
      const token = getAuthToken()
      let finalPayload = { ...payload }

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
          finalPayload.grades = finalPayload.grades.map(({ price, ...rest }) => rest)
        }
        if (Array.isArray(finalPayload.stages)) {
          finalPayload.stages = finalPayload.stages.map(({ price, ...rest }) => rest)
        }
        if (Array.isArray(finalPayload.addons)) {
          finalPayload.addons = finalPayload.addons.map(({ price, ...rest }) => rest)
        }
      } else {
        // For lab products (with customer_id), keep stage_grades but remove other pricing fields for non-admin users
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalPayload),
      })

      if (response.status === 401) {
        redirectToLogin()
        throw new Error("Unauthorized")
      }

      const apiResult = await safeParseJson(response)

      if (!response.ok) {
        throw buildApiError(response, apiResult)
      }

      return apiResult
    },
    onSuccess: () => {
      // Invalidate and refetch products query
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => {
      console.error("Failed to create product:", error)
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
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
        throw new Error("Unauthorized")
      }

      const apiResult = await safeParseJson(response)

      if (!response.ok) {
        throw buildApiError(response, apiResult)
      }

      return apiResult
    },
    onSuccess: () => {
      // Invalidate and refetch products query
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (error) => {
      console.error("Failed to delete product:", error)
    },
  })

  return {
    updateProduct: async (id: number, payload: any, releasingStageIds?: (string | number)[]) => {
      return updateProductMutation.mutateAsync({ id, payload, releasingStageIds })
    },
    createProduct: async (payload: any, releasingStageIds?: (string | number)[]) => {
      return createProductMutation.mutateAsync({ payload, releasingStageIds })
    },
    deleteProduct: deleteProductMutation.mutateAsync,
    isUpdating: updateProductMutation.isPending,
    isCreating: createProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
    updateError: updateProductMutation.error,
    createError: createProductMutation.error,
    deleteError: deleteProductMutation.error,
  }
}
