import { useState, useEffect, useCallback } from "react"

export interface SessionHistoryItem {
  identifier: string
  timestamp: number
  displayName?: string
}

const MAX_SESSION_HISTORY = 3

export function useSessionHistory() {
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([])

  useEffect(() => {
    try {
      const storedSessionHistory = localStorage.getItem("sessionHistory")
      if (storedSessionHistory && storedSessionHistory !== "undefined") {
        setSessionHistory(JSON.parse(storedSessionHistory))
      }
    } catch (e) {
      localStorage.removeItem("sessionHistory")
    }
  }, [])

  // Update session history
  const updateSessionHistory = useCallback((identifier: string, user?: { first_name: string; last_name: string }) => {
    // Create new session item
    const newSession: SessionHistoryItem = {
      identifier,
      timestamp: Date.now(),
      displayName: user ? `${user.first_name} ${user.last_name}` : undefined,
    }

    // Remove existing entry with same identifier if exists
    const filteredHistory = sessionHistory.filter((session) => session.identifier !== identifier)

    // Add new session at the beginning and limit to MAX_SESSION_HISTORY items
    const updatedHistory = [newSession, ...filteredHistory].slice(0, MAX_SESSION_HISTORY)

    // Update state and localStorage
    setSessionHistory(updatedHistory)
    localStorage.setItem("sessionHistory", JSON.stringify(updatedHistory))
  }, [sessionHistory])

  // Clear session history
  const clearSessionHistory = useCallback(() => {
    setSessionHistory([])
    localStorage.removeItem("sessionHistory")
  }, [])

  return {
    sessionHistory,
    updateSessionHistory,
    clearSessionHistory,
  }
}
