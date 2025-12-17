import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { ProductApi } from '@/lib/api-service'

interface ProductData {
  id: number
  grades?: Array<{ id: number; name: string }>
  stages?: Array<{ id: number; name: string }>
  teethShades?: Array<{ id: number; name: string; shades?: Array<{ id: number; name: string }> }>
  gumShades?: Array<{ id: number; name: string; shades?: Array<{ id: number; name: string }> }>
  impressions?: Array<{ id: number; name: string }>
}

interface DeliveryData {
  pickup_date: string
  delivery_date: string
  delivery_time: string
}

// Fetch product grades - Note: This function is not implemented in ProductApi
export function useProductGrades(productId: number | null) {
  return useQuery({
    queryKey: ['product-grades', productId],
    queryFn: async (): Promise<Array<{ id: number; name: string }>> => {
      // Return empty array since getGrades is not implemented in ProductApi
      return []
    },
    enabled: false, // Disabled since the API function doesn't exist
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Fetch product stages - Stages come from the product details API response
// Use the stages array from the product object passed to the components
export function useProductStages(productId: number | null) {
  return useQuery({
    queryKey: ['product-stages', productId],
    queryFn: async (): Promise<Array<{ id: number; name: string }>> => {
      // Stages are included in the product details response from fetchProductDetails
      // This hook is kept for compatibility but returns empty array
      // Components should use product.stages directly from the product object
      return []
    },
    enabled: false, // Disabled - use product.stages from product details instead
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Fetch product teeth shades
export function useProductTeethShades(productId: number | null) {
  return useQuery({
    queryKey: ['product-teeth-shades', productId],
    queryFn: async (): Promise<Array<{ id: number; name: string; shades?: Array<{ id: number; name: string }> }>> => {
      console.log('🔍 API Call - useProductTeethShades:', { productId, enabled: !!productId })
      if (!productId) return []
      
      const result = await ProductApi.getTeethShades(productId)
      console.log('🔍 API Response - useProductTeethShades:', { productId, result })
      return result
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Fetch product gum shades
export function useProductGumShades(productId: number | null) {
  return useQuery({
    queryKey: ['product-gum-shades', productId],
    queryFn: async (): Promise<Array<{ id: number; name: string; shades?: Array<{ id: number; name: string }> }>> => {
      console.log('🔍 API Call - useProductGumShades:', { productId, enabled: !!productId })
      if (!productId) return []
      
      const result = await ProductApi.getGumShades(productId)
      console.log('🔍 API Response - useProductGumShades:', { productId, result })
      return result
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Fetch product impressions
export function useProductImpressions(productId: number | null) {
  return useQuery({
    queryKey: ['product-impressions', productId],
    queryFn: async (): Promise<Array<{ id: number; name: string }>> => {
      if (!productId) return []
      
      return ProductApi.getImpressions(productId)
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Calculate delivery date
export function useDeliveryDate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      productId, 
      stageId 
    }: { 
      productId: number; 
      stageId: number 
    }): Promise<DeliveryData> => {
      return ProductApi.calculateDelivery(productId, stageId)
    },
    onSuccess: (data, variables) => {
      // Cache the delivery data
      queryClient.setQueryData(
        ['delivery-date', variables.productId, variables.stageId],
        data
      )
      
      // Also invalidate any product-related queries that might include delivery dates
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] })
    },
    onError: (error) => {
      console.error('Failed to calculate delivery date:', error)
    },
  })
}

// Prefetch product data
export function usePrefetchProductData() {
  const queryClient = useQueryClient()
  
  return useCallback((productId: number) => {
    // Get the correct lab ID based on user role
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
    const labId = role === 'office_admin' 
      ? (typeof window !== 'undefined' ? localStorage.getItem('selectedLabId') : null)
      : (typeof window !== 'undefined' ? localStorage.getItem('customerId') : null)
    if (!labId) return
    // Prefetch all related data (only for functions that exist in ProductApi)
    queryClient.prefetchQuery({
      queryKey: ['product-teeth-shades', productId],
      queryFn: async () => ProductApi.getTeethShades(productId),
    })
    
    queryClient.prefetchQuery({
      queryKey: ['product-gum-shades', productId],
      queryFn: async () => ProductApi.getGumShades(productId),
    })
    
    queryClient.prefetchQuery({
      queryKey: ['product-impressions', productId],
      queryFn: async () => ProductApi.getImpressions(productId),
    })
  }, [queryClient])
}

// Stage Notes Mutations
export function useCreateStageNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: {
      type: 'stage';
      note: string;
      slip_id?: number;
      product_id?: number;
      stage_id?: number;
      needs_follow_up?: boolean;
      assigned_to?: number;
    }) => {
      const { ExtractionsApi } = await import('@/lib/api-service')
      return ExtractionsApi.createStageNote(data)
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['stage-notes'] })
      
      // Snapshot the previous value
      const previousStageNotes = queryClient.getQueryData(['stage-notes'])
      
      // Optimistically update the cache
      queryClient.setQueryData(['stage-notes'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          data: [
            ...(old.data || []),
            {
              id: `temp-${Date.now()}`,
              note: variables.note,
              type: variables.type,
              slip_id: variables.slip_id,
              product_id: variables.product_id,
              stage_id: variables.stage_id,
              needs_follow_up: variables.needs_follow_up,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ]
        }
      })
      
      // Return a context object with the snapshotted value
      return { previousStageNotes }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousStageNotes) {
        queryClient.setQueryData(['stage-notes'], context.previousStageNotes)
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate stage notes queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['stage-notes'] })
      
      // If we have a slip_id, invalidate slip-related queries
      if (variables.slip_id) {
        queryClient.invalidateQueries({ queryKey: ['slip', variables.slip_id] })
      }
    },
  })
}

export function useUpdateStageNote() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ noteId, data }: {
      noteId: number;
      data: {
        note: string;
        needs_follow_up?: boolean;
        assigned_to?: number;
      };
    }) => {
      const { ExtractionsApi } = await import('@/lib/api-service')
      return ExtractionsApi.updateStageNote(noteId, data)
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['stage-notes'] })
      await queryClient.cancelQueries({ queryKey: ['stage-note', variables.noteId] })
      
      // Snapshot the previous values
      const previousStageNotes = queryClient.getQueryData(['stage-notes'])
      const previousStageNote = queryClient.getQueryData(['stage-note', variables.noteId])
      
      // Optimistically update the cache
      queryClient.setQueryData(['stage-note', variables.noteId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          ...variables.data,
          updated_at: new Date().toISOString(),
        }
      })
      
      // Also update in the stage notes list if it exists
      queryClient.setQueryData(['stage-notes'], (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((note: any) => 
            note.id === variables.noteId 
              ? { ...note, ...variables.data, updated_at: new Date().toISOString() }
              : note
          )
        }
      })
      
      // Return a context object with the snapshotted values
      return { previousStageNotes, previousStageNote }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousStageNotes) {
        queryClient.setQueryData(['stage-notes'], context.previousStageNotes)
      }
      if (context?.previousStageNote) {
        queryClient.setQueryData(['stage-note', variables.noteId], context.previousStageNote)
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate stage notes queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['stage-notes'] })
      
      // Update the specific note in cache if we have the data
      queryClient.setQueryData(['stage-note', variables.noteId], data)
    },
  })
}

// Product Configuration Mutations
export function useUpdateProductConfiguration() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ productId, arch, field, value }: {
      productId: string;
      arch: 'maxillary' | 'mandibular';
      field: string;
      value: any;
    }) => {
      // This would typically call an API to update the product configuration
      // For now, we'll simulate the API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, productId, arch, field, value })
        }, 500)
      })
    },
    onSuccess: (data, variables) => {
      // Invalidate product-related queries
      queryClient.invalidateQueries({ queryKey: ['product', variables.productId] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
} 