import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { getAuthToken, redirectToLogin } from '@/lib/auth-utils'

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
  perPage = 25,
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
