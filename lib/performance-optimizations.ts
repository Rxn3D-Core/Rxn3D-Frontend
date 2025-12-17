"use client"

import { useRef, useEffect, useCallback, useMemo, useState } from "react"

// Custom hook to prevent unnecessary re-renders with deep comparison
export function useDeepCompareMemoize<T>(value: T): T {
  const ref = useRef<T>(value)

  // Only update the ref if the value has deeply changed
  if (JSON.stringify(value) !== JSON.stringify(ref.current)) {
    ref.current = value
  }

  return ref.current
}

// Debounce function to limit how often a function is called
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

// Throttle function to limit function execution frequency
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Measure component render time
export function useRenderTime(componentName: string) {
  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
    }
  })
}

// Custom hook for lazy loading components
export function useLazyLoad<T>(factory: () => Promise<T>, deps: any[] = []) {
  const [component, setComponent] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    
    factory()
      .then(setComponent)
      .catch(setError)
      .finally(() => setLoading(false))
  }, deps)

  return { component, loading, error }
}

// Custom hook for intersection observer (lazy loading)
export function useIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(callback, options)
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [callback, options])

  return observerRef.current
}

// Custom hook for virtual scrolling optimization
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    )
    
    return {
      start: Math.max(0, start - overscan),
      end
    }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end)
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.start * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  }
}

// Custom hook for memoized expensive calculations
export function useMemoizedCalculation<T>(
  calculation: () => T,
  dependencies: any[],
  equalityFn?: (prev: T, next: T) => boolean
): T {
  const memoizedValue = useMemo(calculation, dependencies)
  
  if (equalityFn) {
    const prevValueRef = useRef<T>(memoizedValue)
    const currentValue = memoizedValue
    
    if (!equalityFn(prevValueRef.current, currentValue)) {
      prevValueRef.current = currentValue
    }
    
    return prevValueRef.current
  }
  
  return memoizedValue
}

// Custom hook for optimized event handlers
export function useOptimizedHandler<T extends (...args: any[]) => any>(
  handler: T,
  dependencies: any[] = []
): T {
  return useCallback(handler, dependencies) as T
}

// Custom hook for localStorage with performance optimization
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  serialize: (value: T) => string = JSON.stringify,
  deserialize: (value: string) => T = JSON.parse
) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue
    }
    
    try {
      const item = window.localStorage.getItem(key)
      return item ? deserialize(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, serialize(valueToStore))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, serialize, storedValue])

  return [storedValue, setValue] as const
}

// Performance monitoring utilities
export const PerformanceMonitor = {
  // Measure function execution time
  measureTime: <T>(fn: () => T, label: string): T => {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    return result
  },

  // Measure async function execution time
  measureAsyncTime: async <T>(fn: () => Promise<T>, label: string): Promise<T> => {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    return result
  },

  // Get memory usage (if available)
  getMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      }
    }
    return null
  }
}

// Image optimization utilities
export const ImageOptimizer = {
  // Lazy load images with intersection observer
  useLazyImage: (src: string, placeholder?: string) => {
    const [imageSrc, setImageSrc] = useState(placeholder || src)
    const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null)

    useEffect(() => {
      let observer: IntersectionObserver

      if (imageRef && placeholder) {
        observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setImageSrc(src)
              observer.unobserve(imageRef)
            }
          },
          { threshold: 0.1 }
        )
        observer.observe(imageRef)
      }

      return () => {
        if (observer) {
          observer.disconnect()
        }
      }
    }, [imageRef, src, placeholder])

    return { imageSrc, setImageRef }
  },

  // Preload critical images
  preloadImage: (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = reject
      img.src = src
    })
  }
}

// Bundle optimization utilities
export const BundleOptimizer = {
  // Dynamic import with loading state
  useDynamicImport: <T>(importFn: () => Promise<T>) => {
    const [component, setComponent] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
      setLoading(true)
      setError(null)
      
      importFn()
        .then(setComponent)
        .catch(setError)
        .finally(() => setLoading(false))
    }, [importFn])

    return { component, loading, error }
  }
} 