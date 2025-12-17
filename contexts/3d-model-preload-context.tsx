"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
// Lazy load Three.js to prevent it from loading on login page
// These will only be imported when the provider is actually used
let GLTFLoader: any = null
let DRACOLoader: any = null

const loadThreeJS = async () => {
  if (GLTFLoader && DRACOLoader) return // Already loaded
  
  try {
    const [gltfModule, dracoModule] = await Promise.all([
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/loaders/DRACOLoader.js")
    ])
    GLTFLoader = gltfModule.GLTFLoader
    DRACOLoader = dracoModule.DRACOLoader
  } catch (error) {
    console.error('Failed to load Three.js loaders:', error)
  }
}

interface ModelCache {
  [key: string]: {
    gltf: any
    loaded: boolean
    error: string | null
    loading: boolean
  }
}

interface PreloadContextType {
  preloadModel: (url: string) => Promise<void>
  isModelLoaded: (url: string) => boolean
  isModelLoading: (url: string) => boolean
  getModelError: (url: string) => string | null
  clearCache: () => void
  preloadAllTeethModels: () => Promise<void>
}

const PreloadContext = createContext<PreloadContextType | undefined>(undefined)

// Setup DRACO loader (lazy loaded)
const setupDRACOLoader = async () => {
  if (typeof window === 'undefined') return null
  
  await loadThreeJS()
  
  if (!DRACOLoader) return null
  
  try {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco/')
    return dracoLoader
  } catch (error) {
    console.warn('DRACO loader setup failed:', error)
    return null
  }
}

export function ModelPreloadProvider({ children }: { children: React.ReactNode }) {
  const [modelCache, setModelCache] = useState<ModelCache>({})
  const loaderRef = useRef<any>(null) // GLTFLoader is lazy loaded, so use any type

  // Initialize loader (lazy load Three.js)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const initLoader = async () => {
      await loadThreeJS()
      
      if (!GLTFLoader) {
        console.warn('GLTFLoader not available')
        return
      }

      const loader = new GLTFLoader()
      const dracoLoader = await setupDRACOLoader()
      if (dracoLoader) {
        loader.setDRACOLoader(dracoLoader)
      }
      loaderRef.current = loader
    }

    initLoader()
  }, [])

  const preloadModel = async (url: string): Promise<void> => {
    if (!loaderRef.current) {
      console.warn('GLTF loader not initialized')
      return
    }

    // Check if already loaded or loading
    if (modelCache[url]?.loaded || modelCache[url]?.loading) {
      return
    }

    // Set loading state
    setModelCache(prev => ({
      ...prev,
      [url]: { gltf: null, loaded: false, error: null, loading: true }
    }))

    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        loaderRef.current!.load(
          url,
          resolve,
          undefined, // Progress callback
          reject
        )
      })

      // Set loaded state
      setModelCache(prev => ({
        ...prev,
        [url]: { gltf, loaded: true, error: null, loading: false }
      }))

      // 3D model preloaded successfully
    } catch (error) {
      console.error(`❌ Failed to preload 3D model: ${url}`, error)
      
      // Set error state
      setModelCache(prev => ({
        ...prev,
        [url]: { 
          gltf: null, 
          loaded: false, 
          error: error instanceof Error ? error.message : 'Unknown error', 
          loading: false 
        }
      }))
    }
  }

  const isModelLoaded = (url: string): boolean => {
    return modelCache[url]?.loaded || false
  }

  const isModelLoading = (url: string): boolean => {
    return modelCache[url]?.loading || false
  }

  const getModelError = (url: string): string | null => {
    return modelCache[url]?.error || null
  }

  const clearCache = () => {
    setModelCache({})
  }

  const preloadAllTeethModels = async (): Promise<void> => {
    const teethModelUrls = [
      '/images/glb/Upper_Teeth.glb',
      '/images/glb/Lower_Teeth.glb'
    ]

    // Starting background preload of teeth models
    
    try {
      await Promise.all(teethModelUrls.map(url => preloadModel(url)))
      // All teeth models preloaded successfully
    } catch (error) {
      console.error('❌ Failed to preload some teeth models:', error)
    }
  }

  // Auto-preload teeth models when the provider mounts
  useEffect(() => {
    // Only preload when user is on slip creation or case design pages
    const needs3DModels = window.location.pathname.includes('/case-design') || 
                          window.location.pathname.includes('/lab-case-management') ||
                          window.location.pathname.includes('/add-slip') ||
                          window.location.pathname.includes('/virtual-slip') ||
                          window.location.pathname.includes('/slip-creation') ||
                          window.location.pathname.includes('/create-slip');
    
    if (needs3DModels) {
      // Small delay to ensure the app is fully loaded
      const timer = setTimeout(() => {
        preloadAllTeethModels()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [])

  const value: PreloadContextType = {
    preloadModel,
    isModelLoaded,
    isModelLoading,
    getModelError,
    clearCache,
    preloadAllTeethModels
  }

  return (
    <PreloadContext.Provider value={value}>
      {children}
    </PreloadContext.Provider>
  )
}

export function useModelPreload() {
  const context = useContext(PreloadContext)
  if (context === undefined) {
    throw new Error('useModelPreload must be used within a ModelPreloadProvider')
  }
  return context
}
