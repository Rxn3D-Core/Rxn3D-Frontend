"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "./auth-context"
import { useToast } from "@/hooks/use-toast"
import { categorizeConnectionsForUser } from "@/lib/connection-utils"
import {
  fetchConnectionsApi,
  DEFAULT_CONNECTIONS_PER_PAGE,
  type ConnectionsPagination,
  type ConnectionsQueryParams,
} from "@/lib/connection-api"

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
  connected_since?: string
  created_at?: string
  updated_at?: string
  partner: Partner
}

export interface ConnectionsResponse {
  data: Connection[]
  total_connections: number
  pagination?: ConnectionsPagination
}

interface ConnectionContextType {
  connections: Connection[]
  practices: Connection[]
  labs: Connection[]
  totalConnections: number
  pagination: ConnectionsPagination | null
  isLoading: boolean
  error: string | null
  fetchConnections: (options?: ConnectionsQueryParams) => Promise<void>
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
  const [pagination, setPagination] = useState<ConnectionsPagination | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const { user, token: authToken } = useAuth()
  const { toast } = useToast()

  const categorizePracticesAndLabs = useCallback(
    (connections: Connection[]) => categorizeConnectionsForUser(connections, user),
    [user],
  )

  const redirectToLogin = () => {
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    window.location.href = "/login"
  }

  const fetchConnections = useCallback(async (options: ConnectionsQueryParams = {}) => {
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
      const data: ConnectionsResponse = await fetchConnectionsApi({
        userId: user.id,
        page: options.page ?? 1,
        perPage: options.perPage ?? DEFAULT_CONNECTIONS_PER_PAGE,
        search: options.search,
        sortBy: options.sortBy,
        sortOrder: options.sortOrder,
      })

      setConnections(data.data || [])
      setTotalConnections(data.total_connections || data.pagination?.total || 0)
      setPagination(data.pagination ?? null)

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
        pagination,
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
