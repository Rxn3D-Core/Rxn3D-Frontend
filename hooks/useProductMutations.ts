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
    mutationFn: async ({ id, payload }: ProductUpdatePayload) => {
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products/${id}`, {
        method: "PUT",
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
      console.error("Failed to update product:", error)
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
    updateProduct: async (id: number, payload: any) => {
      return updateProductMutation.mutateAsync({ id, payload })
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
