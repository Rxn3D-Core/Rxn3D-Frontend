"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "./auth-context"
import { useToast } from "@/hooks/use-toast"

// Define types for the connection data
export interface Partner {
  id: number
  name: string
  email: string
  logo_url: string | null
  city: string
  state: string
}

export interface Connection {
  id: number
  name: string
  email: string
  status: string
  type?: string
  invited_by?: number
  created_at?: string
  updated_at?: string
  partner: Partner
}

export interface ConnectionsResponse {
  data: Connection[]
  total_connections: number
}

interface ConnectionContextType {
  connections: Connection[]
  practices: Connection[]
  labs: Connection[]
  totalConnections: number
  isLoading: boolean
  error: string | null
  fetchConnections: () => Promise<void>
  filterConnections: (status: string) => Connection[]
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined)

export const useConnection = () => {
  const context = useContext(ConnectionContext)
  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider")
  }
  return context
}

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connections, setConnections] = useState<Connection[]>([])
  const [practices, setPractices] = useState<Connection[]>([])
  const [labs, setLabs] = useState<Connection[]>([])
  const [totalConnections, setTotalConnections] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { user, token: authToken } = useAuth()
  const { toast } = useToast()

  // Helper function to determine if a connection is a practice or lab
  const categorizePracticesAndLabs = useCallback((connections: Connection[]) => {
    const practices: Connection[] = []
    const labs: Connection[] = []

    connections.forEach((connection) => {
      if (connection.partner.name) {
        labs.push(connection)
      } else {
        practices.push(connection)
      }
    })

    return { practices, labs }
  }, [])

  const redirectToLogin = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  const fetchConnections = useCallback(async () => {
    if (!user) return

    // Check token presence/expiry before fetching
    const token = localStorage.getItem("token")
    const expiresAt = localStorage.getItem("tokenExpiresAt")
    const now = Date.now()
    if (!token || (expiresAt && now > Number(expiresAt))) {
      redirectToLogin()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get token from localStorage
      const token = localStorage.getItem("token")

      // Prepare query parameters if needed
      const params = new URLSearchParams()
      if (user.id) {
        params.append("user_id", user.id.toString())
      }

      // Use the correct API endpoint path - use relative path for local API
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""
      const response = await fetch(
          `${API_BASE_URL}/connections`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

      if (response.status === 401) {
        redirectToLogin()
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch connections: ${response.status}`)
      }

      const data: ConnectionsResponse = await response.json()
      setConnections(data.data || [])
      setTotalConnections(data.total_connections || 0)

      // Categorize connections into practices and labs
      const { practices, labs } = categorizePracticesAndLabs(data.data || [])
      setPractices(practices)
      setLabs(labs)
    } catch (err: any) {
      console.error("Error fetching connections:", err)
      setError(err.message || "Failed to fetch connections")
      toast({
        title: "Error",
        description: "Failed to fetch connections. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, toast, categorizePracticesAndLabs])

  // Filter connections by status
  const filterConnections = useCallback(
    (status: string) => {
      return connections.filter((connection) => connection.status.toLowerCase() === status.toLowerCase())
    },
    [connections],
  )
  
  return (
    <ConnectionContext.Provider
      value={{
        connections,
        practices,
        labs,
        totalConnections,
        isLoading,
        error,
        fetchConnections,
        filterConnections,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  )
}
