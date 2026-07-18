import { apiClient, buildApiUrl } from "@/lib/api/client"
import { parseStageFromSlipProductNotes } from "../parse-slip-product-notes"

/** Backend note type values (required on create). */
export type SlipNoteType = "internal" | "stage" | "lab_connect"

export const SLIP_NOTE_TYPE_OPTIONS: {
  value: SlipNoteType
  label: string
}[] = [
  { value: "internal", label: "Internal" },
  { value: "stage", label: "Stage" },
  { value: "lab_connect", label: "Lab Connect" },
]

export const DEFAULT_SLIP_NOTE_TYPE: SlipNoteType = "internal"

export interface SlipNoteUser {
  id: number
  name: string
  email?: string
}

export interface SlipNote {
  id: number
  note: string
  type?: SlipNoteType | string
  created_at: string
  updated_at: string
  added_by: SlipNoteUser
}

export interface CreateSlipNotePayload {
  note: string
  type: SlipNoteType
}

export interface UpdateSlipNotePayload {
  note: string
  type?: SlipNoteType
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

export interface SlipNoteEntityRef {
  id: number
  name: string
  code?: string
  stage_code?: string
  stage_name?: string
}

export interface CaseSlipProductSummary {
  id: number
  product_name?: string
  /** Upper | Lower | Both — determines arch for CT/CT style tab labels. */
  type?: string
  stage_name?: string
  stage_code?: string
  stage_id?: number
  stage?: SlipNoteEntityRef | null
}

export interface CaseNoteStageSeed {
  stageId?: number | null
  label: string
}

export interface CaseNoteStageTab {
  key: string
  /** Case slip row this tab represents (primary source: `payload.slips`). */
  slipId?: number | null
  stageId: number | null
  label: string
}

/** Sentinel id for notes not linked to a stage/product. */
export const CASE_NOTE_GENERAL_STAGE_ID = 0

export interface SlipNoteAttachment {
  id: number
  file_name: string
  original_name: string
  file_type: string
  file_size: number
  file_url: string | null
  description: string | null
  is_archived: boolean
  created_at: string
}

export type SlipNoteVisibility =
  | "office_only"
  | "lab_only"
  | "lab_to_lab_only"
  | "both"

/** Full note shape from GET /slip/case/{caseId}/notes (`all_notes`, `slips[].notes`). */
export interface SlipNoteDetail {
  id: number
  type: SlipNoteType | string
  visibility?: SlipNoteVisibility | string
  note: string
  needs_follow_up?: boolean
  is_general?: boolean
  slip_id?: number
  slip_number?: string
  slip_status?: string
  product_id?: number | null
  stage_id?: number | null
  product?: SlipNoteEntityRef | null
  stage?: SlipNoteEntityRef | null
  created_by?: SlipNoteUser | null
  added_by?: SlipNoteUser | null
  assigned_to?: SlipNoteUser | null
  receiving_lab?: { id: number; name: string } | null
  has_attachments?: boolean
  attachments_count?: number
  attachments?: SlipNoteAttachment[]
  created_at: string
  updated_at?: string
}

export interface CaseSlipWithNotes {
  id: number
  slip_number: string
  status?: string
  products?: CaseSlipProductSummary[]
  notes: SlipNoteDetail[]
}

export interface CaseNotesSummary {
  total_count: number
  needs_follow_up_count: number
  by_type: {
    internal: number
    stage: number
    lab_connect: number
  }
}

export interface CaseNotesPayload {
  id: number
  case_number: string
  patient_name?: string
  case_status?: string
  summary?: CaseNotesSummary
  all_notes: SlipNoteDetail[]
  slips: CaseSlipWithNotes[]
}

export interface CaseNotesQueryParams {
  user_id?: number
  types?: string | SlipNoteType | SlipNoteType[]
  needs_follow_up?: boolean
  date_from?: string
  date_to?: string
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
export async function createSlipNote(
  slipId: number,
  payload: CreateSlipNotePayload
): Promise<SlipNote> {
  const response = await apiClient.post<unknown>(`/slip/notes/${slipId}/create`, {
    note: payload.note,
    type: payload.type,
  })
  return unwrapOne<SlipNote>(response.data)
}

/** GET /slip/notes/note/{noteId} */
export async function getSlipNote(noteId: number): Promise<SlipNote> {
  const response = await apiClient.get<unknown>(`/slip/notes/note/${noteId}`)
  return unwrapOne<SlipNote>(response.data)
}

/** PUT /slip/notes/note/{noteId} */
export async function updateSlipNote(
  noteId: number,
  payload: UpdateSlipNotePayload
): Promise<SlipNote> {
  const response = await apiClient.put<unknown>(`/slip/notes/note/${noteId}`, payload)
  return unwrapOne<SlipNote>(response.data)
}

/** DELETE /slip/notes/note/{noteId} */
export async function deleteSlipNote(noteId: number): Promise<void> {
  await apiClient.delete<unknown>(`/slip/notes/note/${noteId}`)
}

/** POST /slip/notes/{noteId}/attachments — multipart `files[]` (+ optional `descriptions[]`). */
export async function uploadSlipNoteAttachments(
  noteId: number,
  files: File[],
  descriptions?: (string | null | undefined)[]
): Promise<SlipNoteAttachment[]> {
  const formData = new FormData()
  files.forEach((file, index) => {
    formData.append("files[]", file)
    if (descriptions) {
      formData.append("descriptions[]", descriptions[index] ?? "")
    }
  })

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  const response = await fetch(buildApiUrl(`/slip/notes/${noteId}/attachments`), {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    const message =
      errorBody?.message || `HTTP error! status: ${response.status}`
    throw new Error(message)
  }

  const raw = (await response.json().catch(() => null)) as unknown
  return unwrapList<SlipNoteAttachment>(raw)
}

function normalizeCaseNotesQueryParams(
  params?: CaseNotesQueryParams
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined
  const out: Record<string, string | number | boolean> = {}
  if (params.user_id != null) out.user_id = params.user_id
  if (params.needs_follow_up != null) out.needs_follow_up = params.needs_follow_up
  if (params.date_from) out.date_from = params.date_from
  if (params.date_to) out.date_to = params.date_to
  if (params.types != null) {
    const types = Array.isArray(params.types) ? params.types : String(params.types).split(",")
    out.types = types.map((t) => String(t).trim()).filter(Boolean).join(",")
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/** GET /slip/case/{caseId}/notes */
export async function getCaseNotes(
  caseId: number,
  params?: CaseNotesQueryParams
): Promise<CaseNotesPayload> {
  const response = await apiClient.get<unknown>(`/slip/case/${caseId}/notes`, {
    params: normalizeCaseNotesQueryParams(params),
  })
  const payload = unwrapOne<CaseNotesPayload>(response.data)
  return {
    ...payload,
    all_notes: Array.isArray(payload.all_notes) ? payload.all_notes : [],
    slips: Array.isArray(payload.slips) ? payload.slips : [],
  }
}

export function slipNoteAuthorName(note: SlipNoteDetail): string {
  return note.created_by?.name ?? note.added_by?.name ?? "Unknown"
}

export function formatSlipNoteTimestamp(iso: string): string {
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

/** Highlight slip status on timeline entries when it is not a routine in-progress state. */
export function slipNoteStatusLabel(note: SlipNoteDetail): string | null {
  const status = note.slip_status?.trim()
  if (!status) return null
  const lower = status.toLowerCase().replace(/\s+/g, " ").trim()
  if (lower === "in progress" || lower === "active" || lower === "new") return null
  if (lower === "on hold" || lower === "hold") return "CASE ON HOLD"
  return status.toUpperCase()
}

/** Status badge color in case note timeline (hold uses orange-gold per design). */
export function slipNoteStatusColor(statusLabel: string | null): string {
  if (!statusLabel) return "#CF0202"
  const lower = statusLabel.toLowerCase().replace(/\s+/g, " ").trim()
  if (lower === "case on hold" || lower === "on hold" || lower === "hold") {
    return "#EDBA29"
  }
  return "#CF0202"
}

export function resolveStageTabLabel(
  stage?: SlipNoteEntityRef | null,
  fallbacks?: Pick<CaseSlipProductSummary, "stage_code" | "stage_name">
): string | null {
  const code =
    stage?.code?.trim() ||
    stage?.stage_code?.trim() ||
    fallbacks?.stage_code?.trim()
  if (code) return code
  const name =
    stage?.name?.trim() ||
    stage?.stage_name?.trim() ||
    fallbacks?.stage_name?.trim()
  return name || null
}

function noteStageId(note: SlipNoteDetail): number | null {
  const id = note.stage_id ?? note.stage?.id
  return typeof id === "number" && id > 0 ? id : null
}

export function caseNoteStageTabKey(
  stageId: number | null | undefined,
  label: string
): string {
  if (stageId === CASE_NOTE_GENERAL_STAGE_ID) return `stage:${CASE_NOTE_GENERAL_STAGE_ID}`
  if (typeof stageId === "number" && stageId > 0) return `stage:${stageId}`
  return `label:${label.trim().toLowerCase()}`
}

function noteStageLabel(note: SlipNoteDetail): string | null {
  return resolveStageTabLabel(note.stage)
}

function productArchKey(
  type: string | undefined
): "maxillary" | "mandibular" | "both" | null {
  const t = String(type ?? "").trim().toLowerCase()
  if (t === "lower" || t === "mandibular") return "mandibular"
  if (t === "upper" || t === "maxillary") return "maxillary"
  if (t === "both") return "both"
  return null
}

function productStageCode(product: CaseSlipProductSummary): string | null {
  const fromApi = resolveStageTabLabel(product.stage, {
    stage_code: product.stage_code,
    stage_name: product.stage_name,
  })
  if (fromApi) return fromApi
  const notes =
    typeof (product as { notes?: unknown }).notes === "string"
      ? (product as { notes: string }).notes
      : ""
  if (!notes.trim()) return null
  const fromNotes = parseStageFromSlipProductNotes(notes)
  return fromNotes || null
}

function slipProductsHaveBothArches(products: CaseSlipProductSummary[]): boolean {
  let hasMaxillary = false
  let hasMandibular = false
  for (const product of products) {
    const arch = productArchKey(product.type)
    if (arch === "both") return true
    if (arch === "maxillary") hasMaxillary = true
    if (arch === "mandibular") hasMandibular = true
    if (hasMaxillary && hasMandibular) return true
  }
  const coded = products.filter((p) => productStageCode(p))
  return coded.length >= 2
}

/** Tab label from slip products — `CT/CT` when upper and lower products exist. */
export function formatSlipStageTabLabel(
  products: CaseSlipProductSummary[] | undefined
): string | null {
  if (!products?.length) return null

  let maxillaryCode: string | null = null
  let mandibularCode: string | null = null

  for (const product of products) {
    const code = productStageCode(product)
    if (!code) continue

    const arch = productArchKey(product.type)
    if (arch === "both") {
      maxillaryCode = maxillaryCode ?? code
      mandibularCode = mandibularCode ?? code
    } else if (arch === "mandibular") {
      mandibularCode = mandibularCode ?? code
    } else if (arch === "maxillary") {
      maxillaryCode = maxillaryCode ?? code
    } else if (!maxillaryCode) {
      maxillaryCode = code
    } else if (!mandibularCode) {
      mandibularCode = code
    }
  }

  if (slipProductsHaveBothArches(products)) {
    const upper = maxillaryCode ?? mandibularCode
    const lower = mandibularCode ?? maxillaryCode
    if (!upper && !lower) return null
    return `${upper}/${lower}`
  }

  return maxillaryCode ?? mandibularCode
}

function resolveSlipTabLabel(slip: CaseSlipWithNotes): string | null {
  const fromProducts = formatSlipStageTabLabel(slip.products)
  if (fromProducts) return fromProducts
  for (const note of slip.notes ?? []) {
    const label = resolveStageTabLabel(note.stage)
    if (label) return label
  }
  return null
}

function noteMatchesStageTab(note: SlipNoteDetail, tab: CaseNoteStageTab): boolean {
  if (tab.slipId != null) {
    return note.slip_id === tab.slipId
  }
  if (tab.stageId === CASE_NOTE_GENERAL_STAGE_ID) {
    return note.is_general === true || note.slip_id == null
  }
  if (tab.stageId != null && noteStageId(note) === tab.stageId) return true
  const noteLabel = noteStageLabel(note)
  return Boolean(
    noteLabel && tab.label && noteLabel.toLowerCase() === tab.label.toLowerCase()
  )
}

/** Pull stage tab seeds from virtual slip product rows (current slip details). */
export function collectStageSeedsFromVirtualSlip(details: unknown): CaseNoteStageSeed[] {
  if (!details || typeof details !== "object") return []
  const products = Array.isArray((details as { products?: unknown[] }).products)
    ? ((details as { products: unknown[] }).products as CaseSlipProductSummary[])
    : []

  const combinedLabel = formatSlipStageTabLabel(products)
  if (combinedLabel) {
    const primary = products[0]
    const stageIdRaw = primary?.stage_id ?? primary?.stage?.id
    const stageId =
      typeof stageIdRaw === "number" && stageIdRaw > 0 ? stageIdRaw : null
    return [{ label: combinedLabel, stageId }]
  }

  const seed = products.length ? extractStageSeedFromProduct(products[0]) : null
  return seed ? [seed] : []
}

export function extractStageSeedFromProduct(product: unknown): CaseNoteStageSeed | null {
  if (!product || typeof product !== "object") return null
  const row = product as Record<string, unknown>
  const stage =
    row.stage && typeof row.stage === "object"
      ? (row.stage as Record<string, unknown>)
      : {}
  const stageIdRaw = row.stage_id ?? stage.id ?? stage.stage_id
  const stageIdNum = typeof stageIdRaw === "number" ? stageIdRaw : Number(stageIdRaw)
  const notes = typeof row.notes === "string" ? row.notes : ""
  const label =
    resolveStageTabLabel(stage as SlipNoteEntityRef, {
      stage_code: String(row.stage_code ?? stage.code ?? ""),
      stage_name: String(row.stage_name ?? stage.name ?? ""),
    }) ??
    (notes.trim() ? parseStageFromSlipProductNotes(notes) : null)
  if (!label) return null
  return {
    stageId: Number.isFinite(stageIdNum) && stageIdNum > 0 ? stageIdNum : null,
    label,
  }
}

/** Stage tabs — one per case slip (`payload.slips`), plus General when needed. */
export function buildCaseNoteStageTabs(
  payload: CaseNotesPayload | null,
  options?: { seeds?: CaseNoteStageSeed[]; currentSlipId?: number | null }
): CaseNoteStageTab[] {
  const tabs: CaseNoteStageTab[] = []
  const seenSlipIds = new Set<number>()

  for (const slip of payload?.slips ?? []) {
    if (seenSlipIds.has(slip.id)) continue
    seenSlipIds.add(slip.id)

    const label = resolveSlipTabLabel(slip)
    if (!label) continue

    const primaryStageId =
      slip.products?.find((p) => (p.stage_id ?? p.stage?.id) != null)?.stage_id ??
      slip.products?.[0]?.stage?.id ??
      null

    tabs.push({
      key: `slip:${slip.id}`,
      slipId: slip.id,
      stageId:
        typeof primaryStageId === "number" && primaryStageId > 0
          ? primaryStageId
          : null,
      label,
    })
  }

  if (tabs.length === 0) {
    for (const seed of options?.seeds ?? []) {
      if (!seed.label?.trim()) continue
      tabs.push({
        key: caseNoteStageTabKey(seed.stageId, seed.label),
        slipId: options?.currentSlipId ?? null,
        stageId: seed.stageId ?? null,
        label: seed.label.trim(),
      })
      break
    }
  }

  const hasGeneral = (payload?.all_notes ?? []).some(
    (n) => n.is_general === true || n.slip_id == null
  )
  if (hasGeneral) {
    tabs.push({
      key: caseNoteStageTabKey(CASE_NOTE_GENERAL_STAGE_ID, "General"),
      slipId: null,
      stageId: CASE_NOTE_GENERAL_STAGE_ID,
      label: "General",
    })
  }

  return tabs
}

export function resolveDefaultCaseNoteStageTabKey(
  tabs: CaseNoteStageTab[],
  currentSlipId: number | null,
  seeds: CaseNoteStageSeed[]
): string | null {
  if (tabs.length === 0) return null

  if (currentSlipId != null) {
    const currentSlipTab = tabs.find((t) => t.slipId === currentSlipId)
    if (currentSlipTab) return currentSlipTab.key
  }

  const primarySeed = seeds[0]
  if (primarySeed?.label) {
    const byLabel = tabs.find(
      (t) => t.label.toLowerCase() === primarySeed.label.toLowerCase()
    )
    if (byLabel) return byLabel.key
    const slashLabel = primarySeed.label.includes("/")
      ? primarySeed.label
      : `${primarySeed.label}/${primarySeed.label}`
    const bySlash = tabs.find((t) => t.label.toLowerCase() === slashLabel.toLowerCase())
    if (bySlash) return bySlash.key
  }

  return tabs[0]?.key ?? null
}

export function filterCaseNotesForTab(
  notes: SlipNoteDetail[],
  tab: CaseNoteStageTab | null,
  options?: { currentSlipId?: number | null; isDefaultTab?: boolean }
): SlipNoteDetail[] {
  const slipId = options?.currentSlipId

  if (!tab) {
    if (slipId) return notes.filter((n) => n.slip_id === slipId)
    return notes
  }

  if (tab.slipId != null) {
    return notes.filter((note) => note.slip_id === tab.slipId)
  }

  if (tab.stageId === CASE_NOTE_GENERAL_STAGE_ID) {
    return notes.filter((n) => n.is_general === true || n.slip_id == null)
  }

  return notes.filter((note) => {
    if (noteMatchesStageTab(note, tab)) return true
    if (
      options?.isDefaultTab &&
      slipId &&
      note.slip_id === slipId &&
      noteStageId(note) == null
    ) {
      return true
    }
    return false
  })
}

/** @deprecated Use filterCaseNotesForTab */
export function filterCaseNotesByStage(
  notes: SlipNoteDetail[],
  stageId: number | null
): SlipNoteDetail[] {
  if (stageId == null) return []
  const tab: CaseNoteStageTab = {
    key: caseNoteStageTabKey(stageId, ""),
    stageId,
    label: "",
  }
  return filterCaseNotesForTab(notes, tab)
}

/** Join slip notes for the case summary block. */
export function joinSlipNotesText(notes: SlipNote[]): string {
  return notes
    .map((n) => n.note?.trim())
    .filter(Boolean)
    .join("\n")
}
