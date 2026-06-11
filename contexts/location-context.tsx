"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "./auth-context"
import { useToast } from "@/hooks/use-toast"

export interface Location {
  id: number
  name: string
  address?: string
  city?: string
  state?: string
  zipcode?: string
}

interface LocationContextType {
  locations: Location[] | null
  selectedLocation: number | null
  setSelectedLocation: (locationId: number) => void
  isLoading: boolean
  error: string | null
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

/** Prefer explicit header selection, then persisted customerId, then user profile. */
function resolvePreferredCustomerId(
  locations: Location[],
  user: { customer_id?: number } | null,
): number | null {
  if (!locations.length) return null

  const validIds = new Set(locations.map((loc) => loc.id))

  if (typeof window !== "undefined") {
    try {
      const selected = localStorage.getItem("selectedLocation")
      if (selected) {
        const parsed = JSON.parse(selected) as { id?: number }
        const id = Number(parsed?.id)
        if (validIds.has(id)) return id
      }
    } catch {
      // ignore parse errors
    }

    const storedCustomerId = localStorage.getItem("customerId")
    if (storedCustomerId) {
      const id = Number(storedCustomerId)
      if (validIds.has(id)) return id
    }
  }

  if (user?.customer_id && validIds.has(user.customer_id)) {
    return user.customer_id
  }

  return locations[0].id
}

function readInitialSelectedLocation(): number | null {
  if (typeof window === "undefined") return null
  try {
    const selected = localStorage.getItem("selectedLocation")
    if (selected) {
      const parsed = JSON.parse(selected) as { id?: number }
      const id = Number(parsed?.id)
      if (!Number.isNaN(id)) return id
    }
  } catch {
    // ignore
  }
  const storedCustomerId = localStorage.getItem("customerId")
  if (storedCustomerId) {
    const id = Number(storedCustomerId)
    if (!Number.isNaN(id)) return id
  }
  return null
}

export const useLocation = () => {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider")
  }
  return context
}

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocationState] = useState<number | null>(readInitialSelectedLocation)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { user, setCustomerId } = useAuth()
  const { toast } = useToast()
  const hasSyncedSessionRef = useRef(false)

  const setSelectedLocation = useCallback((locationId: number) => {
    setSelectedLocationState(locationId)
  }, [])

  useEffect(() => {
    hasSyncedSessionRef.current = false
  }, [user?.id])

  useEffect(() => {
    const loadLocations = async () => {
      if (!user || user.role === "superadmin") return

      setIsLoading(true)
      try {
        const customerLocations = (user.customers || []).map((customer: any) => ({
          id: customer.id,
          name: customer.name,
        }))

        setLocations(customerLocations)

        const preferredId = resolvePreferredCustomerId(customerLocations, user)
        if (preferredId !== null) {
          setSelectedLocationState(preferredId)

          const fullCustomer = (user.customers || []).find((c: any) => c.id === preferredId)
          if (fullCustomer && typeof window !== "undefined") {
            localStorage.setItem("selectedLocation", JSON.stringify(fullCustomer))
            localStorage.setItem("customerId", String(preferredId))
          }

          if (
            !hasSyncedSessionRef.current &&
            user.customer_id !== preferredId
          ) {
            hasSyncedSessionRef.current = true
            void setCustomerId(preferredId).catch((syncError) => {
              console.error("Failed to sync customer profile on load:", syncError)
            })
          }
        }
      } catch (error: any) {
        console.error("Error loading locations:", error)
        setError("Failed to load locations")
        toast({
          title: "Error",
          description: "Failed to load locations. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadLocations()
  }, [user, setCustomerId, toast])

  return (
    <LocationContext.Provider
      value={{
        locations,
        selectedLocation,
        setSelectedLocation,
        isLoading,
        error,
      }}
    >
      {children}
    </LocationContext.Provider>
  )
}
