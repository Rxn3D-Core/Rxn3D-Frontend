import type { CSSProperties } from "react"

export interface V2CaseRowData {
  id: number
  createdAt: string
  caseId?: number
  caseNumber?: string
  billingId?: number
  slipNumber?: string
  pan: string
  panColorStyle?: CSSProperties
  officeCode: string
  patient: string
  product: string
  status: string
  rush: boolean
  location: string
  locationId?: number
  newStageEligible?: boolean
  attachment: boolean
  /** Digital impressions connected to the slip (listing Attachments column). */
  digitalImpressions?: Array<{ id: number; name: string; code?: string; url?: string | null }>
  dueDate: string
  doctor?: string
  user?: string
  productType?: string
}

export interface V2VisibleColumns {
  timestamp: boolean
  office: boolean
  patient: boolean
  slipNumber: boolean
  pan: boolean
  product: boolean
  status: boolean
  location: boolean
  attachment: boolean
  viewSlip: boolean
  due: boolean
  actions: boolean
}

export type V2DateRange = {
  start?: Date
  end?: Date
}

export type V2FilterOptions = {
  offices: string[]
  products: string[]
  doctors: string[]
  users: string[]
}

export type V2FilterValues = {
  office: string
  location: string
  productType: string
  doctor: string
  user: string
  dateRange: V2DateRange
  attachmentsOnly: boolean
}

export interface V2RowActions {
  onOpen: (row: V2CaseRowData) => void
  onPrintPaperSlip: (row: V2CaseRowData) => void | Promise<void>
  onPrintDriverLabel: (row: V2CaseRowData) => void | Promise<void>
  onPrintStatement: (row: V2CaseRowData) => void | Promise<void>
  onCallLog: (row: V2CaseRowData) => void
  onAddOns: (row: V2CaseRowData) => void
  onAttachment: (row: V2CaseRowData) => void
  onCopy: (row: V2CaseRowData) => void
  onEdit: (row: V2CaseRowData) => void
  onHold: (row: V2CaseRowData) => void
  onChangeDueDate: (row: V2CaseRowData) => void
  onDriverHistory: (row: V2CaseRowData) => void
  onReadyToSend: (row: V2CaseRowData) => void
  onAddStage: (row: V2CaseRowData) => void
  onSendBack: (row: V2CaseRowData) => void
  onRush: (row: V2CaseRowData) => void
  onCancel: (row: V2CaseRowData) => void
  onDelete: (row: V2CaseRowData) => void
  onRestore: (row: V2CaseRowData) => void
}
