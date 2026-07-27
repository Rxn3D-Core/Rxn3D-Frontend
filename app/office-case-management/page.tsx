"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { X } from "lucide-react"
import { format } from "date-fns"
import { useOfficeSlipContext, type UISlip } from "@/contexts/office-slip-context"
import { SlipProvider, useSlipContext } from "@/app/lab-case-management/SlipContext"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import SlipAttachmentBrowserDialog from "@/components/slip-attachment-browser-dialog"
import DriverHistoryModal from "@/components/driver-history-modal"
import ReadyToSendModal from "@/components/ready-to-send-modal"
import { useSignatureRequirementSettings } from "@/hooks/use-signature-requirement-settings"
import AddOnsModal from "@/components/add-ons-modal"
import { buildVirtualSlipAddonInputs, type VirtualSlipAddonInputs } from "@/lib/virtual-slip-addon-inputs"
import CallLogModal from "@/components/call-log-modal"
import PrintDriverTagsModal from "@/components/print-driver-tags-modal"
import CaseActionModal from "@/components/CaseActionModal"
import { useToast } from "@/components/ui/use-toast"
import { HIPAAComplianceBanner } from "@/components/hipaa-compliance-banner"
import { useAdvancedBillingSearchMutation, useGenerateVirtualStatementMutation } from "@/lib/redux/api/billingApi"
import { findBillingInvoiceIdFromSearchResults, resolveCaseStatementBillingId } from "@/lib/case-statement-print"
import {
  SLIP_LISTING_DEFAULT_PER_PAGE,
  SLIP_LOCATION_FILTER_OPTIONS,
} from "@/app/lab-case-management/lab-slip-listing-constants"
import {
  SLIP_LISTING_ADVANCED_FILTER_LOCATION_SELECT_TRIGGER_CLASS,
  SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS,
} from "@/lib/slip-listing-filter-select"
import { slipCanHold, SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE } from "@/lib/slip-location"
import { VirtualSlipPauseIcon } from "@/components/virtual-slip/VirtualSlipPauseIcon"
import { SlipListingCalendarIcon } from "@/components/slip-listing/SlipListingCalendarIcon"
import { resolveListingCustomerId } from "@/lib/customer-scope"
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes"
import { usePaperSlipInPagePrint } from "@/hooks/use-paper-slip-in-page-print"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { useDebounce } from "@/lib/performance-utils"
import { V3CaseWidget } from "@/app/lab-case-management/components/V3CaseWidget"
import type { SortDirection } from "@/app/lab-case-management/components/V3CaseTable"
import type { ColumnKey } from "@/app/lab-case-management/components/V3FilterBar"
import type { V2CaseRowData } from "@/app/lab-case-management/v2/case-table-types"

/** Adapts office's UISlip (from useOfficeSlipContext) to the shared V3 table's row shape. */
function toCaseRowData(slip: UISlip): V2CaseRowData {
  return {
    id: slip.id,
    createdAt: slip.createdAt,
    caseId: slip.caseId,
    caseNumber: slip.caseNumber,
    billingId: slip.billingId,
    slipNumber: slip.slipNumber,
    pan: slip.pan,
    panColorStyle: slip.panColorStyle,
    officeCode: slip.officeCode,
    patient: slip.patient,
    product: slip.product,
    status: slip.status,
    rush: slip.rush,
    location: slip.location,
    locationId: slip.locationId,
    attachment: slip.attachment,
    dueDate: slip.dueDate,
    doctor: slip.doctorName,
  }
}

function getSortValue(row: V2CaseRowData, key: ColumnKey): string | number {
  switch (key) {
    case "patient":
      return (row.patient || "").toLowerCase()
    case "slip":
      return (row.slipNumber || "").toLowerCase()
    case "panProduct":
      return (row.product || row.pan || "").toLowerCase()
    case "location":
      return (row.location || "").toLowerCase()
    case "status":
      return (row.status || "").toLowerCase()
    case "office":
      return (row.officeCode || "").toLowerCase()
    case "caseNo":
      return (row.caseNumber || "").toLowerCase()
    case "timestamp":
      return new Date(row.createdAt).getTime() || 0
    case "dueDate": {
      if (!row.dueDate) return Number.POSITIVE_INFINITY
      const time = new Date(row.dueDate).getTime()
      return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
    }
    default:
      return ""
  }
}

