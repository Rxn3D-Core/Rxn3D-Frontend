import {
  slipNoteAuthorName,
  type SlipNoteDetail,
} from "@/lib/api/slip-notes"
import { isSlipCaseCancelled, isSlipCaseOnHold } from "@/lib/slip-case-status"

export interface SlipHoldDetail {
  authorName: string
  heldAt: string
  reason: string
}

/** Banner timestamp: `01/30/2026 @ 9:25 AM` */
export function formatHoldBannerTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const date = d.toLocaleDateString(undefined, {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
  return `${date} @ ${time}`
}

function noteMatchesSlip(note: SlipNoteDetail, slipId: number | null): boolean {
  if (slipId == null || Number.isNaN(slipId)) return true
  if (note.slip_id == null) return true
  return note.slip_id === slipId
}

/** Newest hold note for the slip (notes are expected newest-first). */
export function findSlipHoldNote(
  notes: SlipNoteDetail[],
  slipId?: number | null
): SlipNoteDetail | null {
  for (const note of notes) {
    if (!isSlipCaseOnHold(note.slip_status)) continue
    if (!noteMatchesSlip(note, slipId ?? null)) continue
    return note
  }
  return null
}

/** Newest cancellation note for the slip (notes are expected newest-first). */
export function findSlipCancelNote(
  notes: SlipNoteDetail[],
  slipId?: number | null
): SlipNoteDetail | null {
  for (const note of notes) {
    if (!isSlipCaseCancelled(note.slip_status)) continue
    if (!noteMatchesSlip(note, slipId ?? null)) continue
    return note
  }
  return null
}

function readName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const name = (value as { name?: unknown }).name
  return typeof name === "string" && name.trim() ? name.trim() : null
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

/** Optional hold fields on slip / case payload when API exposes them directly. */
export function extractHoldDetailFromSlipPayload(
  slip: unknown
): SlipHoldDetail | null {
  if (!slip || typeof slip !== "object") return null
  const root = slip as Record<string, unknown>

  const nestedHold = root.hold ?? root.on_hold ?? root.status_hold
  if (nestedHold && typeof nestedHold === "object") {
    const hold = nestedHold as Record<string, unknown>
    const reason =
      readString(hold.reason) ??
      readString(hold.note) ??
      readString(hold.comment)
    if (!reason) return null
    return {
      authorName:
        readName(hold.put_on_hold_by) ??
        readName(hold.by) ??
        readName(hold.user) ??
        readName(hold.created_by) ??
        "Unknown",
      heldAt:
        readString(hold.put_on_hold_at) ??
        readString(hold.at) ??
        readString(hold.created_at) ??
        "",
      reason,
    }
  }

  const reason =
    readString(root.hold_reason) ??
    readString(root.on_hold_reason) ??
    readString(root.status_reason)
  if (!reason) return null

  return {
    authorName:
      readName(root.hold_by) ??
      readName(root.held_by) ??
      readName(root.put_on_hold_by) ??
      "Unknown",
    heldAt:
      readString(root.hold_at) ??
      readString(root.held_at) ??
      readString(root.put_on_hold_at) ??
      "",
    reason,
  }
}

export function holdDetailFromNote(note: SlipNoteDetail): SlipHoldDetail {
  return {
    authorName: slipNoteAuthorName(note),
    heldAt: note.created_at,
    reason: note.note?.trim() ?? "",
  }
}

/** Resolve who/when/why the slip was put on hold for the banner. */
export function resolveSlipHoldDetail(
  notes: SlipNoteDetail[],
  slipId?: number | null,
  slipPayload?: unknown
): SlipHoldDetail | null {
  const fromNote = findSlipHoldNote(notes, slipId)
  const fromPayload = extractHoldDetailFromSlipPayload(slipPayload)

  if (fromNote) {
    const detail = holdDetailFromNote(fromNote)
    if (!detail.reason && fromPayload?.reason) {
      detail.reason = fromPayload.reason
    }
    if (detail.authorName === "Unknown" && fromPayload?.authorName) {
      detail.authorName = fromPayload.authorName
    }
    if (!detail.heldAt && fromPayload?.heldAt) {
      detail.heldAt = fromPayload.heldAt
    }
    return detail
  }

  return fromPayload
}

/** Resolve who/when/why the slip was cancelled for the cancelled banner. */
export function resolveSlipCancelDetail(
  notes: SlipNoteDetail[],
  slipId?: number | null
): SlipHoldDetail | null {
  const fromNote = findSlipCancelNote(notes, slipId)
  return fromNote ? holdDetailFromNote(fromNote) : null
}
