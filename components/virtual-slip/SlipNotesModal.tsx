"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Filter,
  Loader2,
  Paperclip,
  Pencil,
  Search,
  Upload,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCaseSlipNotes } from "@/hooks/use-case-slip-notes"
import { useSlipNotes } from "@/hooks/use-slip-notes"
import {
  formatSlipStageTabLabel,
  resolveStageTabLabel,
  slipNoteAuthorName,
  type CaseNoteStageSeed,
  type CaseSlipWithNotes,
  type SlipNoteDetail,
} from "@/lib/api/slip-notes"
import { cn } from "@/lib/utils"

const MAX_NOTE_LENGTH = 2000
const STICKY_NOTE_ICON = "/icons/virtual-slip-center/add-notes.svg"

function formatStageNoteTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const date = d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  })
  const time = d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s/g, "")
    .toLowerCase()
  return `${date} @ ${time}`
}

function formatDeliveryBadge(date: string, time?: string): string {
  const d = date.trim()
  const t = time?.trim()
  if (!d) return t ?? ""
  return t ? `${d} @ ${t.toUpperCase()}` : d
}

function resolveNoteStageLabel(
  note: SlipNoteDetail,
  slips: CaseSlipWithNotes[]
): string {
  const slip = slips.find((s) => s.id === note.slip_id)
  if (slip) {
    const fromProducts = formatSlipStageTabLabel(slip.products)
    if (fromProducts) return fromProducts
  }
  return resolveStageTabLabel(note.stage) ?? "—"
}

function MetaBadge({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[#D1D5DB] bg-white px-2.5 py-0.5 text-xs font-normal text-[#374151]",
        className
      )}
    >
      {children}
    </span>
  )
}