const LOCATION_SEQUENCE_ORDER: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 }

function locationSequenceValue(row: V2CaseRowData): number {
  const id = row.locationId
  return id != null && id in LOCATION_SEQUENCE_ORDER ? LOCATION_SEQUENCE_ORDER[id] : Number.POSITIVE_INFINITY
}

function sortRows(rows: V2CaseRowData[], key: ColumnKey | null, direction: SortDirection, groupByLocationSequence: boolean): V2CaseRowData[] {
  if (groupByLocationSequence) {
    const withinGroupSorted = key ? sortRows(rows, key, direction, false) : rows
    return [...withinGroupSorted].sort((a, b) => locationSequenceValue(a) - locationSequenceValue(b))
  }
  if (!key) return rows
  const sorted = [...rows].sort((a, b) => {
    const aValue = getSortValue(a, key)
    const bValue = getSortValue(b, key)
    if (aValue < bValue) return -1
    if (aValue > bValue) return 1
    return 0
  })
  return direction === "asc" ? sorted : sorted.reverse()
}

function normalizeStatusFilterValue(status: string): string {
  const value = status.trim().toLowerCase()
  if (value === "on hold" || value === "on-hold") return "on hold"
  if (value === "cancelled" || value === "canceled") return "cancelled"
  return value
}

function canPrintStatement(row: { billingId?: number | null }): boolean {
  return typeof row.billingId === "number" && Number.isFinite(row.billingId)
}

