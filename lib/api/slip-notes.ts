import { apiClient } from "@/lib/api/client"

export interface SlipNoteUser {
  id: number
  name: string
  email?: string
}

export interface SlipNote {
  id: number
  note: string
  created_at: string
  updated_at: string
  added_by: SlipNoteUser
}

export interface SlipNotesListParams {
  user_id?: number
  date_from?: string
  date_to?: string
  per_page?: number
}

export interface SlipNotesPagination {
  total: number
  per_page: number
  current_page: number
  last_page: number
  from: number | null
  to: number | null
}

export interface CaseSlipWithNotes {
  id: number
  slip_number: string
  status?: string
  notes: SlipNote[]
}

export interface CaseNotesPayload {
  id: number
  case_number: string
  patient_name?: string
  slips: CaseSlipWithNotes[]
}

function unwrapList<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: T[] }).data)) {
    return (raw as { data: T[] }).data
  }
  return []
}

function unwrapOne<T>(raw: unknown): T {
  if (raw && typeof raw === "object" && "data" in (raw as object)) {
    return (raw as { data: T }).data
  }
  return raw as T
}

/** GET /slip/notes/{slipId} */
export async function getSlipNotes(
  slipId: number,
  params?: SlipNotesListParams
): Promise<SlipNote[]> {
  const response = await apiClient.get<unknown>(`/slip/notes/${slipId}`, { params })
  return unwrapList<SlipNote>(response.data)
}

/** POST /slip/notes/{slipId}/create */
export async function createSlipNote(slipId: number, note: string): Promise<SlipNote> {
  const response = await apiClient.post<unknown>(`/slip/notes/${slipId}/create`, { note })
  return unwrapOne<SlipNote>(response.data)
}

/** GET /slip/notes/note/{noteId} */
export async function getSlipNote(noteId: number): Promise<SlipNote> {
  const response = await apiClient.get<unknown>(`/slip/notes/note/${noteId}`)
  return unwrapOne<SlipNote>(response.data)
}

/** PUT /slip/notes/note/{noteId} */
export async function updateSlipNote(noteId: number, note: string): Promise<SlipNote> {
  const response = await apiClient.put<unknown>(`/slip/notes/note/${noteId}`, { note })
  return unwrapOne<SlipNote>(response.data)
}

/** DELETE /slip/notes/note/{noteId} */
export async function deleteSlipNote(noteId: number): Promise<void> {
  await apiClient.delete<unknown>(`/slip/notes/note/${noteId}`)
}

/** GET /slip/case/{caseId}/notes */
export async function getCaseNotes(
  caseId: number,
  params?: { user_id?: number }
): Promise<CaseNotesPayload> {
  const response = await apiClient.get<unknown>(`/slip/case/${caseId}/notes`, { params })
  return unwrapOne<CaseNotesPayload>(response.data)
}

/** Join slip notes for the case summary block. */
export function joinSlipNotesText(notes: SlipNote[]): string {
  return notes
    .map((n) => n.note?.trim())
    .filter(Boolean)
    .join("\n")
}