function NoteHistoryEntry({
  note,
  slips,
  currentSlipId,
  deliveryBadge,
  isRush,
  index,
  onEdit,
}: {
  note: SlipNoteDetail
  slips: CaseSlipWithNotes[]
  currentSlipId: number
  deliveryBadge: string
  isRush: boolean
  index: number
  onEdit?: (note: SlipNoteDetail) => void
}) {
  const timestamp = formatStageNoteTimestamp(note.created_at)
  const author = slipNoteAuthorName(note)
  const slipNum = note.slip_number?.trim()
  const stageLabel = resolveNoteStageLabel(note, slips)
  const showDelivery = note.slip_id === currentSlipId && deliveryBadge
  const canEdit = note.slip_id === currentSlipId
  const hasAttachments =
    note.has_attachments ||
    (note.attachments_count != null && note.attachments_count > 0) ||
    (note.attachments?.length ?? 0) > 0
  return (
    <div
      className={cn(
        index === 0
          ? "mb-1 rounded-lg bg-[#F3F4F6] px-4 py-4"
          : "py-4"
      )}
    >
      <div className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-snug">
        <span className="italic text-[#9CA3AF]">{timestamp}</span>
        <span className="font-bold text-[#111827]">{author}</span>
        {slipNum ? <MetaBadge>Slip # {slipNum}</MetaBadge> : null}
        <MetaBadge>{stageLabel}</MetaBadge>
        {showDelivery ? (
          <MetaBadge>
            {isRush ? (
              <Zap
                className="h-3 w-3 fill-[#F97316] text-[#F97316]"
                aria-hidden
              />
            ) : null}
            {deliveryBadge}
          </MetaBadge>
        ) : null}
        {hasAttachments ? (
          <Paperclip
            className="h-4 w-4 text-[#6B7280]"
            aria-label="Has attachments"
          />
        ) : null}
        {canEdit && onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="inline-flex text-[#1162A8] hover:opacity-80"
            aria-label="Edit note"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#111827]">
        {note.note}
      </p>
    </div>
  )
}

function NotesHistoryList({
  notes,
  slips,
  currentSlipId,
  deliveryBadge,
  isRush,
  isLoading,
  emptyMessage = "No stage notes yet.",
  onEdit,
  className,
}: {
  notes: SlipNoteDetail[]
  slips: CaseSlipWithNotes[]
  currentSlipId: number
  deliveryBadge: string
  isRush: boolean
  isLoading: boolean
  emptyMessage?: string
  onEdit?: (note: SlipNoteDetail) => void
  className?: string
}) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <h3 className="mb-3 shrink-0 text-base font-bold text-[#111827]">
        Notes History
      </h3>
      <div className="-mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[#6B7280]">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading notes…
          </div>
        ) : notes.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#6B7280]">
            {emptyMessage}
          </p>
        ) : (
          <div>
            {notes.map((note, index) => (
              <NoteHistoryEntry
                key={note.id}
                note={note}
                slips={slips}
                currentSlipId={currentSlipId}
                deliveryBadge={deliveryBadge}
                isRush={isRush}
                index={index}
                onEdit={onEdit}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface SlipNotesModalProps {
  isOpen: boolean
  onClose: () => void
  slipId: number
  caseId?: number | null
  slipNumber?: string
  patientName?: string
  caseNumber?: string
  stageLabel?: string
  deliveryDateDisplay?: string
  deliveryTimeDisplay?: string
  isRush?: boolean
  notesRefreshKey?: number
  stageSeeds?: CaseNoteStageSeed[]
  onNotesChanged?: (summaryText: string) => void
}

export function SlipNotesModal({
  isOpen,
  onClose,
  slipId,
  caseId = null,
  slipNumber,
  stageLabel = "",
  deliveryDateDisplay = "",
  deliveryTimeDisplay = "",
  isRush = false,
  notesRefreshKey = 0,
  stageSeeds = [],
  onNotesChanged,
}: SlipNotesModalProps) {
  const {
    notes: caseNotesFromApi,
    slips,
    isLoading: isCaseNotesLoading,
    error: caseNotesError,
    refetch: refetchCaseNotes,
  } = useCaseSlipNotes(caseId, {
    enabled: isOpen && !!caseId,
    refreshKey: notesRefreshKey,
  })

  const {
    notes: slipOnlyNotes,
    isLoading: isSlipNotesLoading,
    isSaving,
    error: saveError,
    addNote,
    editNote,
    setError,
    load: loadSlipNotes,
  } = useSlipNotes(slipId)

  useEffect(() => {
    if (isOpen && slipId && !caseId) {
      void loadSlipNotes()
    }
  }, [isOpen, slipId, caseId, loadSlipNotes])

  const caseNotes = useMemo((): SlipNoteDetail[] => {
    if (caseId) {
      if (caseNotesFromApi.length > 0) return caseNotesFromApi
      const fromSlips = slips.flatMap((s) => s.notes ?? [])
      const byId = new Map<number, SlipNoteDetail>()
      for (const note of fromSlips) {
        byId.set(note.id, note)
      }
      return Array.from(byId.values())
    }
    return slipOnlyNotes.map((note) => ({
      id: note.id,
      type: note.type ?? "stage",
      note: note.note,
      slip_id: slipId,
      slip_number: slipNumber,
      created_at: note.created_at,
      updated_at: note.updated_at,
      added_by: note.added_by,
      created_by: note.added_by,
    }))
  }, [caseId, caseNotesFromApi, slips, slipOnlyNotes, slipId, slipNumber])

  const isHistoryLoading = caseId ? isCaseNotesLoading : isSlipNotesLoading

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState("")
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [filterUser, setFilterUser] = useState("all")
  const [filterDateRange, setFilterDateRange] = useState("all")
  const [filterAttachments, setFilterAttachments] = useState("all")

  const deliveryBadge = useMemo(
    () => formatDeliveryBadge(deliveryDateDisplay, deliveryTimeDisplay),
    [deliveryDateDisplay, deliveryTimeDisplay]
  )

  void stageSeeds

  const uniqueAuthors = useMemo(() => {
    const names = new Set<string>()
    for (const note of caseNotes) {
      const name = slipNoteAuthorName(note)
      if (name && name !== "Unknown") names.add(name)
    }
    return Array.from(names).sort()
  }, [caseNotes])

  const filteredNotes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000

    return caseNotes
      .filter((note) => {
        if (q) {
          const haystack = [
            note.note,
            slipNoteAuthorName(note),
            note.slip_number,
            resolveNoteStageLabel(note, slips),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
          if (!haystack.includes(q)) return false
        }

        if (filterUser !== "all") {
          if (slipNoteAuthorName(note) !== filterUser) return false
        }

        if (filterDateRange === "today") {
          const d = new Date(note.created_at)
          const today = new Date()
          if (
            d.getFullYear() !== today.getFullYear() ||
            d.getMonth() !== today.getMonth() ||
            d.getDate() !== today.getDate()
          ) {
            return false
          }
        } else if (filterDateRange === "last-7-days") {
          const t = new Date(note.created_at).getTime()
          if (Number.isNaN(t) || t < weekAgo) return false
        }

        const hasAttachments =
          note.has_attachments ||
          (note.attachments_count != null && note.attachments_count > 0) ||
          (note.attachments?.length ?? 0) > 0

        if (filterAttachments === "yes" && !hasAttachments) return false
        if (filterAttachments === "no" && hasAttachments) return false

        return true
      })
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }, [
    caseNotes,
    searchTerm,
    filterUser,
    filterDateRange,
    filterAttachments,
    slips,
  ])

  const resetCompose = useCallback(() => {
    setIsAddingNote(false)
    setNewNoteContent("")
    setEditingNoteId(null)
    setError(null)
  }, [setError])

  useEffect(() => {
    if (!isOpen) {
      resetCompose()
      setSearchTerm("")
      setFilterUser("all")
      setFilterDateRange("all")
      setFilterAttachments("all")
      setShowFilterPopover(false)
    }
  }, [isOpen, resetCompose])

  const handleStartAdd = () => {
    setEditingNoteId(null)
    setNewNoteContent("")
    setIsAddingNote(true)
  }

  const handleStartEdit = (note: SlipNoteDetail) => {
    setEditingNoteId(note.id)
    setNewNoteContent(note.note)
    setIsAddingNote(true)
  }

  const handleCancelCompose = () => {
    resetCompose()
  }

  const handleDone = async () => {
    const text = newNoteContent.trim()
    if (!text) {
      resetCompose()
      return
    }

    const saved = editingNoteId
      ? await editNote(editingNoteId, text, "stage")
      : await addNote(text, "stage")

    if (saved) {
      if (caseId) {
        await refetchCaseNotes()
      } else {
        await loadSlipNotes()
      }
      onNotesChanged?.(text)
      resetCompose()
    }
  }

  const handleResetFilters = () => {
    setFilterUser("all")
    setFilterDateRange("all")
    setFilterAttachments("all")
    setShowFilterPopover(false)
  }

  const displayError = saveError ?? caseNotesError

  const historyEmptyMessage =
    caseNotes.length === 0
      ? "No stage notes yet."
      : "No notes match your search or filters."

  const composeBadges = (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {slipNumber ? <MetaBadge>Slip # {slipNumber}</MetaBadge> : null}
      {stageLabel ? <MetaBadge>{stageLabel}</MetaBadge> : null}
      {deliveryBadge ? (
        <MetaBadge>
          {isRush ? (
            <Zap
              className="h-3 w-3 fill-[#F97316] text-[#F97316]"
              aria-hidden
            />
          ) : null}
          {deliveryBadge}
        </MetaBadge>
      ) : null}
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "flex h-[90vh] flex-col gap-0 rounded-[20px] border border-[#E5E7EB] p-0 shadow-2xl",
          isAddingNote ? "max-w-6xl" : "max-w-3xl"
        )}
      >
        <DialogHeader className="shrink-0 px-6 pb-2 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={STICKY_NOTE_ICON}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0"
                aria-hidden
              />
              <DialogTitle className="text-xl font-bold tracking-tight text-[#111827]">
                Stage Notes
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded p-1 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-2">
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <Input
                placeholder="Search all stage notes"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 rounded-lg border-[#D1D5DB] bg-white pl-9 text-sm shadow-none"
              />
            </div>
            <Popover
              open={showFilterPopover}
              onOpenChange={setShowFilterPopover}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 gap-2 rounded-lg border-[#D1D5DB] bg-[#F3F4F6] px-4 text-sm font-normal text-[#374151] hover:bg-[#E5E7EB]"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 space-y-3 p-4" align="end">
                <h4 className="text-sm font-semibold">Filter</h4>
                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last-7-days">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {uniqueAuthors.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filterAttachments}
                  onValueChange={setFilterAttachments}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Attachments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">With attachments</SelectItem>
                    <SelectItem value="no">Without attachments</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#1162A8] text-white hover:bg-[#0f5490]"
                    onClick={() => setShowFilterPopover(false)}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {displayError ? (
            <p className="mb-3 shrink-0 text-sm text-red-600" role="alert">
              {displayError}
            </p>
          ) : null}

          {isAddingNote ? (
            <div className="flex min-h-0 flex-1 gap-6 overflow-hidden">
              <div className="flex min-w-0 flex-1 flex-col">
                {composeBadges}
                <Textarea
                  value={newNoteContent}
                  onChange={(e) =>
                    setNewNoteContent(e.target.value.slice(0, MAX_NOTE_LENGTH))
                  }
                  placeholder=""
                  className="min-h-[180px] flex-1 resize-none rounded-lg border-[#D1D5DB] text-sm"
                  maxLength={MAX_NOTE_LENGTH}
                  autoFocus
                />
                <div
                  className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#D1D5DB] bg-[#FAFAFA] px-4 py-8 text-center"
                  role="button"
                  tabIndex={0}
                  onKeyDown={() => {}}
                >
                  <Upload className="mb-2 h-6 w-6 text-[#9CA3AF]" />
                  <p className="text-sm text-[#6B7280]">
                    Drag &amp; drop files here or click to browse files
                  </p>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-[100px] border-[#D1D5DB]"
                    onClick={handleCancelCompose}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="min-w-[100px] bg-[#1162A8] text-white hover:bg-[#0f5490]"
                    onClick={() => void handleDone()}
                    disabled={!newNoteContent.trim() || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Done"
                    )}
                  </Button>
                </div>
              </div>

              <NotesHistoryList
                className="min-w-0 flex-1 border-l border-[#E5E7EB] pl-6"
                notes={filteredNotes}
                slips={slips}
                currentSlipId={slipId}
                deliveryBadge={deliveryBadge}
                isRush={isRush}
                isLoading={isHistoryLoading}
                emptyMessage={historyEmptyMessage}
                onEdit={handleStartEdit}
              />
            </div>
          ) : (
            <>
              <Button
                type="button"
                className="mb-4 h-11 w-full shrink-0 rounded-lg bg-[#1162A8] text-sm font-medium text-white hover:bg-[#0f5490]"
                onClick={handleStartAdd}
              >
                Add stage notes
              </Button>
              <NotesHistoryList
                notes={filteredNotes}
                slips={slips}
                currentSlipId={slipId}
                deliveryBadge={deliveryBadge}
                isRush={isRush}
                isLoading={isHistoryLoading}
                emptyMessage={historyEmptyMessage}
                onEdit={handleStartEdit}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
