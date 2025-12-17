const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

// Helper function to get auth headers
const getAuthHeaders = () => {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

// Handle 401 responses and redirect to login
const handleUnauthorized = () => {
  if (typeof window !== 'undefined') {
    // Clear auth data
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('customerId')
    
    // Redirect to login
    window.location.href = '/login'
  }
}

// Centralized API service with error handling
export class ApiService {
  static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    }

    try {
      const response = await fetch(url, config)
      
      // Handle 401 Unauthorized
      if (response.status === 401) {
        handleUnauthorized()
        throw new Error('Unauthorized - Redirecting to login')
      }
      
      // Handle other error statuses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      // Re-throw 401 errors (they're already handled)
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        throw error
      }
      
      // Handle network errors
      console.error('API request failed:', error)
      throw new Error('Network error - Please check your connection')
    }
  }

  // GET request
  static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  // POST request
  static async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PUT request
  static async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // DELETE request
  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // PATCH request
  static async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

// Product-specific API methods
export const ProductApi = {
  // Get product teeth shades
  getTeethShades: async (productId: number) => {
    console.log('🔍 ProductApi.getTeethShades called:', { productId })
    // Get the correct lab ID based on user role, including doctor
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
    let labId: string | null = null
    if (role === 'office_admin' || role === 'doctor') {
      labId = typeof window !== 'undefined' ? localStorage.getItem('selectedLabId') : null
    } else {
      labId = typeof window !== 'undefined' ? localStorage.getItem('customerId') : null
    }
    console.log('🔍 ProductApi.getTeethShades - labId:', { role, labId })
    
    // Validate labId before making the request
    if (!labId || labId === 'null' || labId === 'undefined') {
      console.warn('🔍 ProductApi.getTeethShades - labId is missing or invalid:', labId)
      return []
    }
    
    const endpoint = `/slip/lab/${labId}/products/${productId}/teeth-shades`
    console.log('🔍 ProductApi.getTeethShades - endpoint:', endpoint)
    const response = await ApiService.get<{ success: boolean; message: string; data: Array<{ id: number; name: string; shades?: Array<{ id: number; name: string }> }> }>(endpoint)
    console.log('🔍 ProductApi.getTeethShades - response:', response)
    return response.data || []
  },

  // Get product gum shades
  getGumShades: async (productId: number) => {
    console.log('🔍 ProductApi.getGumShades called:', { productId })
    // Get the correct lab ID based on user role
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
    let labId: string | null = null
    if (role === 'office_admin' || role === 'doctor') {
      labId = typeof window !== 'undefined' ? localStorage.getItem('selectedLabId') : null
    } else {
      labId = typeof window !== 'undefined' ? localStorage.getItem('customerId') : null
    }
    console.log('🔍 ProductApi.getGumShades - labId:', { role, labId })
    
    // Validate labId before making the request
    if (!labId || labId === 'null' || labId === 'undefined') {
      console.warn('🔍 ProductApi.getGumShades - labId is missing or invalid:', labId)
      return []
    }
    
    const endpoint = `/slip/lab/${labId}/products/${productId}/gum-shades`
    console.log('🔍 ProductApi.getGumShades - endpoint:', endpoint)
    const response = await ApiService.get<{ success: boolean; message: string; data: Array<{ id: number; name: string; shades?: Array<{ id: number; name: string }> }> }>(endpoint)
    console.log('🔍 ProductApi.getGumShades - response:', response)
    return response.data || []
  },

  // Get product impressions
  getImpressions: async (productId: number) => {
    // Get the correct lab ID based on user role
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
    let labId: string | null = null
    if (role === 'office_admin' || role === 'doctor') {
      labId = typeof window !== 'undefined' ? localStorage.getItem('selectedLabId') : null
    } else {
      labId = typeof window !== 'undefined' ? localStorage.getItem('customerId') : null
    }
    
    // Validate labId before making the request
    if (!labId || labId === 'null' || labId === 'undefined') {
      console.warn('🔍 ProductApi.getImpressions - labId is missing or invalid:', labId)
      return []
    }
    
    const response = await ApiService.get<{ success: boolean; message: string; data: Array<{ id: number; name: string }> }>(`/slip/lab/${labId}/products/${productId}/impressions`)
    return response.data || []
  },

  // Calculate delivery date
  calculateDelivery: async (productId: number, stageId: number) => {
    // Get the correct lab ID based on user role
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
    let labId: string | null = null
    if (role === 'office_admin' || role === 'doctor') {
      labId = typeof window !== 'undefined' ? localStorage.getItem('selectedLabId') : null
    } else {
      labId = typeof window !== 'undefined' ? localStorage.getItem('customerId') : null
    }
    
    if (!labId) {
      throw new Error('Lab ID not found. Please ensure you are logged in and have selected a lab.')
    }
    
    const response = await ApiService.get<{ success: boolean; message: string; data: { pickup_date: string; delivery_date: string; delivery_time: string } }>(`/slip/lab/${labId}/delivery-date?product_id=${productId}&stage_id=${stageId}`)
    return response.data
  },
}

