import { useModelPreload } from "@/contexts/3d-model-preload-context"

export function use3DModelPreload() {
  const preloadContext = useModelPreload()
  
  return {
    // Preload specific model
    preloadModel: preloadContext.preloadModel,
    
    // Check if model is loaded
    isModelLoaded: preloadContext.isModelLoaded,
    
    // Check if model is currently loading
    isModelLoading: preloadContext.isModelLoading,
    
    // Get error for model
    getModelError: preloadContext.getModelError,
    
    // Clear all cached models
    clearCache: preloadContext.clearCache,
    
    // Preload all teeth models (Upper and Lower)
    preloadAllTeethModels: preloadContext.preloadAllTeethModels,
    
    // Convenience method to preload teeth models
    preloadTeethModels: () => {
      return preloadContext.preloadAllTeethModels()
    },
    
    // Get preload status for teeth models
    getTeethModelsStatus: () => {
      const upperLoaded = preloadContext.isModelLoaded('/images/glb/Upper_Teeth.glb')
      const lowerLoaded = preloadContext.isModelLoaded('/images/glb/Lower_Teeth.glb')
      const upperLoading = preloadContext.isModelLoading('/images/glb/Upper_Teeth.glb')
      const lowerLoading = preloadContext.isModelLoading('/images/glb/Lower_Teeth.glb')
      
      return {
        upper: { loaded: upperLoaded, loading: upperLoading },
        lower: { loaded: lowerLoaded, loading: lowerLoading },
        allLoaded: upperLoaded && lowerLoaded,
        anyLoading: upperLoading || lowerLoading
      }
    }
  }
}
