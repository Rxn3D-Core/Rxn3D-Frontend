"use client"

import { useRef, useEffect } from "react"

// Custom hook to prevent unnecessary re-renders
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
  let timeout: ReturnType<typeof setTimeout> | null = null

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

// Measure component render time
export function useRenderTime(componentName: string) {
  useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
    }
  })
}