// Helper function to get customer ID for lab_admin
const getCustomerId = (): number | null => {
  if (typeof window === 'undefined') return null
  
  const role = localStorage.getItem('role')
  const isLabAdmin = role === 'lab_admin'
  
  if (isLabAdmin) {
    const customerId = localStorage.getItem('customerId')
    if (customerId) {
      return parseInt(customerId, 10)
    }
  }
  
  return null
}

// Extractions API methods
export const ExtractionsApi = {
  // Get extractions list with filters
  getExtractions: async (filters: {
    search?: string;
    status?: "Active" | "Inactive";
    customer_id?: number;
    is_custom?: "Yes" | "No";
    per_page?: number;
    page?: number;
    sort_by?: "name" | "code" | "sequence" | "created_at";
    sort_order?: "asc" | "desc";
    lang?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    
    // Get customerId for lab_admin and add to filters if not already present
    const customerId = getCustomerId()
    if (customerId && !filters.customer_id) {
      filters.customer_id = customerId
    }
    
    // Add filters to query params
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/library/extractions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return ApiService.get<{
      status: boolean;
      message: string;
      data: {
        data: Array<{
          id: number;
          name: string;
          code: string;
          description: string | null;
          color: string;
          url: string | null;
          sequence: number;
          status: "Active" | "Inactive";
          customer_id: number | null;
          is_custom: "Yes" | "No";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        }>;
        pagination: {
          total: number;
          per_page: number;
          current_page: number;
          last_page: number;
        };
      };
    }>(endpoint);
  },

  // Get single extraction by ID
  getExtraction: async (
    id: number,
    options: {
      customerId?: number;
      lang?: string;
    } = {},
  ) => {
    const queryParams = new URLSearchParams();
    
    // Get customerId for lab_admin
    const customer_id = options.customerId ?? getCustomerId()
    if (customer_id) {
      queryParams.append('customer_id', customer_id.toString())
    }

    if (options.lang) {
      queryParams.append('lang', options.lang)
    }
    
    const endpoint = `/library/extractions/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return ApiService.get<{
      status: boolean;
      message: string;
      data: {
        id: number;
        name: string;
        code: string;
        description: string | null;
        color: string;
        url: string | null;
        sequence: number;
        status: "Active" | "Inactive";
        customer_id: number | null;
        is_custom: "Yes" | "No";
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      };
    }>(endpoint);
  },

  // Create new extraction
  createExtraction: async (data: {
    name: string;
    code: string;
    description?: string | null;
    url?: string | null;
    color: string;
    sequence: number;
    status: "Active" | "Inactive";
    customer_id?: number;
  }) => {
    // Get customerId for lab_admin and add to payload if not already present
    const customerId = getCustomerId()
    if (customerId && !data.customer_id) {
      data.customer_id = customerId
    }
    
    return ApiService.post<{
      status: boolean;
      message: string;
      data: {
        id: number;
        name: string;
        code: string;
        description: string | null;
        color: string;
        url: string | null;
        sequence: number;
        status: "Active" | "Inactive";
        customer_id: number | null;
        is_custom: "Yes" | "No";
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      };
    }>('/library/extractions', data);
  },

  // Update extraction
  updateExtraction: async (id: number, data: {
    name?: string;
    code?: string;
    description?: string | null;
    url?: string | null;
    color?: string;
    sequence?: number;
    status?: "Active" | "Inactive";
  }) => {
    return ApiService.put<{
      status: boolean;
      message: string;
      data: {
        id: number;
        name: string;
        code: string;
        description: string | null;
        color: string;
        url: string | null;
        sequence: number;
        status: "Active" | "Inactive";
        customer_id: number | null;
        is_custom: "Yes" | "No";
        created_at: string;
        updated_at: string;
        deleted_at: string | null;
      };
    }>(`/library/extractions/${id}`, data);
  },

  // Delete extraction
  deleteExtraction: async (id: number, customerId?: number) => {
    const queryParams = new URLSearchParams();
    
    // Get customerId for lab_admin
    const customer_id = customerId || getCustomerId()
    if (customer_id) {
      queryParams.append('customer_id', customer_id.toString())
    }
    
    const endpoint = `/library/extractions/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return ApiService.delete<{
      status: boolean;
      message: string;
    }>(endpoint);
  },

  // Stage Notes API
  createStageNote: async (data: {
    type: 'stage';
    note: string;
    slip_id?: number;
    product_id?: number;
    stage_id?: number;
    needs_follow_up?: boolean;
    assigned_to?: number;
  }) => {
    return ApiService.post<{
      success: boolean;
      message: string;
      data: any;
    }>('/slip/notes', data);
  },

  updateStageNote: async (noteId: number, data: {
    note: string;
    needs_follow_up?: boolean;
    assigned_to?: number;
  }) => {
    return ApiService.put<{
      success: boolean;
      message: string;
      data: any;
    }>(`/slip/notes/${noteId}`, data);
  },

  getStageNotes: async (params: {
    slip_id?: number;
    product_id?: number;
    stage_id?: number;
    type?: 'stage';
  }) => {
    return ApiService.get<{
      success: boolean;
      data: any[];
    }>('/slip/notes', { params });
  },
};

// Export the base service for custom requests
export default ApiService 