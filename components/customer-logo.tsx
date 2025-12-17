"use client"

import { useCustomerLogoStore } from "@/stores/customer-logo-store"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface CustomerLogoProps {
  customerId: number | string | null | undefined
  alt?: string
  className?: string
}

/**
 * Component that displays a customer logo from localStorage only
 * Shows loading state while checking localStorage
 */
export function CustomerLogo({
  customerId,
  alt = "Logo",
  className,
}: CustomerLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const initializeFromStorage = useCustomerLogoStore((state) => state.initializeFromStorage)
  const customerIdStr = customerId ? String(customerId) : null
  const storeLogoUrl = useCustomerLogoStore((state) => 
    customerIdStr ? state.logos[customerIdStr] || null : null
  )

  // Initialize and load logo from localStorage
  useEffect(() => {
    const loadLogo = () => {
      // Initialize store from localStorage first (like sidebar does)
      if (typeof window !== 'undefined') {
        initializeFromStorage()
      }
      
      setIsLoading(true)
      
      // Check store first (after initialization)
      if (storeLogoUrl) {
        setLogoUrl(storeLogoUrl)
        setIsLoading(false)
        return
      }

      // Then check localStorage directly
      if (customerId && typeof window !== 'undefined') {
        const customerIdStr = String(customerId)
        // Check specific customer logo first, then generic customerLogo key
        const directLogo = localStorage.getItem(`customerLogo_${customerIdStr}`) || 
                          localStorage.getItem("customerLogo")
        setLogoUrl(directLogo)
      } else {
        setLogoUrl(null)
      }
      
      setIsLoading(false)
    }

    loadLogo()

    // Listen for storage changes (in case logo is updated elsewhere)
    if (typeof window !== 'undefined') {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === `customerLogo_${customerId}` || e.key === "customerLogo") {
          loadLogo()
        }
      }
      window.addEventListener('storage', handleStorageChange)
      return () => window.removeEventListener('storage', handleStorageChange)
    }
  }, [customerId, storeLogoUrl, initializeFromStorage])

  // Show loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-100 animate-pulse", className)}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-1/2 h-1/2 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  // Don't render anything if no logo
  if (!logoUrl) {
    return null
  }

  return (
    <img
      src={logoUrl}
      alt={alt}
      className={cn("object-contain", className)}
      onError={(e) => {
        // Hide image if it fails to load
        const target = e.target as HTMLImageElement
        target.style.display = 'none'
      }}
    />
  )
}


