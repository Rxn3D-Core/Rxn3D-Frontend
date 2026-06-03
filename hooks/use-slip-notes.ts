"use client"

import { useCallback, useState } from "react"
import {
  createSlipNote,
  deleteSlipNote,
  getSlipNotes,
  updateSlipNote,
  type SlipNote,
  type SlipNotesListParams,
} from "@/lib/api/slip-notes"

export function useSlipNotes(slipId: number | null) {
  const [notes, setNotes] = useState<SlipNote[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (params?: SlipNotesListParams) => {
      if (!slipId) {
        setNotes([])
        return []
      }

      setIsLoading(true)
      setError(null)
      try {
        const list = await getSlipNotes(slipId, params)
        setNotes(list)
        return list
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load slip notes"
        setError(message)
        setNotes([])
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [slipId]
  )

  const addNote = useCallback(
    async (text: string) => {
      if (!slipId || !text.trim()) return null

      setIsSaving(true)
      setError(null)
      try {
        const created = await createSlipNote(slipId, text.trim())
        setNotes((prev) => [created, ...prev])
        return created
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create note"
        setError(message)
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [slipId]
  )

  const editNote = useCallback(async (noteId: number, text: string) => {
    if (!text.trim()) return null

    setIsSaving(true)
    setError(null)
    try {
      const updated = await updateSlipNote(noteId, text.trim())
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)))
      return updated
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update note"
      setError(message)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [])

  const removeNote = useCallback(async (noteId: number) => {
    setIsSaving(true)
    setError(null)
    try {
      await deleteSlipNote(noteId)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      return true
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete note"
      setError(message)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [])

  return {
    notes,
    isLoading,
    isSaving,
    error,
    setError,
    load,
    addNote,
    editNote,
    removeNote,
  }
}
