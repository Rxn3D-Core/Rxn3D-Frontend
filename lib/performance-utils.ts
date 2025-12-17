"use client"

import React, { useCallback, useMemo, useRef, useEffect, useState } from "react"

/**
 * Performance optimization utilities for React components
 */

// Debounce hook for search inputs and API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle hook for scroll events and frequent updates
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now())

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args)
        lastRun.current = Date.now()
      }
    }) as T,
    [callback, delay]
  )
}

// Memoized object creation to prevent unnecessary re-renders
export function useMemoizedObject<T extends Record<string, any>>(obj: T): T {
  return useMemo(() => obj, Object.values(obj))
}

// Memoized array creation
export function useMemoizedArray<T>(arr: T[]): T[] {
  return useMemo(() => arr, arr)
}

// Optimized event handler creator
export function useOptimizedHandler<T extends (...args: any[]) => any>(
  handler: T,
  deps: React.DependencyList
): T {
  return useCallback(handler, deps)
}

// Performance monitoring hook
export function useRenderTime(componentName: string) {
  const renderStart = useRef<number>(0)
  
  useEffect(() => {
    renderStart.current = performance.now()
  })

  useEffect(() => {
    const renderTime = performance.now() - renderStart.current
    if (renderTime > 16) { // More than one frame (16ms)
      console.warn(`🐌 Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`)
    }
  })
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      options
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [elementRef, options])

  return isIntersecting
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    )

    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
    }))
  }, [items, itemHeight, containerHeight, scrollTop, overscan])

  const totalHeight = items.length * itemHeight
  const offsetY = Math.floor(scrollTop / itemHeight) * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
  }
}

// Component performance wrapper
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return React.memo((props: P) => {
    return React.createElement(Component, props)
  })
}

// Batch state updates to prevent multiple re-renders
export function useBatchedUpdates() {
  const [, forceUpdate] = useState({})
  const updatesRef = useRef<(() => void)[]>([])

  const batchUpdate = useCallback((update: () => void) => {
    updatesRef.current.push(update)
    
    // Use setTimeout to batch updates
    setTimeout(() => {
      if (updatesRef.current.length > 0) {
        updatesRef.current.forEach(update => update())
        updatesRef.current = []
        forceUpdate({})
      }
    }, 0)
  }, [])

  return batchUpdate
}

// Memory-efficient list rendering
export function useOptimizedList<T>(
  items: T[],
  keyExtractor: (item: T, index: number) => string | number,
  renderItem: (item: T, index: number) => React.ReactNode
) {
  const memoizedItems = useMemo(() => 
    items.map((item, index) => ({
      key: keyExtractor(item, index),
      item,
      index,
      element: renderItem(item, index)
    }))
  , [items, keyExtractor, renderItem])

  return memoizedItems
}

// Conditional rendering optimization
export function useConditionalRender<T>(
  condition: boolean,
  trueValue: T,
  falseValue: T
): T {
  return useMemo(() => condition ? trueValue : falseValue, [condition, trueValue, falseValue])
}

