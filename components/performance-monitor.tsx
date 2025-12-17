"use client"

import { useEffect, useState } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  bundleSize: number
  chunkCount: number
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only show in development or when explicitly enabled
    const shouldShow = process.env.NODE_ENV === 'development' || 
                      localStorage.getItem('showPerformanceMonitor') === 'true'
    
    if (!shouldShow) return

    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      const loadTime = navigation ? navigation.loadEventEnd - navigation.fetchStart : 0
      const renderTime = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      
      // Estimate bundle size from loaded resources
      const resources = performance.getEntriesByType('resource')
      const bundleSize = resources
        .filter(resource => resource.name.includes('.js'))
        .reduce((total, resource) => total + (resource.transferSize || 0), 0)
      
      const chunkCount = resources.filter(resource => 
        resource.name.includes('.js') && resource.name.includes('chunk')
      ).length

      setMetrics({
        loadTime: Math.round(loadTime),
        renderTime: Math.round(renderTime),
        bundleSize: Math.round(bundleSize / 1024), // Convert to KB
        chunkCount
      })
    }

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance()
    } else {
      window.addEventListener('load', measurePerformance)
    }

    return () => {
      window.removeEventListener('load', measurePerformance)
    }
  }, [])

  // Toggle visibility with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev)
        localStorage.setItem('showPerformanceMonitor', (!isVisible).toString())
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isVisible])

  if (!metrics || !isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">Performance Monitor</span>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>
      <div className="space-y-1">
        <div>Load Time: <span className="text-green-400">{metrics.loadTime}ms</span></div>
        <div>Render Time: <span className="text-blue-400">{metrics.renderTime}ms</span></div>
        <div>Bundle Size: <span className="text-yellow-400">{metrics.bundleSize}KB</span></div>
        <div>Chunks: <span className="text-purple-400">{metrics.chunkCount}</span></div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-600 text-gray-400">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  )
}

// Hook to measure component render performance
export function useRenderPerformance(componentName: string) {
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      if (renderTime > 16) { // More than one frame
        console.warn(`🐌 Slow render in ${componentName}: ${renderTime.toFixed(2)}ms`)
      }
    }
  })
}

// Hook to measure bundle loading
export function useBundlePerformance() {
  const [loadingTime, setLoadingTime] = useState<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    
    const handleLoad = () => {
      const endTime = performance.now()
      setLoadingTime(endTime - startTime)
    }

    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
    }

    return () => {
      window.removeEventListener('load', handleLoad)
    }
  }, [])

  return loadingTime
}
