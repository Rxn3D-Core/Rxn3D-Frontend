"use client"

import { useEffect, useMemo, useState } from "react"
import { Building, Calendar, MoreHorizontal, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useSlipNotes } from "@/hooks/use-slip-notes"
import {
  DEFAULT_SLIP_NOTE_TYPE,
  joinSlipNotesText,
  SLIP_NOTE_TYPE_OPTIONS,
  type SlipNote,
  type SlipNoteType,
} from "@/lib/api/slip-notes"

const MAX_NOTE_LENGTH = 2000

function slipNoteTypeLabel(type: string | undefined): string {
  const normalized = type?.toLowerCase().replace(/\s+/g, "_")
  const match = SLIP_NOTE_TYPE_OPTIONS.find((o) => o.value === normalized)
  if (match) return match.label
  if (!type) return "Internal"
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function normalizeSlipNoteType(type: string | undefined): SlipNoteType {
  const normalized = type?.toLowerCase().replace(/\s+/g, "_") as SlipNoteType
  if (SLIP_NOTE_TYPE_OPTIONS.some((o) => o.value === normalized)) {
    return normalized
  }
  return DEFAULT_SLIP_NOTE_TYPE
}

function formatNoteTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  })
}

interface SlipNotesModalProps {
  isOpen: boolean
  onClose: () => void
  slipId: number
  slipNumber?: string
  patientName?: string
  caseNumber?: string
  onNotesChanged?: (summaryText: string) => void
}

export function SlipNotesModal({
  isOpen,
  onClose,
  slipId,
  slipNumber,
  patientName,
  caseNumber,
  onNotesChanged,
}: SlipNotesModalProps) {
  const { notes, isLoading, isSaving, error, setError, load, addNote, editNote, removeNote } =
    useSlipNotes(slipId)

  const [searchTerm, setSearchTerm] = useState("")
  const [newNoteContent, setNewNoteContent] = useState("")
  const [newNoteType, setNewNoteType] = useState<SlipNoteType>(DEFAULT_SLIP_NOTE_TYPE)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editNoteType, setEditNoteType] = useState<SlipNoteType>(DEFAULT_SLIP_NOTE_TYPE)

  useEffect(() => {
    if (isOpen && slipId) {
      setError(null)
      void load()
    }
  }, [isOpen, slipId, load, setError])

  const notifyParent = (list: SlipNote[]) => {
    onNotesChanged?.(joinSlipNotesText(list))
  }

  const filteredNotes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(
      (n) =>
        n.note.toLowerCase().includes(q) ||
        n.added_by?.name?.toLowerCase().includes(q) ||
        n.added_by?.email?.toLowerCase().includes(q)
    )
  }, [notes, searchTerm])

  const handleAddNote = async () => {
    const text = newNoteContent.trim()
    if (!text) return
    const created = await addNote(text, newNoteType)
    if (created) {
      setNewNoteContent("")
      notifyParent([created, ...notes])
    }
  }

  const startEdit = (note: SlipNote) => {
    setEditingId(note.id)
    setEditContent(note.note)
    setEditNoteType(normalizeSlipNoteType(note.type))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent("")
    setEditNoteType(DEFAULT_SLIP_NOTE_TYPE)
  }

  const handleSaveEdit = async () => {
    if (editingId == null) return
    const updated = await editNote(editingId, editContent, editNoteType)
    if (updated) {
      cancelEdit()
      const next = notes.map((n) => (n.id === updated.id ? updated : n))
      notifyParent(next)
    }
  }

  const handleDelete = async (noteId: number) => {
    const ok = await removeNote(noteId)
    if (ok) {
      if (editingId === noteId) cancelEdit()
      notifyParent(notes.filter((n) => n.id !== noteId))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[90vh] max-w-3xl flex-col rounded-xl p-0 shadow-2xl">
        <DialogHeader className="flex-shrink-0 border-b p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
                <Building className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Slip notes</DialogTitle>
                <div className="mt-1 text-sm text-gray-500">
                  {patientName && (
                    <>
                      Patient:{" "}
                      <span className="font-medium text-gray-800">{patientName}</span>
                    </>
                  )}
                  {caseNumber && (
                    <>
                      {patientName && <span className="mx-2">•</span>}
                      Case:{" "}
                      <span className="font-medium text-gray-800">{caseNumber}</span>
                    </>
                  )}
                  {slipNumber && (
                    <>
                      {(patientName || caseNumber) && <span className="mx-2">•</span>}
                      Slip:{" "}
                      <span className="font-medium text-gray-800">{slipNumber}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden p-6">
          <div className="mb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search notes by text or author"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-lg py-2 pl-10"
              />
            </div>
          </div>

          <div className="mb-6 flex-shrink-0 rounded-lg border border-gray-300 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {slipNumber && (
                <Badge variant="secondary" className="bg-gray-200 text-xs text-gray-700">
                  Slip #: {slipNumber}
                </Badge>
              )}
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <label className="text-sm font-medium text-gray-700" htmlFor="new-slip-note-type">
                Note type
              </label>
              <Select
                value={newNoteType}
                onValueChange={(v) => setNewNoteType(v as SlipNoteType)}
              >
                <SelectTrigger id="new-slip-note-type" className="w-[180px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {SLIP_NOTE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Add a slip note..."
              value={newNoteContent}
              onChange={(e) =>
                setNewNoteContent(e.target.value.slice(0, MAX_NOTE_LENGTH))
              }
              rows={3}
              className="mb-3"
              maxLength={MAX_NOTE_LENGTH}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {newNoteContent.length}/{MAX_NOTE_LENGTH}
              </span>
              <Button
                onClick={() => void handleAddNote()}
                disabled={!newNoteContent.trim() || isSaving}
                className="bg-[#1162A8] text-white hover:bg-[#0f5490]"
              >
                Submit
              </Button>
            </div>
          </div>

          {error && (
            <p className="mb-4 flex-shrink-0 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="-mr-2 flex-1 overflow-y-auto pr-2">
            <h3 className="mb-4 text-base font-semibold">
              Notes history ({filteredNotes.length})
            </h3>
            {isLoading ? (
              <p className="py-8 text-center text-gray-500">Loading notes...</p>
            ) : filteredNotes.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No notes yet.</p>
            ) : (
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <div key={note.id} className="rounded-lg border bg-gray-50 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1 font-medium text-gray-800">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatNoteTimestamp(note.created_at)}
                        </span>
                        <span>{note.added_by?.name ?? "Unknown"}</span>
                        <Badge variant="secondary" className="bg-gray-200 text-xs text-gray-700">
                          {slipNoteTypeLabel(note.type)}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(note)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => void handleDelete(note.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {editingId === note.id ? (
                      <div className="space-y-2">
                        <Select
                          value={editNoteType}
                          onValueChange={(v) => setEditNoteType(v as SlipNoteType)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Note type" />
                          </SelectTrigger>
                          <SelectContent>
                            {SLIP_NOTE_TYPE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Textarea
                          value={editContent}
                          onChange={(e) =>
                            setEditContent(e.target.value.slice(0, MAX_NOTE_LENGTH))
                          }
                          rows={3}
                          maxLength={MAX_NOTE_LENGTH}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={cancelEdit}>
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="bg-[#1162A8] text-white hover:bg-[#0f5490]"
                            disabled={!editContent.trim() || isSaving}
                            onClick={() => void handleSaveEdit()}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm text-gray-800">{note.note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
