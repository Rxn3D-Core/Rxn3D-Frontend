import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { ExtractionsApi } from '@/lib/api-service'
import { useToast } from '@/hooks/use-toast'
import type { 
  Extraction, 
  ExtractionsListResponse, 
  ExtractionsResponse, 
  CreateExtractionPayload, 
  UpdateExtractionPayload, 
  ExtractionsFilters 
} from '@/lib/schemas'

// Query keys for React Query
export const extractionsKeys = {
  all: ['extractions'] as const,
  lists: () => [...extractionsKeys.all, 'list'] as const,
  list: (filters: ExtractionsFilters) => [...extractionsKeys.lists(), filters] as const,
  details: () => [...extractionsKeys.all, 'detail'] as const,
  detail: (id: number) => [...extractionsKeys.details(), id] as const,
  detailWithLang: (id: number, lang: string) => [...extractionsKeys.detail(id), lang] as const,
}

// Fetch extractions list with filters
export function useExtractions(filters: ExtractionsFilters = {}) {
  return useQuery({
    queryKey: extractionsKeys.list(filters),
    queryFn: async (): Promise<ExtractionsListResponse> => {
      const response = await ExtractionsApi.getExtractions(filters)
      return response
    },
    staleTime: 0, // always refetch so we can load the latest localized detail
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
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

// Fetch single extraction by ID (supports language-specific labels)
export function useExtraction(id: number | null, lang?: string) {
  const language = lang || 'en'

  return useQuery({
    queryKey: extractionsKeys.detailWithLang(id!, language),
    queryFn: async (): Promise<ExtractionsResponse> => {
      if (!id) throw new Error('Extraction ID is required')
      const customerId = getCustomerId()
      return ExtractionsApi.getExtraction(id, { customerId: customerId || undefined, lang: language })
    },
    enabled: !!id,
    staleTime: 0, // always refetch so we can load the latest localized detail
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Create extraction mutation
export function useCreateExtraction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreateExtractionPayload): Promise<ExtractionsResponse> => {
      return ExtractionsApi.createExtraction(data)
    },
    onSuccess: (data) => {
      // Invalidate and refetch extractions list
      queryClient.invalidateQueries({ queryKey: extractionsKeys.lists() })
      
      toast({
        title: "Extraction Created",
        description: `Successfully created extraction: ${data.data.name}`,
        variant: "default",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create extraction",
        variant: "destructive",
      })
    },
  })
}

// Update extraction mutation
export function useUpdateExtraction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ 
      id, 
      data 
    }: { 
      id: number; 
      data: UpdateExtractionPayload 
    }): Promise<ExtractionsResponse> => {
      return ExtractionsApi.updateExtraction(id, data)
    },
    onSuccess: (data, variables) => {
      // Update the specific extraction in cache
      queryClient.setQueryData(
        extractionsKeys.detail(variables.id),
        data
      )
      
      // Invalidate and refetch extractions list
      queryClient.invalidateQueries({ queryKey: extractionsKeys.lists() })
      
      toast({
        title: "Extraction Updated",
        description: `Successfully updated extraction: ${data.data.name}`,
        variant: "default",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update extraction",
        variant: "destructive",
      })
    },
  })
}

// Delete extraction mutation
export function useDeleteExtraction() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: number): Promise<{ status: boolean; message: string }> => {
      const customerId = getCustomerId()
      return ExtractionsApi.deleteExtraction(id, customerId || undefined)
    },
    onSuccess: (data, id) => {
      // Remove the extraction from cache
      queryClient.removeQueries({ queryKey: extractionsKeys.detail(id) })
      
      // Invalidate and refetch extractions list
      queryClient.invalidateQueries({ queryKey: extractionsKeys.lists() })
      
      toast({
        title: "Extraction Deleted",
        description: data.message || "Successfully deleted extraction",
        variant: "default",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete extraction",
        variant: "destructive",
      })
    },
  })
}

// Prefetch extractions data
export function usePrefetchExtractions() {
  const queryClient = useQueryClient()
  
  return useCallback((filters: ExtractionsFilters = {}) => {
    queryClient.prefetchQuery({
      queryKey: extractionsKeys.list(filters),
      queryFn: async () => ExtractionsApi.getExtractions(filters),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }, [queryClient])
}

// Prefetch single extraction
export function usePrefetchExtraction() {
  const queryClient = useQueryClient()
  
  return useCallback((id: number) => {
    const customerId = getCustomerId()
    queryClient.prefetchQuery({
      queryKey: extractionsKeys.detail(id),
      queryFn: async () => ExtractionsApi.getExtraction(id, customerId || undefined),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }, [queryClient])
}

// Utility hook to get extractions data with loading states
export function useExtractionsData(filters: ExtractionsFilters = {}) {
  const { data, isLoading, error, refetch } = useExtractions(filters)
  
  return {
    extractions: data?.data?.data || [],
    pagination: data?.data?.pagination,
    isLoading,
    error,
    refetch,
    isEmpty: !isLoading && (!data?.data?.data || data.data.data.length === 0),
  }
}

// Utility hook for extraction form operations
export function useExtractionForm() {
  const createMutation = useCreateExtraction()
  const updateMutation = useUpdateExtraction()
  
  return {
    createExtraction: createMutation.mutate,
    updateExtraction: updateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
  }
}
