"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
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

export const useLocation = () => {
  const context = useContext(LocationContext)
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider")
  }
  return context
}

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const loadLocations = async () => {
      if (!user || user.role === "superadmin") return

      setIsLoading(true)
      try {
        // Convert customers to locations
        const customerLocations = (user.customers || []).map((customer: any) => ({
          id: customer.id,
          name: customer.name,
        }))

        setLocations(customerLocations)

        // Set the first customer as the selected location if none is selected
        if (selectedLocation === null && customerLocations.length > 0) {
          setSelectedLocation(customerLocations[0].id)
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
  }, [user, selectedLocation, toast])

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
