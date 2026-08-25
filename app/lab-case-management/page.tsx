"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { X } from "lucide-react"
import { format } from "date-fns"
import { useSlipContext } from "./SlipContext"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import SlipAttachmentBrowserDialog from "@/components/slip-attachment-browser-dialog"
import ChangeDateModal from "@/components/change-date-modal"
import DriverHistoryModal from "@/components/driver-history-modal"
import ReadyToSendModal from "@/components/ready-to-send-modal"
import { useSignatureRequirementSettings } from "@/hooks/use-signature-requirement-settings"
import AddOnsModal from "@/components/add-ons-modal"
import { buildVirtualSlipAddonInputs, type VirtualSlipAddonInputs } from "@/lib/virtual-slip-addon-inputs"
import { virtualSlipRushSlotsShareProduct } from "@/lib/virtual-slip-rush-slots"
import { getBusinessSettings, type CaseSchedule, type BusinessHour } from "@/lib/api-business-settings"
import { resolveLabIdFromSlipDetails } from "@/lib/add-stage/preload-state"
import { resolveLibraryCustomerId } from "@/components/case-design-center/utils/libraryCustomerId"
import CallLogModal from "@/components/call-log-modal"
import PrintPreviewModal from "@/components/print-preview-modal"
import DriverLabelSheetModal from "@/components/driver-labels/DriverLabelSheetModal"
import type { DriverLabelSlip } from "@/lib/driver-labels/generate-driver-label-pdf"
import CaseActionModal from "@/components/CaseActionModal"
import RushRequestModal from "@/components/rush-request-modal"
import SendCaseBackToOfficeModal from "@/components/send-case-back-to-office-modal"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { HIPAAComplianceBanner } from "@/components/hipaa-compliance-banner"
import { usePermissionCapabilities } from "@/hooks/use-permission-capabilities"
import { useGenerateVirtualStatementMutation } from "@/lib/redux/api/billingApi"
import { resolveCaseStatementBillingId } from "@/lib/case-statement-print"
import {
  LAB_SLIP_STATUS_OPTIONS,
  SLIP_LISTING_DEFAULT_PER_PAGE,
  SLIP_LOCATION_FILTER_OPTIONS,
  parseLocationFilterFromUrl,
} from "@/app/lab-case-management/lab-slip-listing-constants"
import {
  SLIP_LISTING_ADVANCED_FILTER_LOCATION_SELECT_TRIGGER_CLASS,
  SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS,
} from "@/lib/slip-listing-filter-select"
import { slipCanSendBackToOffice, slipCanHold, SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE } from "@/lib/slip-location"
import { VirtualSlipPauseIcon } from "@/components/virtual-slip/VirtualSlipPauseIcon"
import { SlipListingCalendarIcon } from "@/components/slip-listing/SlipListingCalendarIcon"
import { resolveListingCustomerId } from "@/lib/customer-scope"
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes"
import { usePaperSlipInPagePrintV2 } from "@/hooks/use-paper-slip-in-page-print-v2"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { useDebounce } from "@/lib/performance-utils"
import { V3CaseWidget } from "./components/V3CaseWidget"
import type { SortDirection } from "./components/V3CaseTable"
import type { ColumnKey } from "./components/V3FilterBar"
import type { V2CaseRowData } from "@/app/lab-case-management/v2/case-table-types"

function formatYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getLabCustomerId(): number | null {
  return resolveListingCustomerId()
}

function canSendBackToOffice(row: { locationId?: number; location: string }): boolean {
  return slipCanSendBackToOffice(row)
}

function canPrintStatement(row: { billingId?: number | null }): boolean {
  return typeof row.billingId === "number" && Number.isFinite(row.billingId)
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
    const sorted = [...rows].sort((a, b) => {
      const locDiff = locationSequenceValue(a) - locationSequenceValue(b)
      if (locDiff !== 0) return locDiff
      if (!key) return 0
      const aValue = getSortValue(a, key)
      const bValue = getSortValue(b, key)
      if (aValue < bValue) return direction === "asc" ? -1 : 1
      if (aValue > bValue) return direction === "asc" ? 1 : -1
      return 0
    })
    return sorted
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
  if (value === "deleted") return "deleted"
  return value
}

