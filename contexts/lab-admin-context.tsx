"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export type HistoryAction = "create" | "update" | "delete"

export interface HistoryEntry {
  id: string
  timestamp: Date
  user: string
  action: HistoryAction
  itemType: "category" | "product" | "stage" | "addon" | "category-addon"
  itemName: string
  details: string
}

interface LabAdminContextType {
  history: HistoryEntry[]
  addHistoryEntry: (entry: Omit<HistoryEntry, "id" | "timestamp">) => void
  duplicateHistoryEntry: (entryId: string) => void
  clearHistory: () => void
}

// Create dummy history data
const createDummyHistoryData = (): HistoryEntry[] => {
  return [
    {
      id: "1",
      timestamp: new Date(2025, 2, 15, 9, 30),
      user: "Admin User",
      action: "create",
      itemType: "category",
      itemName: "Implants",
      details: "Created new lower category: Implants",
    },
    {
      id: "2",
      timestamp: new Date(2025, 2, 15, 10, 15),
      user: "Admin User",
      action: "create",
      itemType: "product",
      itemName: "Titanium Implant",
      details: "Created new lower product: Titanium Implant (Implants) - $450",
    },
    {
      id: "3",
      timestamp: new Date(2025, 2, 14, 14, 45),
      user: "Admin User",
      action: "update",
      itemType: "product",
      itemName: "PFM Crown",
      details: "Updated price from $225 to $250 for product: PFM Crown",
    },
    {
      id: "4",
      timestamp: new Date(2025, 2, 14, 16, 20),
      user: "Admin User",
      action: "delete",
      itemType: "addon",
      itemName: "Basic Finish",
      details: "Deleted add-on: Basic Finish",
    },
    {
      id: "5",
      timestamp: new Date(2025, 2, 13, 11, 10),
      user: "Admin User",
      action: "create",
      itemType: "stage",
      itemName: "Final Impression",
      details: "Created new stage: Final Impression for product category Crowns",
    },
    {
      id: "6",
      timestamp: new Date(2025, 2, 13, 13, 30),
      user: "Admin User",
      action: "create",
      itemType: "category-addon",
      itemName: "Premium Finish",
      details: "Created new category add-on: Premium Finish for category Crowns - $50",
    },
    {
      id: "7",
      timestamp: new Date(2025, 2, 12, 9, 15),
      user: "Admin User",
      action: "update",
      itemType: "stage",
      itemName: "Wax Try-in",
      details: "Updated stage description for: Wax Try-in",
    },
    {
      id: "8",
      timestamp: new Date(2025, 2, 12, 10, 45),
      user: "Admin User",
      action: "delete",
      itemType: "category",
      itemName: "Temporary Crowns",
      details: "Deleted upper category: Temporary Crowns",
    },
    {
      id: "9",
      timestamp: new Date(2025, 2, 11, 15, 20),
      user: "Admin User",
      action: "create",
      itemType: "addon",
      itemName: "Extended Warranty",
      details: "Created new add-on: Extended Warranty - $75",
    },
    {
      id: "10",
      timestamp: new Date(2025, 2, 11, 16, 30),
      user: "Admin User",
      action: "update",
      itemType: "category-addon",
      itemName: "Color Matching",
      details: "Updated price from $50 to $60 for category add-on: Color Matching",
    },
    {
      id: "11",
      timestamp: new Date(2025, 2, 10, 9, 45),
      user: "Admin User",
      action: "create",
      itemType: "product",
      itemName: "Zirconia Crown",
      details: "Created new upper product: Zirconia Crown (Crowns) - $300",
    },
    {
      id: "12",
      timestamp: new Date(2025, 2, 10, 11, 20),
      user: "Admin User",
      action: "delete",
      itemType: "stage",
      itemName: "Preliminary Impression",
      details: "Deleted stage: Preliminary Impression",
    },
    {
      id: "13",
      timestamp: new Date(2025, 2, 9, 14, 10),
      user: "Admin User",
      action: "update",
      itemType: "addon",
      itemName: "Comfort Fit",
      details: "Updated description for add-on: Comfort Fit",
    },
    {
      id: "14",
      timestamp: new Date(2025, 2, 9, 16, 45),
      user: "Admin User",
      action: "create",
      itemType: "category",
      itemName: "Veneers",
      details: "Created new lower category: Veneers",
    },
    {
      id: "15",
      timestamp: new Date(2025, 2, 8, 10, 30),
      user: "Admin User",
      action: "create",
      itemType: "product",
      itemName: "Porcelain Veneer",
      details: "Created new lower product: Porcelain Veneer (Veneers) - $350",
    },
    {
      id: "16",
      timestamp: new Date(2025, 2, 8, 13, 15),
      user: "Admin User",
      action: "update",
      itemType: "category",
      itemName: "Bridges",
      details: "Updated description for category: Bridges",
    },
    {
      id: "17",
      timestamp: new Date(2025, 2, 7, 9, 20),
      user: "Admin User",
      action: "create",
      itemType: "category-addon",
      itemName: "Extended Warranty",
      details: "Created new category add-on: Extended Warranty for category Bridges - $75",
    },
    {
      id: "18",
      timestamp: new Date(2025, 2, 7, 11, 40),
      user: "Admin User",
      action: "delete",
      itemType: "product",
      itemName: "Temporary Bridge",
      details: "Deleted upper product: Temporary Bridge",
    },
    {
      id: "19",
      timestamp: new Date(2025, 2, 6, 15, 25),
      user: "Admin User",
      action: "create",
      itemType: "stage",
      itemName: "Bite Registration",
      details: "Created new stage: Bite Registration for product category Dentures",
    },
    {
      id: "20",
      timestamp: new Date(2025, 2, 6, 16, 50),
      user: "Admin User",
      action: "update",
      itemType: "category-addon",
      itemName: "Titanium Upgrade",
      details: "Updated price from $100 to $120 for category add-on: Titanium Upgrade",
    },
  ]
}

const LabAdminContext = createContext<LabAdminContextType | undefined>(undefined)

export function LabAdminProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Load history from localStorage on initial render
  useEffect(() => {
    const savedHistory = localStorage.getItem("labAdminHistory")
    let initialHistory: HistoryEntry[] = []

    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        // Convert string timestamps back to Date objects
        initialHistory = parsedHistory.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }))
      } catch (error) {
        console.error("Failed to parse lab admin history:", error)
        initialHistory = createDummyHistoryData()
      }
    } else {
      initialHistory = createDummyHistoryData()
    }

    // Always set the history, whether from localStorage or dummy data
    setHistory(initialHistory)
  }, [])

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("labAdminHistory", JSON.stringify(history))
    }
  }, [history])

  const addHistoryEntry = (entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }
    setHistory((prev) => [newEntry, ...prev])
  }

  const duplicateHistoryEntry = (entryId: string) => {
    const entryToDuplicate = history.find((entry) => entry.id === entryId)
    if (entryToDuplicate) {
      const duplicatedEntry: HistoryEntry = {
        ...entryToDuplicate,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        details: `${entryToDuplicate.details} (Duplicated)`,
      }
      setHistory((prev) => [duplicatedEntry, ...prev])
    }
  }

  const clearHistory = () => {
    setHistory([])
  }

  return (
    <LabAdminContext.Provider value={{ history, addHistoryEntry, duplicateHistoryEntry, clearHistory }}>
      {children}
    </LabAdminContext.Provider>
  )
}

export function useLabAdmin() {
  const context = useContext(LabAdminContext)
  if (context === undefined) {
    throw new Error("useLabAdmin must be used within a LabAdminProvider")
  }
  return context
}