function OfficeCaseManagementPage() {
  const { toast } = useToast()
  const router = useRouter()
  const { print: printPaperSlip, portal: paperSlipPortal, isPrinting } = usePaperSlipInPagePrint()

  const [search, setSearch] = useState("")
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(SLIP_LISTING_DEFAULT_PER_PAGE)
  const [selected, setSelected] = useState<number[]>([])
  const [menuRow, setMenuRow] = useState<number | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<number | null>(null)
  const [printDropdownOpen, setPrintDropdownOpen] = useState<number | null>(null)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({})
  const [officeFilter, setOfficeFilter] = useState("All")
  const [productType, setProductType] = useState("All")
  const [doctorFilter, setDoctorFilter] = useState("All")
  const [stageFilter, setStageFilter] = useState("All")
  const [officeLabFilter, setOfficeLabFilter] = useState("All")
  const [showWithAttachments, setShowWithAttachments] = useState(false)
  const [sortKey, setSortKey] = useState<ColumnKey | null>("dueDate")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const [showAttachModal, setShowAttachModal] = useState(false)
  const [selectedCaseForAttachment, setSelectedCaseForAttachment] = useState<{
    caseId: number; caseNumber: string; patient: string; doctor: string
  } | null>(null)
  const [showDriverHistoryModal, setShowDriverHistoryModal] = useState(false)
  const [selectedSlipForDriverHistory, setSelectedSlipForDriverHistory] = useState<V2CaseRowData | null>(null)
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [selectedSlipForAddOns, setSelectedSlipForAddOns] = useState<V2CaseRowData | null>(null)
  const [addonInputs, setAddonInputs] = useState<VirtualSlipAddonInputs | null>(null)
  const [showCallLogModal, setShowCallLogModal] = useState(false)
  const [selectedSlipForCallLog, setSelectedSlipForCallLog] = useState<V2CaseRowData | null>(null)
  const [showPrintDriverTags, setShowPrintDriverTags] = useState(false)
  const [selectedSlipForDriverTags, setSelectedSlipForDriverTags] = useState<V2CaseRowData | null>(null)
  const [showReadyToSendModal, setShowReadyToSendModal] = useState(false)
  const [readyToSendSlip, setReadyToSendSlip] = useState<V2CaseRowData | null>(null)
  const [readyToSendSubmitting, setReadyToSendSubmitting] = useState(false)
  const [cancelSlipModalOpen, setCancelSlipModalOpen] = useState(false)
  const [selectedSlipForCancel, setSelectedSlipForCancel] = useState<V2CaseRowData | null>(null)
  const [cancelSlipSubmitting, setCancelSlipSubmitting] = useState(false)
  const [holdSlipModalOpen, setHoldSlipModalOpen] = useState(false)
  const [selectedSlipForHold, setSelectedSlipForHold] = useState<V2CaseRowData | null>(null)
  const [holdSlipSubmitting, setHoldSlipSubmitting] = useState(false)

  const { readyToSendRequired } = useSignatureRequirementSettings(showReadyToSendModal)

  const { slips: officeSlips, loading, pagination, fetchOfficeSlips } = useOfficeSlipContext()
  const { fetchDriverPrintData, readyToSend } = useSlipContext()
  const { fetchProductAddons, cancelSlip, holdSlip } = useSlipCreation()
  const [advancedBillingSearch] = useAdvancedBillingSearchMutation()
  const [generateVirtualStatement] = useGenerateVirtualStatementMutation()

  const slips = useMemo(() => officeSlips.map(toCaseRowData), [officeSlips])

  const debouncedSearch = useDebounce(search, 400)

  useEffect(() => {
    const customerId = resolveListingCustomerId()
    if (!customerId) return
    void fetchOfficeSlips(customerId, currentPage, itemsPerPage)
  }, [fetchOfficeSlips, currentPage, itemsPerPage])

  const allOffices = useMemo(() => Array.from(new Set(slips.map((s) => s.officeCode).filter(Boolean))), [slips])
  const allStatuses = useMemo(() => Array.from(new Set(slips.map((s) => s.status).filter(Boolean))), [slips])
  const allDoctors = useMemo(() => Array.from(new Set(slips.map((s) => s.doctor || "Unknown"))), [slips])
  const allProductTypes = useMemo(() => Array.from(new Set(slips.map((s) => s.productType || "Unknown"))), [slips])
  const allStages = useMemo(() => Array.from(new Set(slips.map((s) => s.product).filter(Boolean))), [slips])

  const slipsPage = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    const selectedStatusSet = new Set(selectedStatuses.map(normalizeStatusFilterValue))
    const filtered = slips.filter((slip) => {
      if (q) {
        const haystack = `${slip.patient} ${slip.product} ${slip.doctor ?? ""} ${slip.caseNumber ?? ""} ${slip.slipNumber ?? ""}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (selectedLocations.length > 0 && !selectedLocations.includes(String(slip.locationId ?? ""))) {
        return false
      }
      if (selectedStatusSet.size > 0 && !selectedStatusSet.has(normalizeStatusFilterValue(slip.status || ""))) {
        return false
      }
      if (officeFilter !== "All" && slip.officeCode !== officeFilter) return false
      if (doctorFilter !== "All" && slip.doctor !== doctorFilter) return false
      if (stageFilter !== "All" && slip.product !== stageFilter) return false
      if (showWithAttachments && !slip.attachment) return false
      return true
    })
    return sortRows(filtered, sortKey, sortDirection, selectedLocations.length === 0)
  }, [slips, debouncedSearch, selectedLocations, selectedStatuses, officeFilter, doctorFilter, stageFilter, showWithAttachments, sortKey, sortDirection])

  const handleSortChange = useCallback((key: ColumnKey) => {
    if (sortKey === key) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }, [sortKey])

  const totalListingCount = pagination?.total ?? slips.length
  const maxPage = Math.max(1, pagination?.last_page ?? 1)

  const handleLocationFilterChange = (value: string) => {
    setSelectedLocations((current) => {
      if (value === "All") return []
      return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    })
  }

  const handleStatusFilterChange = (status: string) => {
    setSelectedStatuses((current) => (
      current.some((item) => normalizeStatusFilterValue(item) === normalizeStatusFilterValue(status))
        ? current.filter((item) => normalizeStatusFilterValue(item) !== normalizeStatusFilterValue(status))
        : [...current, status]
    ))
  }

  const handleClearQuickFilters = () => {
    setSelectedLocations([])
    setSelectedStatuses([])
  }

  const handleClearAdvancedFilters = () => {
    setDateRange({})
    setSearch("")
    setProductType("All")
    setDoctorFilter("All")
    setStageFilter("All")
    setOfficeLabFilter("All")
    setOfficeFilter("All")
    setShowWithAttachments(false)
    setSelectedLocations([])
    setSelectedStatuses([])
  }

  const allOnPageSelected = slipsPage.length > 0 && slipsPage.every((s) => selected.includes(s.id))
  const someOnPageSelected = slipsPage.some((s) => selected.includes(s.id))
  const selectAllHeaderChecked: boolean | "indeterminate" = allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false

  const handleSelectAllPage = () => {
    if (allOnPageSelected) {
      setSelected(selected.filter((id) => !slipsPage.map((s) => s.id).includes(id)))
    } else {
      setSelected([...selected, ...slipsPage.filter((s) => !selected.includes(s.id)).map((s) => s.id)])
    }
  }

  const refreshCurrentListing = useCallback(() => {
    const customerId = resolveListingCustomerId()
    if (!customerId) return
    void fetchOfficeSlips(customerId, currentPage, itemsPerPage)
  }, [fetchOfficeSlips, currentPage, itemsPerPage])

  const loadAddonInputsForSlip = useCallback(async (slipId: number) => {
    setAddonInputs(null)
    if (!slipId) return
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const url = new URL(`/v1/slip/slip/${slipId}/details`, process.env.NEXT_PUBLIC_API_BASE_URL)
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) { window.location.href = "/login"; return }
      const json = await res.json()
      const details = json?.data ?? null
      setAddonInputs(buildVirtualSlipAddonInputs(details))
    } catch {
      setAddonInputs(null)
    }
  }, [])

  const handleOpenReadyToSend = (slip: V2CaseRowData) => { setReadyToSendSlip(slip); setShowReadyToSendModal(true) }
  const handleConfirmReadyToSend = async (signature?: string) => {
    if (!readyToSendSlip) return
    setReadyToSendSubmitting(true)
    try {
      const res = await readyToSend(readyToSendSlip.id, signature)
      if (res?.success) {
        toast({ title: "Success", description: res.message || "Slip marked as ready to send.", duration: 3000 })
        setShowReadyToSendModal(false); setReadyToSendSlip(null)
      } else {
        toast({ title: "Error", description: res?.message ?? "Could not mark slip as ready to send.", variant: "destructive", duration: 5000 })
      }
    } catch {
      toast({ title: "Error", description: "Could not mark slip as ready to send.", variant: "destructive", duration: 5000 })
    } finally {
      setReadyToSendSubmitting(false)
    }
  }

  const handlePrintPaperSlip = (slip: V2CaseRowData) => {
    const idToSend: number | null = typeof slip.caseId === "number" && !isNaN(slip.caseId) ? slip.caseId : null
    if (idToSend === null) {
      toast({ title: "No valid slip", description: "This slip does not have a valid slip ID.", variant: "destructive" })
      return
    }
    printPaperSlip([idToSend], [])
  }

  const handlePrintStatement = (slip: V2CaseRowData) => {
    void (async () => {
      let billingId = resolveCaseStatementBillingId(slip)

      if (billingId == null && slip.caseNumber) {
        try {
          const searchResult = await advancedBillingSearch({
            search: slip.slipNumber || slip.caseNumber || slip.patient || undefined,
            case_number: slip.caseNumber,
            patient_name: slip.patient || undefined,
            per_page: 20,
            page: 1,
          }).unwrap()
          billingId = findBillingInvoiceIdFromSearchResults(searchResult.data ?? [], {
            slipNumber: slip.slipNumber,
            caseNumber: slip.caseNumber,
            patient: slip.patient,
          })
        } catch {
          billingId = null
        }
      }

      if (billingId == null) {
        toast({ title: "Statement not available", description: "No billing invoice was found for this case yet.", variant: "destructive" })
        return
      }
      try {
        const result = await generateVirtualStatement(billingId).unwrap()
        const html = result?.data?.html
        if (!html) {
          toast({ title: "Statement unavailable", description: "The server did not return a statement for this case.", variant: "destructive" })
          return
        }
        const win = window.open("about:blank", "_blank", "width=1200,height=900")
        if (!win) {
          toast({ title: "Pop-up blocked", description: "Please allow pop-ups for this site and try again.", variant: "destructive" })
          return
        }
        const printHtml = html.includes("</body>")
          ? html.replace("</body>", "<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body>")
          : html + "<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>"
        win.document.open(); win.document.write(printHtml); win.document.close(); win.focus()
      } catch {
        toast({ title: "Failed to load statement", description: "Could not retrieve the statement from the server.", variant: "destructive" })
      }
    })()
  }

  const handleConfirmCancelCase = async (reason: string) => {
    if (!selectedSlipForCancel?.id || !reason.trim()) return
    setCancelSlipSubmitting(true)
    try {
      await cancelSlip(selectedSlipForCancel.id, reason.trim())
      toast({ title: "Case cancelled", description: "The case was cancelled successfully.", duration: 3000 })
      setCancelSlipModalOpen(false); setSelectedSlipForCancel(null); refreshCurrentListing()
    } catch (error) {
      toast({ title: "Unable to cancel case", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setCancelSlipSubmitting(false)
    }
  }

  const handleOpenHoldCase = (row: V2CaseRowData) => {
    if (!slipCanHold({ locationId: row.locationId, location: row.location })) {
      toast({ title: "Cannot put on hold", description: SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE, variant: "destructive", duration: 5000 })
      return
    }
    setSelectedSlipForHold(row)
    setHoldSlipModalOpen(true)
  }

  const handleConfirmHoldCase = async (reason: string) => {
    if (!selectedSlipForHold?.id || !reason.trim()) return
    setHoldSlipSubmitting(true)
    try {
      await holdSlip(selectedSlipForHold.id, reason.trim())
      toast({ title: "Case put on hold", description: "The case has been put on hold successfully.", duration: 3000 })
      setHoldSlipModalOpen(false); setSelectedSlipForHold(null); refreshCurrentListing()
    } catch (error) {
      toast({ title: "Unable to put case on hold", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setHoldSlipSubmitting(false)
    }
  }

  const handleCopyCaseIdentifier = async (row: V2CaseRowData) => {
    const value = row.slipNumber || row.caseNumber || String(row.id)
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: "Copied", description: value + " copied to clipboard.", duration: 2500 })
    } catch {
      toast({ title: "Copy failed", description: "Could not copy the case identifier.", variant: "destructive" })
    }
  }

  const handleDriverPrint = async (slip: V2CaseRowData, slots: number[]) => {
    try {
      const data = await fetchDriverPrintData([slip.id])
      if (!data?.slips?.length) { alert("Failed to fetch driver print data."); return }
      openDriverLabelsWindow(data.slips[0], slots)
    } catch { alert("Failed to generate driver labels.") }
  }

  const handleBulkPrintPaperSlip = () => {
    if (!selected.length) return
    const selectedRows = slips.filter((slip) => selected.includes(slip.id))
    const slipIds = selectedRows
      .map((r) => (typeof r.caseId === "number" && !isNaN(r.caseId) ? r.caseId : (typeof r.id === "number" && !isNaN(r.id) ? r.id : null)))
      .filter((id): id is number => typeof id === "number" && !isNaN(id))
    if (!slipIds.length) {
      toast({ title: "No valid slips", description: "Please select slips with valid slip IDs.", variant: "destructive" })
      return
    }
    printPaperSlip(slipIds, [])
  }

  const handleBulkDriverPrint = async () => {
    if (!selected.length) {
      toast({ title: "No slips selected", description: "Please select slips to print.", variant: "destructive" })
      return
    }
    try {
      const data = await fetchDriverPrintData(selected)
      if (!data?.slips?.length) {
        toast({ title: "Failed to fetch driver print data.", variant: "destructive" })
        return
      }
      const allSlots = Array.from({ length: 8 }, (_, i) => i)
      data.slips.forEach((driverSlip, index) => {
        setTimeout(() => openDriverLabelsWindow(driverSlip, allSlots), index * 500)
      })
    } catch {
      toast({ title: "Failed to bulk print driver labels.", variant: "destructive" })
    }
  }

  const openDriverLabelsWindow = (driverSlip: any, selectedSlots: number[]) => {
    const iframe = document.createElement("iframe")
    iframe.style.cssText = "position:absolute;left:-9999px;width:0;height:0;border:none"
    document.body.appendChild(iframe)
    const content = Array.from({ length: 8 }, (_, i) =>
      selectedSlots.includes(i)
        ? `<div class="driver-label"><div class="header"><div><div class="bold">${driverSlip.lab_name || ""}</div><div>OFC: ${driverSlip.office_code || ""}</div><div>PT: ${driverSlip.pt_name || ""}</div><div>DR: ${driverSlip.doctor_name || ""}</div></div><div class="qr"><img src="${driverSlip.qr_code || ""}" /></div></div><div class="body"><div>Stage: ${driverSlip.stage_code || ""} PAN#: ${driverSlip.case_pan_number || ""}</div><div>CASE#: ${driverSlip.case_number || ""} SLIP#: ${driverSlip.slip_number || ""}</div></div></div>`
        : '<div class="empty"></div>'
    ).join("")
    const html = `<!DOCTYPE html><html><head><style>body{margin:0;padding:20px;font-family:Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}.driver-label{border:2px solid #000;padding:12px;min-height:200px}.empty{border:none}.bold{font-weight:bold}.header{display:flex;justify-content:space-between}.qr img{width:58px;height:58px}.body{border-top:1px solid #ccc;margin-top:10px;padding-top:6px;font-size:11px}@media print{body{margin:0}}</style></head><body><div class="grid">${content}</div><script>setTimeout(()=>{window.print()},500)<\/script></body></html>`
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (doc) { doc.open(); doc.write(html); doc.close() }
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe) }, 5000)
  }

  const advancedFilterContent = showAdvancedFilter ? (
    <div className="border-b border-[#e5e7eb] bg-white px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700"
          onClick={handleClearAdvancedFilters}
        >
          Clear all Filters
        </Button>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="group w-full justify-start text-left text-xs font-normal">
              <SlipListingCalendarIcon className="mr-2" />
              {dateRange.start ? format(dateRange.start, "PPP") : <span className="text-gray-500">Start Date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateRange.start}
              onSelect={(date) => setDateRange((prev) => ({ ...prev, start: date }))}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="group w-full justify-start text-left text-xs font-normal">
              <SlipListingCalendarIcon className="mr-2" />
              {dateRange.end ? format(dateRange.end, "PPP") : <span className="text-gray-500">End Date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={dateRange.end}
              onSelect={(date) => setDateRange((prev) => ({ ...prev, end: date }))}
              disabled={(date) =>
                date > new Date() ||
                date < new Date("1900-01-01") ||
                Boolean(dateRange.start && date < dateRange.start)
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Input
          placeholder="Search patient name, slip #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs"
        />

        <Select value={selectedStatuses[0] ?? "All"} onValueChange={(value) => setSelectedStatuses(value === "All" ? [] : [value])}>
          <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            {allStatuses.filter(Boolean).map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={officeFilter} onValueChange={setOfficeFilter}>
          <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="All Offices/Lab" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Offices/Lab</SelectItem>
            {allOffices.filter(Boolean).map((office) => (
              <SelectItem key={office} value={office}>{office}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Select value={productType} onValueChange={setProductType}>
          <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
            <span className="text-sm">{productType === "All" ? "All product type" : productType}</span>
          </SelectTrigger>
          <SelectContent className="[&_[data-radix-select-item-indicator]]:hidden [&_[role=option]]:pl-2">
            <SelectItem value="All">All product type</SelectItem>
            {allProductTypes.filter((product) => product && product !== "Unknown").map((product) => (
              <SelectItem key={product} value={product}>{product}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Stages</SelectItem>
            {allStages.map((stage) => (
              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={doctorFilter} onValueChange={setDoctorFilter}>
          <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="All Doctors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Doctors</SelectItem>
            {allDoctors.filter(Boolean).map((doctor) => (
              <SelectItem key={doctor} value={doctor}>{doctor}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={officeLabFilter} onValueChange={setOfficeLabFilter}>
          <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="All Office & Lab" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Office & Lab</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <Select
          value={selectedLocations.length === 1 ? selectedLocations[0] : "All"}
          onValueChange={(value) => setSelectedLocations(value === "All" ? [] : [value])}
        >
          <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_LOCATION_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="All Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Location</SelectItem>
            {SLIP_LOCATION_FILTER_OPTIONS.map((loc) => (
              <SelectItem key={loc.id} value={String(loc.id)}>
                {loc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-base">
          <span className="relative">
            <input
              type="checkbox"
              checked={showWithAttachments}
              onChange={(e) => setShowWithAttachments(e.target.checked)}
              className="sr-only"
            />
            <span className={`block h-6 w-11 rounded-full transition-colors ${showWithAttachments ? "bg-blue-600" : "bg-gray-300"}`}>
              <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${showWithAttachments ? "translate-x-5" : "translate-x-0.5"}`} />
            </span>
          </span>
          Show only cases with attachments
        </label>
      </div>
    </div>
  ) : null

  return (
    <div className="min-h-screen">
      <div className="px-4 py-2">
        <HIPAAComplianceBanner variant="default" showDetails={false} />
      </div>

      <main className="w-full px-4 pb-8">
        <V3CaseWidget
          search={search}
          onSearchChange={setSearch}
          onSearchEnter={() => {
            if (slipsPage.length === 1) router.push(buildVirtualSlipV2Path(slipsPage[0].id))
          }}
          onAdvancedFilterClick={() => setShowAdvancedFilter((open) => !open)}
          advancedFilterContent={advancedFilterContent}
          locations={selectedLocations}
          onLocationChange={handleLocationFilterChange}
          statuses={selectedStatuses}
          onStatusChange={handleStatusFilterChange}
          onClearQuickFilters={handleClearQuickFilters}
          rows={slipsPage}
          loading={loading}
          selected={selected}
          selectAllChecked={selectAllHeaderChecked}
          onSelectAll={handleSelectAllPage}
          onSelectRow={(id) => setSelected((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])}
          rowActions={{
            onOpen: (row) => router.push(buildVirtualSlipV2Path(row.id)),
            onPrintPaperSlip: handlePrintPaperSlip,
            onPrintDriverLabel: (slip) => { setSelectedSlipForDriverTags(slip); setShowPrintDriverTags(true) },
            onPrintStatement: handlePrintStatement,
            onCallLog: (slip) => { setSelectedSlipForCallLog(slip); setShowCallLogModal(true) },
            onAddOns: (slip) => { setSelectedSlipForAddOns(slip); setShowAddOnsModal(true); void loadAddonInputsForSlip(slip.id) },
            onAttachment: (slip) => {
              setSelectedCaseForAttachment({ caseId: slip.caseId ?? slip.id, caseNumber: slip.caseNumber ?? "", patient: slip.patient ?? "", doctor: slip.doctor ?? "" })
              setShowAttachModal(true)
            },
            onCopy: (row) => void handleCopyCaseIdentifier(row),
            onEdit: (slip) => router.push(buildVirtualSlipV2Path(slip.id)),
            onHold: handleOpenHoldCase,
            onChangeDueDate: () => {},
            onDriverHistory: (slip) => { setSelectedSlipForDriverHistory(slip); setShowDriverHistoryModal(true) },
            onReadyToSend: handleOpenReadyToSend,
            onSendBack: () => {},
            onRush: () => {},
            onCancel: (slip) => { setSelectedSlipForCancel(slip); setCancelSlipModalOpen(true) },
          }}
          canPrintStatement={canPrintStatement}
          canSendBack={() => false}
          officeProfile
          onBulkPrintDriverLabel={() => void handleBulkDriverPrint()}
          onBulkPrintPaperSlip={handleBulkPrintPaperSlip}
          printMenuRow={printDropdownOpen}
          moreMenuRow={menuRow}
          onPrintMenuRowChange={setPrintDropdownOpen}
          onMoreMenuRowChange={setMenuRow}
          currentPage={currentPage}
          totalPages={maxPage}
          totalCount={totalListingCount}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={(value) => { setItemsPerPage(value); setCurrentPage(1) }}
          onPageChange={setCurrentPage}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          rushCasePanColor={null}
        />

        {/* Archive Confirm */}
        <Dialog open={archiveConfirm !== null} onOpenChange={(v) => { if (!v) setArchiveConfirm(null) }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Archive Case</DialogTitle></DialogHeader>
            <div className="py-2">Are you sure you want to archive {archiveConfirm === -1 ? "the selected cases" : "this case"}?</div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => setArchiveConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => setArchiveConfirm(null)}>Archive</Button>
            </div>
          </DialogContent>
        </Dialog>

        {paperSlipPortal}
        <LoadingOverlay isLoading={isPrinting} title="Preparing Paper Slip" message="Please wait while we prepare your paper slip for printing…" />

        <SlipAttachmentBrowserDialog
          open={showAttachModal && !!selectedCaseForAttachment}
          onClose={() => { setShowAttachModal(false); setSelectedCaseForAttachment(null) }}
          caseId={selectedCaseForAttachment?.caseId}
          caseNumber={selectedCaseForAttachment?.caseNumber}
          doctorName={selectedCaseForAttachment?.doctor}
          patientName={selectedCaseForAttachment?.patient}
          isCaseSubmitted={false}
        />

        <ReadyToSendModal
          open={showReadyToSendModal}
          onClose={() => { if (!readyToSendSubmitting) { setShowReadyToSendModal(false); setReadyToSendSlip(null) } }}
          onConfirm={handleConfirmReadyToSend}
          submitting={readyToSendSubmitting}
          slipId={readyToSendSlip?.id ?? 0}
          office={readyToSendSlip?.officeCode}
          patientName={readyToSendSlip?.patient}
          slipNumber={readyToSendSlip?.slipNumber}
          location={readyToSendSlip?.location}
          title="Ready to send"
          signatureRequired={readyToSendRequired}
        />

        <CaseActionModal
          open={cancelSlipModalOpen}
          onClose={() => { if (cancelSlipSubmitting) return; setCancelSlipModalOpen(false); setSelectedSlipForCancel(null) }}
          onSubmit={handleConfirmCancelCase}
          actionType="cancel"
          title="Cancel Case"
          description="You are cancelling this case. This action cannot be undone and will mark the case as inactive."
          icon={<X />}
          iconBgColor="#fdecec"
          iconColor="#D32F2F"
          buttonText={cancelSlipSubmitting ? "Cancelling..." : "Cancel Case"}
          buttonColor="error"
          reasonPlaceholder="Please provide a reason for case cancellation."
          warning="This action cannot be undone and will archive the case."
        />

        <CaseActionModal
          open={holdSlipModalOpen}
          onClose={() => { if (holdSlipSubmitting) return; setHoldSlipModalOpen(false); setSelectedSlipForHold(null) }}
          onSubmit={handleConfirmHoldCase}
          actionType="hold"
          title="Put Case On Hold"
          description="You are putting this case on hold. The delivery date will be recalculated when the case is resumed."
          icon={<VirtualSlipPauseIcon className="h-7 w-7" />}
          iconBgColor="#FFF3DF"
          iconColor="#FFB400"
          buttonText={holdSlipSubmitting ? "Saving…" : "Put case on hold"}
          buttonColor="warning"
          reasonPlaceholder="Please provide a reason for putting case on hold."
        />

        <DriverHistoryModal
          isOpen={showDriverHistoryModal}
          onClose={() => setShowDriverHistoryModal(false)}
          slip={selectedSlipForDriverHistory}
        />

        <AddOnsModal
          isOpen={showAddOnsModal}
          onClose={() => { setShowAddOnsModal(false); setAddonInputs(null) }}
          onAddAddOns={() => {}}
          labId={0}
          productId=""
          arch="maxillary"
          products={addonInputs?.addonProducts ?? []}
          archSlots={addonInputs?.addonArchSlots ?? []}
          slipId={selectedSlipForAddOns?.id}
          onSlipAddonsSaved={refreshCurrentListing}
        />

        <CallLogModal
          isOpen={showCallLogModal}
          onClose={() => setShowCallLogModal(false)}
          slipNumber={selectedSlipForCallLog?.id ? String(selectedSlipForCallLog.id) : ""}
        />

        <PrintDriverTagsModal
          isOpen={showPrintDriverTags}
          slip={selectedSlipForDriverTags}
          onClose={() => setShowPrintDriverTags(false)}
          onRegularPrint={async (slip, allSlots) => { if (slip) await handleDriverPrint(slip, allSlots.map((v, i) => v ? i : -1).filter((i) => i !== -1)) }}
          onGenerateLabels={async (slip, selectedSlots) => { if (slip) await handleDriverPrint(slip, selectedSlots.map((v, i) => v ? i : -1).filter((i) => i !== -1)) }}
        />
      </main>
    </div>
  )
}

export default function OfficeCaseManagementPageWrapper() {
  return (
    <SlipProvider>
      <OfficeCaseManagementPage />
    </SlipProvider>
  )
}