export default function LabSlipV3Page() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { print: printPaperSlip, portal: paperSlipPortal, isPrinting } = usePaperSlipInPagePrintV2()
  const initialLocation = parseLocationFilterFromUrl(searchParams.get("location"))

  const [search, setSearch] = useState("")
  const [selectedLocations, setSelectedLocations] = useState<string[]>(() => initialLocation === "All" ? ["3"] : [initialLocation])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["In Progress"])
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
  const [userFilter, setUserFilter] = useState("All")
  const [showWithAttachments, setShowWithAttachments] = useState(false)
  const [sortKey, setSortKey] = useState<ColumnKey | null>("dueDate")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const [showAttachModal, setShowAttachModal] = useState(false)
  const [selectedCaseForAttachment, setSelectedCaseForAttachment] = useState<{
    caseId: number; caseNumber: string; patient: string; doctor: string
  } | null>(null)
  const [showChangeDateModal, setShowChangeDateModal] = useState(false)
  const [selectedSlipForDateChange, setSelectedSlipForDateChange] = useState<V2CaseRowData | null>(null)
  const [showDriverHistoryModal, setShowDriverHistoryModal] = useState(false)
  const [selectedSlipForDriverHistory, setSelectedSlipForDriverHistory] = useState<V2CaseRowData | null>(null)
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [selectedSlipForAddOns, setSelectedSlipForAddOns] = useState<V2CaseRowData | null>(null)
  const [addonInputs, setAddonInputs] = useState<VirtualSlipAddonInputs | null>(null)
  const [showCallLogModal, setShowCallLogModal] = useState(false)
  const [selectedSlipForCallLog, setSelectedSlipForCallLog] = useState<V2CaseRowData | null>(null)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [selectedSlipForPrint, setSelectedSlipForPrint] = useState<V2CaseRowData | null>(null)
  const [showDriverLabelModal, setShowDriverLabelModal] = useState(false)
  const [driverLabelSlips, setDriverLabelSlips] = useState<DriverLabelSlip[]>([])
  const [driverLabelLoading, setDriverLabelLoading] = useState(false)
  const [showReadyToSendModal, setShowReadyToSendModal] = useState(false)
  const [readyToSendSlip, setReadyToSendSlip] = useState<V2CaseRowData | null>(null)
  const [readyToSendSubmitting, setReadyToSendSubmitting] = useState(false)
  const [showRushModal, setShowRushModal] = useState(false)
  const [selectedSlipForRush, setSelectedSlipForRush] = useState<V2CaseRowData | null>(null)
  const [rushCaseSchedule, setRushCaseSchedule] = useState<CaseSchedule | null>(null)
  const [labBusinessHours, setLabBusinessHours] = useState<BusinessHour[] | null>(null)
  const [showSendBackToOfficeModal, setShowSendBackToOfficeModal] = useState(false)
  const [selectedSlipForSendBackToOffice, setSelectedSlipForSendBackToOffice] = useState<V2CaseRowData | null>(null)
  const [sendBackToOfficeSubmitting, setSendBackToOfficeSubmitting] = useState(false)
  const [cancelSlipModalOpen, setCancelSlipModalOpen] = useState(false)
  const [selectedSlipForCancel, setSelectedSlipForCancel] = useState<V2CaseRowData | null>(null)
  const [cancelSlipSubmitting, setCancelSlipSubmitting] = useState(false)
  const [deleteSlipModalOpen, setDeleteSlipModalOpen] = useState(false)
  const [selectedSlipForDelete, setSelectedSlipForDelete] = useState<V2CaseRowData | null>(null)
  const [deleteSlipSubmitting, setDeleteSlipSubmitting] = useState(false)
  const [restoreSlipModalOpen, setRestoreSlipModalOpen] = useState(false)
  const [selectedSlipForRestore, setSelectedSlipForRestore] = useState<V2CaseRowData | null>(null)
  const [restoreSlipSubmitting, setRestoreSlipSubmitting] = useState(false)
  const [holdSlipModalOpen, setHoldSlipModalOpen] = useState(false)
  const [selectedSlipForHold, setSelectedSlipForHold] = useState<V2CaseRowData | null>(null)
  const [holdSlipSubmitting, setHoldSlipSubmitting] = useState(false)

  const { readyToSendRequired } = useSignatureRequirementSettings(showReadyToSendModal)

  const {
    slips, loading, fetchLabSlips, fetchDriverPrintData,
    createCustomDeliveryDate, fetchOfficeSlips, fetchCustomDeliveryDates,
    readyToSend, labListingPagination, updateSlipAttachmentState, rushCasePanColor,
  } = useSlipContext()
  const { fetchProductAddons, requestSlipRush, cancelSlipRush, cancelSlip, softDeleteSlip, restoreSlip, holdSlip, sendBackToOfficeSlip } = useSlipCreation()
  const { canCancelCase, canDeleteCase } = usePermissionCapabilities()
  const [generateVirtualStatement] = useGenerateVirtualStatementMutation()
  const router = useRouter()

  const dateRangeKey = useMemo(
    () => `${dateRange.start?.toISOString() ?? ""}|${dateRange.end?.toISOString() ?? ""}`,
    [dateRange.start, dateRange.end]
  )
  const debouncedSearch = useDebounce(search, 400)
  const filterSig = useMemo(
    () => [
      debouncedSearch,
      selectedLocations.join(","),
      selectedStatuses.join(","),
      officeFilter,
      productType,
      dateRangeKey,
      showWithAttachments ? "attachments" : "",
    ].join("|"),
    [debouncedSearch, selectedLocations, selectedStatuses, officeFilter, productType, dateRangeKey, showWithAttachments]
  )
  const prevFilterSigRef = useRef<string | null>(null)

  useEffect(() => {
    const customerId = getLabCustomerId()
    if (!customerId) return

    const filtersJustChanged = prevFilterSigRef.current !== null && prevFilterSigRef.current !== filterSig
    if (filtersJustChanged) {
      prevFilterSigRef.current = filterSig
      if (currentPage !== 1) setCurrentPage(1)
    } else {
      prevFilterSigRef.current = filterSig
    }

    const pageToFetch = filtersJustChanged ? 1 : currentPage
    const selectedLocationIds = selectedLocations.map(Number).filter((id) => !Number.isNaN(id))
    void fetchLabSlips(customerId, {
      q: debouncedSearch.trim() || undefined,
      location_ids: selectedLocationIds.length > 0 ? selectedLocationIds : undefined,
      office_code: officeFilter !== "All" ? officeFilter : undefined,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
      has_attachments: showWithAttachments ? true : undefined,
      product_name: productType !== "All" ? productType : undefined,
      delivery_date_start: dateRange.start ? formatYmd(dateRange.start) : undefined,
      delivery_date_end: dateRange.end ? formatYmd(dateRange.end) : undefined,
      page: pageToFetch,
      per_page: itemsPerPage,
    })
  }, [filterSig, currentPage, itemsPerPage, fetchLabSlips, selectedLocations, selectedStatuses, officeFilter, showWithAttachments, productType, dateRange.start, dateRange.end])

  // Advanced-filter dropdown options accumulate across fetches instead of being
  // derived solely from the latest (already-filtered) `slips` response — otherwise
  // narrowing one filter (e.g. product type) shrinks `slips` and makes every other
  // dropdown's option list (and possibly its selected value) disappear.
  const seenOfficesRef = useRef<Set<string>>(new Set())
  const seenDoctorsRef = useRef<Set<string>>(new Set())
  const seenUsersRef = useRef<Set<string>>(new Set())
  const seenProductTypesRef = useRef<Set<string>>(new Set())
  const seenStagesRef = useRef<Set<string>>(new Set())
  const seenStatusesRef = useRef<Set<string>>(new Set())

  useMemo(() => {
    slips.forEach((s) => {
      if (s.officeCode) seenOfficesRef.current.add(s.officeCode)
      seenDoctorsRef.current.add(s.doctor || "Unknown")
      seenUsersRef.current.add(s.user || "Unknown")
      seenProductTypesRef.current.add(s.productType || "Unknown")
      if (s.product) seenStagesRef.current.add(s.product)
      if (s.status) seenStatusesRef.current.add(s.status)
    })
  }, [slips])

  const allOffices = useMemo(() => Array.from(seenOfficesRef.current), [slips])
  const allStatuses = useMemo(
    () => Array.from(new Set([...LAB_SLIP_STATUS_OPTIONS, ...seenStatusesRef.current])),
    [slips]
  )
  const allDoctors = useMemo(() => Array.from(seenDoctorsRef.current), [slips])
  const allUsers = useMemo(() => Array.from(seenUsersRef.current), [slips])
  const allProductTypes = useMemo(() => Array.from(seenProductTypesRef.current), [slips])
  const allStages = useMemo(() => Array.from(seenStagesRef.current), [slips])

  const slipsPage = useMemo(() => {
    const selectedStatusSet = new Set(selectedStatuses.map(normalizeStatusFilterValue))
    const filtered = slips.filter((slip) => {
      if (selectedLocations.length > 0 && !selectedLocations.includes(String(slip.locationId ?? ""))) {
        return false
      }
      if (selectedStatusSet.size > 0 && !selectedStatusSet.has(normalizeStatusFilterValue(slip.status || ""))) {
        return false
      }
      if (doctorFilter !== "All" && slip.doctor !== doctorFilter) {
        return false
      }
      if (userFilter !== "All" && slip.user !== userFilter) {
        return false
      }
      if (stageFilter !== "All" && slip.product !== stageFilter) {
        return false
      }
      return true
    })
    return sortRows(filtered, sortKey, sortDirection, selectedLocations.length === 0)
  }, [selectedLocations, selectedStatuses, slips, doctorFilter, userFilter, stageFilter, sortKey, sortDirection])

  const handleSortChange = useCallback((key: ColumnKey) => {
    if (sortKey === key) {
      setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }, [sortKey])
  const clientFiltering = doctorFilter !== "All" || userFilter !== "All" || stageFilter !== "All"
  const totalListingCount = clientFiltering ? slipsPage.length : labListingPagination?.total ?? slips.length
  const maxPage = clientFiltering ? 1 : Math.max(1, labListingPagination?.last_page ?? 1)

  const handleLocationFilterChange = (value: string) => {
    setSelectedLocations((current) => {
      if (value === "All") return []
      return current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    })
  }

  const handleStatusFilterChange = (status: string) => {
    const normalized = normalizeStatusFilterValue(status)
    setSelectedStatuses((current) => {
      if (normalized === "deleted") {
        return current.some((item) => normalizeStatusFilterValue(item) === "deleted")
          ? []
          : ["Deleted"]
      }
      const withoutDeleted = current.filter((item) => normalizeStatusFilterValue(item) !== "deleted")
      return withoutDeleted.some((item) => normalizeStatusFilterValue(item) === normalized)
        ? withoutDeleted.filter((item) => normalizeStatusFilterValue(item) !== normalized)
        : [...withoutDeleted, status]
    })
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
    setUserFilter("All")
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
    const customerId = getLabCustomerId()
    if (!customerId) return
    void fetchLabSlips(customerId)
  }, [fetchLabSlips])

  const refreshSlipsAfterCustomDeliveryDate = () => {
    try {
      if (typeof window !== "undefined") {
        const customerId = resolveListingCustomerId()
        const customerType = localStorage.getItem("customerType")
        if (customerId) {
          if (customerType === "lab") {
            void fetchLabSlips(customerId)
          } else if (customerType === "office") {
            void fetchOfficeSlips(customerId)
          } else {
            void fetchLabSlips(customerId)
            void fetchOfficeSlips(customerId)
          }
        }
      }
    } catch (err) {
      console.error("Error refreshing slips after creating custom date:", err)
    }
  }

  const loadAddonInputsForSlip = useCallback(async (slipId: number) => {
    setAddonInputs(null)
    setRushCaseSchedule(null)
    setLabBusinessHours(null)
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
      // Load the lab's rush settings (fee %, turnaround, weekoffs/holidays) from the
      // same slip details payload, exactly as the virtual slip does.
      const customerId = resolveLibraryCustomerId(resolveLabIdFromSlipDetails(details))
      if (customerId) {
        getBusinessSettings(customerId)
          .then((settings) => {
            setRushCaseSchedule(settings?.case_schedule ?? null)
            setLabBusinessHours(settings?.business_hours ?? null)
          })
          .catch(() => {
            setRushCaseSchedule(null)
            setLabBusinessHours(null)
          })
      }
    } catch {
      setAddonInputs(null)
    }
  }, [])

  // --- Row action handlers ---
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
    const customerType = (typeof window !== "undefined" && localStorage.getItem("customerType")) || "lab"
    const idToSend: number | null = customerType === "office"
      ? (typeof slip.caseId === "number" && !isNaN(slip.caseId) ? slip.caseId : null)
      : (typeof slip.id === "number" && !isNaN(slip.id) ? slip.id : null)
    if (idToSend === null) {
      toast({ title: "No valid slip", description: "This slip does not have a valid slip ID.", variant: "destructive" })
      return
    }
    printPaperSlip([idToSend], [])
  }

  const handlePrintStatement = (slip: V2CaseRowData) => {
    void (async () => {
      const billingId = resolveCaseStatementBillingId(slip)
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

  const handleOpenRushCase = (slip: V2CaseRowData) => {
    setSelectedSlipForRush(slip); setShowRushModal(true); void loadAddonInputsForSlip(slip.id)
  }
  const handleRemoveRushCase = async () => {
    if (!selectedSlipForRush?.id) return
    try {
      await cancelSlipRush(selectedSlipForRush.id)
      toast({ title: "Rush removed", description: "The rush request was cancelled.", duration: 3000 })
      setShowRushModal(false); setSelectedSlipForRush(null); refreshCurrentListing()
    } catch (error) {
      toast({ title: "Unable to remove rush", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    }
  }
  const handleConfirmRushCase = async (rushData: { targetDate?: string | null }) => {
    if (!selectedSlipForRush?.id) return
    if (!rushData?.targetDate) {
      toast({ title: "Rush date required", description: "Please select a target delivery date first.", variant: "destructive" })
      return
    }
    try {
      await requestSlipRush(selectedSlipForRush.id, { requested_delivery_date: rushData.targetDate })
      toast({ title: "Rush case updated", description: "The rush request was submitted successfully.", duration: 3000 })
      setShowRushModal(false); setSelectedSlipForRush(null); refreshCurrentListing()
    } catch (error) {
      toast({ title: "Unable to rush case", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    }
  }

  const handleConfirmSendBackToOffice = async (reason: string) => {
    if (!selectedSlipForSendBackToOffice?.id || !reason.trim()) return
    setSendBackToOfficeSubmitting(true)
    try {
      await sendBackToOfficeSlip(selectedSlipForSendBackToOffice.id, reason.trim())
      toast({ title: "Case sent back to office", description: "The case was returned to the office successfully.", duration: 3000 })
      setShowSendBackToOfficeModal(false); setSelectedSlipForSendBackToOffice(null); refreshCurrentListing()
    } catch (error) {
      toast({ title: "Unable to send case back", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setSendBackToOfficeSubmitting(false)
    }
  }

  const handleConfirmCancelCase = async (reason: string) => {
    if (!selectedSlipForCancel?.id || !reason.trim()) return
    setCancelSlipSubmitting(true)
    try {
      const res = await cancelSlip(selectedSlipForCancel.id, reason.trim())
      toast({ title: "Case cancelled", description: res?.message ?? "The case was cancelled successfully.", duration: 3000 })
      setCancelSlipModalOpen(false); setSelectedSlipForCancel(null); refreshCurrentListing()
    } catch (error) {
      toast({ title: "Unable to cancel case", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive", duration: 5000 })
    } finally {
      setCancelSlipSubmitting(false)
    }
  }

  const handleConfirmDeleteSlip = async (reason: string) => {
    if (!selectedSlipForDelete?.id || !reason.trim()) return
    setDeleteSlipSubmitting(true)
    try {
      const res = await softDeleteSlip(selectedSlipForDelete.id, reason.trim())
      toast({ title: "Slip deleted", description: res?.message ?? "The slip was deleted successfully.", duration: 3000 })
      setDeleteSlipModalOpen(false); setSelectedSlipForDelete(null); refreshCurrentListing()
    } catch (error) {
      toast({ title: "Unable to delete slip", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive", duration: 5000 })
    } finally {
      setDeleteSlipSubmitting(false)
    }
  }

  const handleConfirmRestoreSlip = async (reason: string) => {
    if (!selectedSlipForRestore?.id) return
    setRestoreSlipSubmitting(true)
    try {
      const res = await restoreSlip(selectedSlipForRestore.id, reason.trim() || undefined)
      toast({ title: "Slip restored", description: res?.message ?? "The slip was restored to In Progress.", duration: 3000 })
      setRestoreSlipModalOpen(false); setSelectedSlipForRestore(null); refreshCurrentListing()
    } catch (error) {
      toast({ title: "Unable to restore slip", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive", duration: 5000 })
    } finally {
      setRestoreSlipSubmitting(false)
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
      const res = await holdSlip(selectedSlipForHold.id, reason.trim())
      toast({ title: "Case put on hold", description: res?.message ?? "The case has been put on hold successfully.", duration: 3000 })
      setHoldSlipModalOpen(false); setSelectedSlipForHold(null); refreshCurrentListing()
    } catch (error) {
      toast({ title: "Unable to put case on hold", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive", duration: 5000 })
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

  const openDriverLabelModal = async (rowIds: number[]) => {
    if (!rowIds.length) {
      toast({ title: "No slips selected", description: "Please select slips to print.", variant: "destructive" })
      return
    }
    setDriverLabelSlips([])
    setDriverLabelLoading(true)
    setShowDriverLabelModal(true)
    try {
      const data = await fetchDriverPrintData(rowIds)
      if (!data?.slips?.length) {
        toast({ title: "Failed to fetch driver print data.", variant: "destructive" })
        setShowDriverLabelModal(false)
        return
      }
      setDriverLabelSlips(data.slips as unknown as DriverLabelSlip[])
    } catch {
      toast({ title: "Failed to load driver labels.", variant: "destructive" })
      setShowDriverLabelModal(false)
    } finally {
      setDriverLabelLoading(false)
    }
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

        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All users</SelectItem>
            {allUsers.filter(Boolean).map((user) => (
              <SelectItem key={user} value={user}>{user}</SelectItem>
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

  const selectedStatementRow = selected.length === 1 ? slipsPage.find((row) => row.id === selected[0]) : undefined

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
            onPrintDriverLabel: (slip) => void openDriverLabelModal([slip.id]),
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
            onChangeDueDate: (slip) => { setSelectedSlipForDateChange(slip); setShowChangeDateModal(true) },
            onDriverHistory: (slip) => { setSelectedSlipForDriverHistory(slip); setShowDriverHistoryModal(true) },
            onReadyToSend: handleOpenReadyToSend,
            onAddStage: (slip) => router.push(`/add-new-stage?sourceSlipId=${slip.id}`),
            onSendBack: (slip) => { setSelectedSlipForSendBackToOffice(slip); setShowSendBackToOfficeModal(true) },
            onRush: handleOpenRushCase,
            onCancel: (slip) => { setSelectedSlipForCancel(slip); setCancelSlipModalOpen(true) },
            onDelete: (slip) => { setSelectedSlipForDelete(slip); setDeleteSlipModalOpen(true) },
            onRestore: (slip) => { setSelectedSlipForRestore(slip); setRestoreSlipModalOpen(true) },
          }}
          canPrintStatement={canPrintStatement}
          canSendBack={canSendBackToOffice}
          canCancelCase={canCancelCase}
          canDeleteCase={canDeleteCase}
          onBulkPrintDriverLabel={() => void openDriverLabelModal(selected)}
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
          rushCasePanColor={rushCasePanColor}
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

        {selectedSlipForDateChange && (
          <ChangeDateModal
            open={showChangeDateModal}
            onClose={() => { setShowChangeDateModal(false); setSelectedSlipForDateChange(null) }}
            patient={selectedSlipForDateChange.patient}
            stage={selectedSlipForDateChange.product || "Unknown Stage"}
            currentDate={new Date().toLocaleDateString()}
            deliveryDate={selectedSlipForDateChange.dueDate}
            deliveryTime="10:00"
            slipId={selectedSlipForDateChange.id}
            history={[]}
            onSaved={refreshSlipsAfterCustomDeliveryDate}
          />
        )}

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

        {(() => {
          const rushSlots = addonInputs?.rushArchSlots ?? []
          const hasMax = rushSlots.some((s) => s.arch === "maxillary" && s.isRushed)
          const hasMand = rushSlots.some((s) => s.arch === "mandibular" && s.isRushed)
          return (
            <RushRequestModal
              isOpen={showRushModal && rushSlots.length > 0}
              onClose={() => { setShowRushModal(false); setSelectedSlipForRush(null); setAddonInputs(null); setRushCaseSchedule(null); setLabBusinessHours(null) }}
              onConfirm={handleConfirmRushCase}
              isRushed={(addonInputs?.slipIsRush ?? false) || rushSlots.some((s) => s.isRushed)}
              existingRushDate={rushSlots.find((s) => s.existingRushDate)?.existingRushDate}
              onRemoveRush={handleRemoveRushCase}
              onRemoveRushByKey={() => { void handleRemoveRushCase() }}
              maxRushed={hasMax}
              maxExistingRushDate={rushSlots.find((s) => s.arch === "maxillary")?.existingRushDate}
              mandRushed={hasMand}
              mandExistingRushDate={rushSlots.find((s) => s.arch === "mandibular")?.existingRushDate}
              onRemoveMaxRush={hasMax ? handleRemoveRushCase : undefined}
              onRemoveMandRush={hasMand ? handleRemoveRushCase : undefined}
              archSlots={rushSlots}
              mirrorRushAcrossArches={virtualSlipRushSlotsShareProduct(rushSlots)}
              hasMaxillary={rushSlots.length > 0 ? rushSlots.some((s) => s.arch === "maxillary") : undefined}
              hasMandibular={rushSlots.length > 0 ? rushSlots.some((s) => s.arch === "mandibular") : undefined}
              product={{
                name: rushSlots[0]?.productName ?? selectedSlipForRush?.product ?? "Case",
                stage: rushSlots[0]?.stageName ?? selectedSlipForRush?.product ?? "Unknown Stage",
                deliveryDate: addonInputs?.deliveryDateIso || selectedSlipForRush?.dueDate || "",
                price: rushSlots.reduce((sum, s) => sum + (s.price ?? 0), 0),
              }}
              rushCaseSchedule={rushCaseSchedule}
              labBusinessHours={labBusinessHours}
            />
          )
        })()}

        <SendCaseBackToOfficeModal
          open={showSendBackToOfficeModal}
          onClose={() => { if (sendBackToOfficeSubmitting) return; setShowSendBackToOfficeModal(false); setSelectedSlipForSendBackToOffice(null) }}
          onConfirm={handleConfirmSendBackToOffice}
          loading={sendBackToOfficeSubmitting}
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
          open={deleteSlipModalOpen}
          onClose={() => { if (deleteSlipSubmitting) return; setDeleteSlipModalOpen(false); setSelectedSlipForDelete(null) }}
          onSubmit={handleConfirmDeleteSlip}
          actionType="delete"
          title="Delete Slip"
          description="You are soft-deleting this slip. It will be hidden from active listings and can be viewed with the Deleted filter."
          icon={<X />}
          iconBgColor="#f3f4f6"
          iconColor="#374151"
          buttonText={deleteSlipSubmitting ? "Deleting..." : "Delete Slip"}
          buttonColor="error"
          reasonPlaceholder="Please provide a reason for deleting this slip."
          warning="Soft-deleted slips stay recoverable via the Deleted filter."
        />

        <CaseActionModal
          open={restoreSlipModalOpen}
          onClose={() => { if (restoreSlipSubmitting) return; setRestoreSlipModalOpen(false); setSelectedSlipForRestore(null) }}
          onSubmit={handleConfirmRestoreSlip}
          actionType="restore"
          title="Restore Slip"
          description="You are restoring this deleted slip back to In Progress."
          icon={<X />}
          iconBgColor="#E8F5E9"
          iconColor="#43A047"
          buttonText={restoreSlipSubmitting ? "Restoring..." : "Restore to In Progress"}
          buttonColor="success"
          reasonPlaceholder="Optional reason for restoring this slip."
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

        <PrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          caseData={selectedSlipForPrint ? {
            lab: (selectedSlipForPrint as any).labName || "",
            address: (selectedSlipForPrint as any).labAddress || "",
            office: selectedSlipForPrint.officeCode || "",
            doctor: selectedSlipForPrint.doctor || "",
            patient: selectedSlipForPrint.patient || "",
            pickupDate: (selectedSlipForPrint as any).pickupDate || "",
            panNumber: selectedSlipForPrint.pan || "",
            caseNumber: selectedSlipForPrint.caseNumber || "",
            slipNumber: selectedSlipForPrint.slipNumber || String(selectedSlipForPrint.id),
            products: (selectedSlipForPrint as any).products || [],
            contact: (selectedSlipForPrint as any).labContact || "",
            email: (selectedSlipForPrint as any).labEmail || "",
          } : { lab: "", address: "", office: "", doctor: "", patient: "", pickupDate: "", panNumber: "", caseNumber: "", slipNumber: "", products: [], contact: "", email: "" }}
        />

        <DriverLabelSheetModal
          isOpen={showDriverLabelModal}
          onClose={() => setShowDriverLabelModal(false)}
          slips={driverLabelSlips}
          loading={driverLabelLoading}
        />
      </main>
    </div>
  )
}
