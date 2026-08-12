import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { getAuthToken, redirectToLogin } from '@/lib/auth-utils'
import { resolveLibraryCustomerId } from '@/lib/customer-scope'

interface ProductsQueryParams {
  page?: number
  perPage?: number
  searchQuery?: string
  sortColumn?: string | null
  sortDirection?: "asc" | "desc" | null
  statusFilter?: string | null
  subcategoryFilter?: number | null
  selectedLabId?: number | null
}

export function useProductsQuery({
  page = 1,
  perPage = 100,
  searchQuery = "",
  sortColumn = null,
  sortDirection = null,
  statusFilter = null,
  subcategoryFilter = null,
  selectedLabId = null,
}: ProductsQueryParams = {}) {
  const { user } = useAuth()
  const { currentLanguage } = useLanguage()

  return useQuery({
    queryKey: ['products', page, perPage, searchQuery, sortColumn, sortDirection, statusFilter, subcategoryFilter, selectedLabId, currentLanguage],
    queryFn: async () => {
      const token = getAuthToken()
      if (!token) {
        throw new Error("Authentication required to fetch products.")
      }

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        lang: currentLanguage,
      })

      if (searchQuery) params.append('q', searchQuery)
      if (sortColumn && sortDirection) {
        params.append('sort_by', sortColumn)
        params.append('sort_order', sortDirection)
      }
      if (statusFilter) params.append('status', statusFilter)
      if (subcategoryFilter) params.append('subcategory_id', subcategoryFilter.toString())

      let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/library/products?${params.toString()}`

      const customerId = resolveLibraryCustomerId(user) ?? selectedLabId ?? null
      if (customerId) {
        url += `&customer_id=${customerId}`
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 401) {
        redirectToLogin()
        throw new Error("Unauthorized")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch products." }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        products: result.data.data,
        pagination: result.data.pagination,
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })
}
