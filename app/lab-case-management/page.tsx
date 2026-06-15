"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { Filter, Columns, MoreVertical, ChevronDown, Check, Trash2, Eye, Copy, Phone, Download, Plus, X } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useSlipContext } from "./SlipContext";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import FileAttachmentModalContent from "@/components/file-attachment-modal-content"
import ChangeDateModal from "@/components/change-date-modal"
import DriverHistoryModal from "@/components/driver-history-modal"
import ReadyToSendModal from "@/components/ready-to-send-modal"
import { useSignatureRequirementSettings } from "@/hooks/use-signature-requirement-settings"
import AddOnsModal from "@/components/add-ons-modal"
import { buildVirtualSlipAddonInputs, type VirtualSlipAddonInputs } from "@/lib/virtual-slip-addon-inputs"
import CallLogModal from "@/components/call-log-modal"
import PrintPreviewModal from "@/components/print-preview-modal"
import PrintDriverTagsModal from "@/components/print-driver-tags-modal"
import CaseActionModal from "@/components/CaseActionModal"
import RushRequestModal from "@/components/rush-request-modal"
import SendCaseBackToOfficeModal from "@/components/send-case-back-to-office-modal"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast";
import { HIPAAComplianceBanner } from "@/components/hipaa-compliance-banner"
import { useGenerateVirtualStatementMutation } from "@/lib/redux/api/billingApi"
import { resolveCaseStatementBillingId } from "@/lib/case-statement-print"
import { buildLabCaseDropdownActions } from "./dropdown-actions.mjs"
import { buildPaperSlipPrintRoute } from "./paper-slip-print-route.mjs"
import {
  SLIP_LOCATION_FILTER_OPTIONS,
  LAB_SLIP_STATUS_OPTIONS,
  SLIP_LISTING_DEFAULT_PER_PAGE,
  parseLocationFilterFromUrl,
} from "@/app/lab-case-management/lab-slip-listing-constants"
import { slipCanSendBackToOffice } from "@/lib/slip-location"
import {
  SLIP_LISTING_ADVANCED_FILTER_LOCATION_SELECT_TRIGGER_CLASS,
  SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS,
  SLIP_LISTING_FILTER_SELECT_TRIGGER_CLASS,
} from "@/lib/slip-listing-filter-select"
import { isSlipCaseCancelled, isSlipCaseFinished } from "@/lib/slip-case-status"
import { resolveListingCustomerId } from "@/lib/customer-scope"
import { SlipListingCalendarIcon } from "@/components/slip-listing/SlipListingCalendarIcon"
import { SlipListingReadyToSendIcon } from "@/components/slip-listing/SlipListingReadyToSendIcon"
import { SlipListingVsIcon } from "@/components/slip-listing/SlipListingVsIcon"
import {
  SLIP_LISTING_ICON_HOVER_CLASS,
  SLIP_LISTING_ICON_SIZE_CLASS,
  slipListingActionIconButtonClass,
  slipListingIconButtonClass,
} from "@/components/slip-listing/slip-listing-icon-hover"
import { SlipListingVirtualSlipLink } from "@/components/slip-listing/SlipListingVirtualSlipLink"
import {
  SLIP_LISTING_VIEW_VIRTUAL_SLIP_ICON,
  SlipListingViewSlipLink,
} from "@/components/slip-listing/SlipListingViewSlipLink"
import { SlipListingLocationIconSlot } from "@/components/slip-listing/SlipListingLocationIconSlot"
import { SlipListingDueDateLabel } from "@/components/slip-listing/SlipListingDueDateLabel"
import { formatSlipListingPatientName } from "@/lib/slip-listing-patient-name"
import { slipListingRowClassName } from "@/lib/slip-listing-row-class"
import { SlipListingStatusBadge } from "@/components/slip-listing/SlipListingStatusBadge"
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes"
import { useDebounce } from "@/lib/performance-utils"

function formatYmd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getLabCustomerId(): number | null {
  return resolveListingCustomerId()
}

/** Prefer `locationId` from API; fall back to label match for older payloads */
function rowAtSlipLocation(row: { locationId?: number; location: string }, id: number): boolean {
  if (typeof row.locationId === "number" && row.locationId === id) return true
  const expected = SLIP_LOCATION_FILTER_OPTIONS.find((o) => o.id === id)?.label
  return !!(expected && row.location === expected)
}

function canSendBackToOffice(row: { locationId?: number; location: string }): boolean {
  return slipCanSendBackToOffice(row)
}

function canPrintStatement(row: { billingId?: number | null }): boolean {
  return typeof row.billingId === "number" && Number.isFinite(row.billingId)
}

const READY_TO_SEND_BLUE = "#0E66B2"

/** Virtual-slip icon asset folders — same glyphs used on the virtual slip page. */
const VS_CENTER_ICONS = "/icons/virtual-slip-center"
const VS_ACTION_ICONS = "/icons/virtual-slip-actions"

function InLabPaperPlaneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 31.85 32"
      className="h-[19px] w-[19px] flex-shrink-0"
      aria-hidden
    >
      <g fill={READY_TO_SEND_BLUE}>
        <path d="M11.9,32a13.51,13.51,0,0,1-.69-1.18c-1.08-2.52-2.16-5-3.2-7.56A2,2,0,0,0,6.77,22c-1.74-.7-3.47-1.43-5.2-2.16A2.11,2.11,0,0,1,0,17.52a2.47,2.47,0,0,1,1.37-1.67Q4.85,13.92,8.26,12q10-5.72,20-11.4A3.87,3.87,0,0,1,29.91,0a2,2,0,0,1,1.91,2.45c-.4,2.7-.83,5.4-1.25,8.1q-1.21,8-2.44,15.89c-.07.49-.14,1-.23,1.47a2.11,2.11,0,0,1-3.2,1.7c-2.06-.87-4.13-1.71-6.18-2.63a1.27,1.27,0,0,0-1.67.29c-1.39,1.42-2.84,2.79-4.27,4.17C12.42,31.59,12.25,31.72,11.9,32ZM30.79,1.74l-.25-.09L13,23.47c.26.13.37.21.49.26L25.08,28.6c1.18.5,1.66.2,1.86-1.09q1-6.6,2-13.19.93-6,1.85-12A3.26,3.26,0,0,0,30.79,1.74Zm-1.94,0-.11-.16L27.9,2,8.82,12.89l-7.06,4a1.13,1.13,0,0,0-.71,1,1,1,0,0,0,.71.93c2,.83,4,1.65,6,2.49ZM24.69,7.24l-.12-.11L8.62,22l2.6,6.21.17,0c0-.21,0-.42,0-.63,0-.91.05-1.82,0-2.73a2.71,2.71,0,0,1,.73-2c2-2.46,4-4.95,6-7.43ZM12.54,29.83l.15.08,3.89-3.7-4-1.68Z" />
      </g>
    </svg>
  )
}

function UnknownLocationDotIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      className="h-[14px] w-[14px] flex-shrink-0"
      aria-hidden
    >
      <circle cx="8" cy="8" r="5" fill="#6B7280" />
    </svg>
  )
}

export default function LabSlipPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  // Get customerType from localStorage and use as userRole
  let userRole = 'lab';
  if (typeof window !== 'undefined') {
    const storedType = localStorage.getItem('customerType');
    if (storedType) userRole = storedType;
  }
  const [search, setSearch] = useState("")
  const [office, setOffice] = useState("All")
  const [status, setStatus] = useState("All")
  const [location, setLocation] = useState(() => parseLocationFilterFromUrl(searchParams.get("location")))
  const [showWithAttachments, setShowWithAttachments] = useState(false)
  const [showLabConnect, setShowLabConnect] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(SLIP_LISTING_DEFAULT_PER_PAGE)
  const [showColumnsDialog, setShowColumnsDialog] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    office: true,
    patient: true,
    slipNumber: true,
    pan: true,
    product: true,
    status: true,
    location: true,
    attachment: true,
    viewSlip: true,
    due: true,
    actions: true,
  })
  const [selected, setSelected] = useState<number[]>([])
  const [menuRow, setMenuRow] = useState<number | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<number | null>(null)
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [dateRange, setDateRange] = useState<{ start?: Date, end?: Date }>({})
  const [productType, setProductType] = useState("All")
  const [doctorFilter, setDoctorFilter] = useState("All")
  const [stageFilter, setStageFilter] = useState("All")
  const [officeLabFilter, setOfficeLabFilter] = useState("All")
  const [userFilter, setUserFilter] = useState("All")
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [selectedSlipForAttachment, setSelectedSlipForAttachment] = useState<any>(null)
  const [showChangeDateModal, setShowChangeDateModal] = useState(false)
  const [selectedSlipForDateChange, setSelectedSlipForDateChange] = useState<any>(null)
  const [showDriverHistoryModal, setShowDriverHistoryModal] = useState(false)
  const [selectedSlipForDriverHistory, setSelectedSlipForDriverHistory] = useState<any>(null)
  const [printDropdownOpen, setPrintDropdownOpen] = useState<number | null>(null)
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [selectedSlipForAddOns, setSelectedSlipForAddOns] = useState<any>(null)
  // Per-product add-on catalog inputs built from the slip details — same as the
  // virtual slip, so the popup shows the product's add-ons + previously selected.
  const [addonInputs, setAddonInputs] = useState<VirtualSlipAddonInputs | null>(null)
  const [showCallLogModal, setShowCallLogModal] = useState(false)
  const [selectedSlipForCallLog, setSelectedSlipForCallLog] = useState<any>(null)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [selectedSlipForPrint, setSelectedSlipForPrint] = useState<any>(null)
  const [showPrintDriverTags, setShowPrintDriverTags] = useState(false)
  const [selectedSlipForDriverTags, setSelectedSlipForDriverTags] = useState<any>(null)
  const router = useRouter()
  const [selectedSlipForStatement, setSelectedSlipForStatement] = useState<any>(null)
  const [showReadyToSendModal, setShowReadyToSendModal] = useState(false)
  const [readyToSendSlip, setReadyToSendSlip] = useState<any>(null)
  const [readyToSendSubmitting, setReadyToSendSubmitting] = useState(false)
  const [showRushModal, setShowRushModal] = useState(false)
  const [selectedSlipForRush, setSelectedSlipForRush] = useState<any>(null)
  const [showSendBackToOfficeModal, setShowSendBackToOfficeModal] = useState(false)
  const [selectedSlipForSendBackToOffice, setSelectedSlipForSendBackToOffice] = useState<any>(null)
  const [sendBackToOfficeSubmitting, setSendBackToOfficeSubmitting] = useState(false)
  const [cancelSlipModalOpen, setCancelSlipModalOpen] = useState(false)
  const [selectedSlipForCancel, setSelectedSlipForCancel] = useState<any>(null)
  const [cancelSlipSubmitting, setCancelSlipSubmitting] = useState(false)

  // Lab signature requirement for the "Ready to Send" action (loaded while the modal is open).
  const { readyToSendRequired } = useSignatureRequirementSettings(showReadyToSendModal)

  const {
    slips,
    loading,
    fetchLabSlips,
    fetchDriverPrintData,
    createCustomDeliveryDate,
    fetchOfficeSlips,
    fetchCustomDeliveryDates,
    readyToSend,
    labListingPagination,
    updateSlipAttachmentState,
  } = useSlipContext();
  const { fetchProductAddons, requestSlipRush, cancelSlipRush, cancelSlip, sendBackToOfficeSlip } = useSlipCreation();
  const [generateVirtualStatement] = useGenerateVirtualStatementMutation()

  const dateRangeKey = useMemo(
    () => `${dateRange.start?.toISOString() ?? ""}|${dateRange.end?.toISOString() ?? ""}`,
    [dateRange.start, dateRange.end]
  )

  const debouncedSearch = useDebounce(search, 400)

  const filterSig = useMemo(
    () => [debouncedSearch, office, status, location, showWithAttachments, productType, dateRangeKey].join("|"),
    [debouncedSearch, office, status, location, showWithAttachments, productType, dateRangeKey]
  )

  const prevFilterSigRef = useRef<string | null>(null)

  useEffect(() => {
    const customerId = getLabCustomerId()
    if (!customerId) return

    const filtersJustChanged =
      prevFilterSigRef.current !== null && prevFilterSigRef.current !== filterSig

    if (filtersJustChanged) {
      prevFilterSigRef.current = filterSig
      if (currentPage !== 1) {
        setCurrentPage(1)
      }
    } else {
      prevFilterSigRef.current = filterSig
    }

    // When filters change while already on page 1, we must still fetch (setCurrentPage(1) is a no-op).
    const pageToFetch = filtersJustChanged ? 1 : currentPage

    void fetchLabSlips(customerId, {
      q: debouncedSearch.trim() || undefined,
      office_code: office !== "All" ? office : undefined,
      status: status !== "All" ? status : undefined,
      location_id: location !== "All" ? Number(location) : undefined,
      has_attachments: showWithAttachments ? true : undefined,
      product_name: productType !== "All" ? productType : undefined,
      delivery_date_start: dateRange.start ? formatYmd(dateRange.start) : undefined,
      delivery_date_end: dateRange.end ? formatYmd(dateRange.end) : undefined,
      page: pageToFetch,
      per_page: itemsPerPage,
    })
  }, [filterSig, currentPage, itemsPerPage, fetchLabSlips])

  const allOffices = useMemo(() => Array.from(new Set(slips.map((s) => s.officeCode))), [slips])
  const allStatuses = useMemo(() => {
    const fromSlips = slips.map((s) => s.status).filter(Boolean) as string[]
    return Array.from(new Set([...LAB_SLIP_STATUS_OPTIONS, ...fromSlips]))
  }, [slips])
  const allDoctors = useMemo(() => Array.from(new Set(slips.map((s) => s.doctor || "Unknown"))), [slips])
  const allUsers = useMemo(() => Array.from(new Set(slips.map((s) => s.user || "Unknown"))), [slips])
  const allProductTypes = useMemo(() => Array.from(new Set(slips.map((s) => s.productType || "Unknown"))), [slips])

  const clientFilteredSlips = useMemo(() => {
    let result = slips
    if (doctorFilter !== "All") {
      result = result.filter((s) => s.doctor === doctorFilter)
    }
    if (userFilter !== "All") {
      result = result.filter((s) => s.user === userFilter)
    }
    return result
  }, [slips, doctorFilter, userFilter])

  const totalListingCount = labListingPagination?.total ?? clientFilteredSlips.length
  const maxPage = Math.max(1, labListingPagination?.last_page ?? 1)
  const slipsPage = clientFilteredSlips
  /** Alias for the current page rows (server-filtered). Fixes legacy references to `filteredSlips`. */
  const filteredSlips = clientFilteredSlips
  const allOnPageSelected =
    slipsPage.length > 0 && slipsPage.every((s) => selected.includes(s.id))
  const someOnPageSelected = slipsPage.some((s) => selected.includes(s.id))
  const selectAllHeaderChecked: boolean | "indeterminate" = allOnPageSelected
    ? true
    : someOnPageSelected
      ? "indeterminate"
      : false

  const handleSelectAllPage = () => {
    if (allOnPageSelected) {
      setSelected(selected.filter((id) => !slipsPage.map((s) => s.id).includes(id)))
    } else {
      setSelected([...selected, ...slipsPage.filter((s) => !selected.includes(s.id)).map((s) => s.id)])
    }
  }

  const handleColumnChange = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Archive Confirm
  const handleArchive = (id: number) => {
    setArchiveConfirm(id)
    setMenuRow(null)
  }
  const closeArchive = () => setArchiveConfirm(null)
  const confirmArchive = () => {
    // Implement deletion or archiving logic here
    closeArchive()
  }

  const handleAttachmentClick = (slip: any) => {
    setSelectedSlipForAttachment(slip)
    setShowAttachModal(true)
  }

  const handleAttachmentsUploaded = (attachments: any[]) => {
    if (!selectedSlipForAttachment?.id) return
    updateSlipAttachmentState(selectedSlipForAttachment.id, attachments.length > 0)
    const customerId = getLabCustomerId()
    if (!customerId) return
    void fetchLabSlips(customerId, {
      q: debouncedSearch.trim() || undefined,
      office_code: office !== "All" ? office : undefined,
      status: status !== "All" ? status : undefined,
      location_id: location !== "All" ? Number(location) : undefined,
      has_attachments: showWithAttachments ? true : undefined,
      product_name: productType !== "All" ? productType : undefined,
      delivery_date_start: dateRange.start ? formatYmd(dateRange.start) : undefined,
      delivery_date_end: dateRange.end ? formatYmd(dateRange.end) : undefined,
      page: currentPage,
      per_page: itemsPerPage,
    })
  }

  const handleAttachmentStateChange = (hasAttachments: boolean) => {
    if (!selectedSlipForAttachment?.id) return
    updateSlipAttachmentState(selectedSlipForAttachment.id, hasAttachments)
  }

  const handleDateIconClick = (slip: any) => {
    setSelectedSlipForDateChange(slip)
    setShowChangeDateModal(true)
  }

  const handleLocationIconClick = (slip: any) => {
    setSelectedSlipForDriverHistory(slip)
    setShowDriverHistoryModal(true)
  }

  const handleOpenReadyToSend = (slip: any) => {
    setReadyToSendSlip(slip)
    setShowReadyToSendModal(true)
  }

  const handleConfirmReadyToSend = async (signature?: string) => {
    if (!readyToSendSlip) return
    setReadyToSendSubmitting(true)
    try {
      const res = await readyToSend(readyToSendSlip.id, signature)
      if (res?.success) {
        toast({
          title: "Success",
          description: res.message || "Slip marked as ready to send.",
          duration: 3000,
        })
        setShowReadyToSendModal(false)
        setReadyToSendSlip(null)
      } else {
        toast({
          title: "Error",
          description: res?.message ?? "Could not mark slip as ready to send.",
          variant: "destructive",
          duration: 5000,
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Could not mark slip as ready to send.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setReadyToSendSubmitting(false)
    }
  }

  const refreshSlipsAfterCustomDeliveryDate = () => {
    try {
      if (typeof window !== "undefined") {
        const customerId = resolveListingCustomerId();
        const customerType = localStorage.getItem("customerType");
        if (customerId) {
          if (customerType === "lab") {
            void fetchLabSlips(customerId);
          } else if (customerType === "office") {
            void fetchOfficeSlips(customerId);
          } else {
            void fetchLabSlips(customerId);
            void fetchOfficeSlips(customerId);
          }
        }
      }
    } catch (err) {
      console.error("Error refreshing slips after creating custom date:", err);
    }
  };

  const loadAddonInputsForSlip = useCallback(async (slipId: number) => {
    setAddonInputs(null)
    if (!slipId) return
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const url = new URL(`/v1/slip/slip/${slipId}/details`, process.env.NEXT_PUBLIC_API_BASE_URL)
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) {
        window.location.href = "/login"
        return
      }
      const json = await res.json()
      setAddonInputs(buildVirtualSlipAddonInputs(json?.data ?? null))
    } catch {
      setAddonInputs(null)
    }
  }, [])

  const handleAddOnsClick = (slip: any) => {
    setSelectedSlipForAddOns(slip)
    setShowAddOnsModal(true)
    void loadAddonInputsForSlip(slip?.id)
  }

  const handleCallLogClick = (slip: any) => {
    setSelectedSlipForCallLog(slip)
    setShowCallLogModal(true)
  }

  const refreshCurrentListing = useCallback(() => {
    const customerId = getLabCustomerId()
    if (!customerId) return
    void fetchLabSlips(customerId)
  }, [fetchLabSlips])

  const handleEditCase = (slip: any) => {
    router.push(buildVirtualSlipV2Path(slip.id))
  }

  const handleOpenRushCase = (slip: any) => {
    setSelectedSlipForRush(slip)
    setShowRushModal(true)
    void loadAddonInputsForSlip(slip?.id)
  }

  const handleRemoveRushCase = async () => {
    if (!selectedSlipForRush?.id) return
    try {
      await cancelSlipRush(selectedSlipForRush.id)
      toast({
        title: "Rush removed",
        description: "The rush request was cancelled.",
        duration: 3000,
      })
      setShowRushModal(false)
      setSelectedSlipForRush(null)
      refreshCurrentListing()
    } catch (error) {
      toast({
        title: "Unable to remove rush",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleConfirmRushCase = async (rushData: { targetDate?: string | null }) => {
    if (!selectedSlipForRush?.id) return
    if (!rushData?.targetDate) {
      toast({
        title: "Rush date required",
        description: "Please select a target delivery date first.",
        variant: "destructive",
      })
      return
    }

    try {
      await requestSlipRush(selectedSlipForRush.id, {
        requested_delivery_date: rushData.targetDate,
      })
      toast({
        title: "Rush case updated",
        description: "The rush request was submitted successfully.",
        duration: 3000,
      })
      setShowRushModal(false)
      setSelectedSlipForRush(null)
      refreshCurrentListing()
    } catch (error) {
      toast({
        title: "Unable to rush case",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleOpenCancelCase = (slip: any) => {
    setSelectedSlipForCancel(slip)
    setCancelSlipModalOpen(true)
  }

  const handleOpenSendBackToOffice = (slip: any) => {
    setSelectedSlipForSendBackToOffice(slip)
    setShowSendBackToOfficeModal(true)
  }

  const handleConfirmSendBackToOffice = async (reason: string) => {
    if (!selectedSlipForSendBackToOffice?.id || !reason.trim()) return

    setSendBackToOfficeSubmitting(true)
    try {
      await sendBackToOfficeSlip(selectedSlipForSendBackToOffice.id, reason.trim())
      toast({
        title: "Case sent back to office",
        description: "The case was returned to the office successfully.",
        duration: 3000,
      })
      setShowSendBackToOfficeModal(false)
      setSelectedSlipForSendBackToOffice(null)
      refreshCurrentListing()
    } catch (error) {
      toast({
        title: "Unable to send case back",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendBackToOfficeSubmitting(false)
    }
  }

  const handleConfirmCancelCase = async (reason: string) => {
    if (!selectedSlipForCancel?.id || !reason.trim()) return

    setCancelSlipSubmitting(true)
    try {
      await cancelSlip(selectedSlipForCancel.id, reason.trim())
      toast({
        title: "Case cancelled",
        description: "The case was cancelled successfully.",
        duration: 3000,
      })
      setCancelSlipModalOpen(false)
      setSelectedSlipForCancel(null)
      refreshCurrentListing()
    } catch (error) {
      toast({
        title: "Unable to cancel case",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setCancelSlipSubmitting(false)
    }
  }


  // Individual print handler - opens in new window
  const handlePrintPaperSlip = async (slip: any) => {
    // Determine which ID to use based on customerType
    let customerType = 'lab';
    if (typeof window !== 'undefined') {
      const storedType = localStorage.getItem('customerType');
      if (storedType) customerType = storedType;
    }
    let idToSend: number | null = null;
    if (customerType === 'lab') {
      idToSend = (typeof slip.id === 'number' && !isNaN(slip.id)) ? slip.id : null;
    } else if (customerType === 'office') {
      idToSend = (typeof slip.caseId === 'number' && !isNaN(slip.caseId)) ? slip.caseId : null;
    } else {
      idToSend = (typeof slip.id === 'number' && !isNaN(slip.id)) ? slip.id : null;
    }
    if (idToSend === null) {
      toast({
        title: "No valid slip",
        description: "This slip does not have a valid slip ID.",
        variant: "destructive"
      });
      return;
    }
    try {
      const printRoute = buildPaperSlipPrintRoute({
        customerType,
        ids: [idToSend],
      });

      if (!printRoute) {
        toast({
          title: "No valid slip",
          description: "This slip does not have a valid slip ID.",
          variant: "destructive",
        });
        return;
      }

      const printWindow = window.open(printRoute, "_blank", "noopener,noreferrer");
      if (!printWindow) {
        toast({
          title: "Pop-up blocked",
          description: "Please allow pop-ups for this site and try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to open paper slip",
        description: err?.message || String(err),
        variant: "destructive"
      });
    }
  }

  // Bulk print handler - opens each slip in new window
  const handleBulkPrintPaperSlip = async () => {
    if (!selected.length) return;

    try {
      const selectedRows = slips.filter(slip => selected.includes(slip.id));


      // Only send valid slip IDs (not null/undefined/NaN)
      const slipIds = selectedRows
        .map(r => (typeof r.caseId === 'number' && !isNaN(r.caseId)) ? r.caseId : (typeof r.id === 'number' && !isNaN(r.id) ? r.id : null))
        .filter(id => typeof id === 'number' && !isNaN(id));

      if (!slipIds.length) {
        toast({
          title: "No valid slips",
          description: "Please select slips with valid slip IDs.",
          variant: "destructive",
        });
        return;
      }
      const printRoute = buildPaperSlipPrintRoute({
        customerType: userRole,
        ids: slipIds,
      });

      if (!printRoute) {
        toast({
          title: "No valid slips",
          description: "Please select slips with valid IDs.",
          variant: "destructive",
        });
        return;
      }

      const printWindow = window.open(printRoute, "_blank", "noopener,noreferrer");
      if (!printWindow) {
        toast({
          title: "Pop-up blocked",
          description: "Please allow pop-ups for this site and try again.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Paper slips opened", description: `${slipIds.length} slip(s) are being prepared for print.` });
    } catch (err: any) {
      toast({
        title: "Failed to open paper slips",
        description: err?.message || String(err),
        variant: "destructive",
      });
    }
  };


  const handlePrintDriverLabel = (slip: any) => {
    setSelectedSlipForDriverTags(slip)
    setShowPrintDriverTags(true)
  }

  // Function to generate driver labels and open in new window
  const handleGenerateDriverLabels = async (slip: any, selectedSlots: boolean[]) => {
    // Create driver label content based on selected slots
    const selectedSlotIndices = selectedSlots
      .map((selected, index) => selected ? index : -1)
      .filter(index => index !== -1);
    
    if (selectedSlotIndices.length === 0) {
      alert('Please select at least one slot to generate labels.');
      return;
    }

    try {
      // Fetch driver print data from API
      const driverPrintData = await fetchDriverPrintData([slip.id]);
      
      if (!driverPrintData || !driverPrintData.slips.length) {
        alert('Failed to fetch driver print data.');
        return;
      }

      // Use the API data for printing
      openDriverLabelsWindow(driverPrintData.slips[0], selectedSlotIndices);
    } catch (error) {
      console.error('Error generating driver labels:', error);
      alert('Failed to generate driver labels.');
    }
  }

  // Function to handle regular print (all slots)
  const handleRegularDriverPrint = async (slip: any, allSlots: boolean[]) => {
    const selectedSlotIndices = allSlots.map((v, i) => v ? i : -1).filter(i => i !== -1);
    
    if (selectedSlotIndices.length === 0) {
      alert('No slots available for printing.');
      return;
    }

    try {
      // Fetch driver print data from API
      const driverPrintData = await fetchDriverPrintData([slip.id]);
      
      if (!driverPrintData || !driverPrintData.slips.length) {
        alert('Failed to fetch driver print data.');
        return;
      }

      // Use the API data for printing
      openDriverLabelsWindow(driverPrintData.slips[0], selectedSlotIndices);
    } catch (error) {
      console.error('Error printing driver labels:', error);
      alert('Failed to print driver labels.');
    }
  }

  // Function to handle bulk driver print
  const handleBulkDriverPrint = async () => {
    if (!selected.length) {
      alert('Please select slips to print.');
      return;
    }

    try {
      // Fetch driver print data for all selected slips
      const driverPrintData = await fetchDriverPrintData(selected);
      
      if (!driverPrintData || !driverPrintData.slips.length) {
        alert('Failed to fetch driver print data.');
        return;
      }

      // Generate all 8 slots for each slip
      const allSlots = Array.from({ length: 8 }, (_, i) => i);
      
      // Print each slip with a small delay between them
      driverPrintData.slips.forEach((driverSlip, index) => {
        setTimeout(() => {
          openDriverLabelsWindow(driverSlip, allSlots);
        }, index * 500); // 500ms delay between each slip
      });
    } catch (error) {
      console.error('Error bulk printing driver labels:', error);
      alert('Failed to bulk print driver labels.');
    }
  }

  // Function to print driver labels directly without new window
  const openDriverLabelsWindow = (driverSlip: any, selectedSlots: number[]) => {

    // Generate label content for each selected slot using QR codes from API
    const labelContent = selectedSlots.map((slotIndex) => {
      return `
      <div class="driver-label" style="
        width: 4in; 
        height: 2.5in; 
        border: 2px solid #000; 
        margin: 10px; 
        padding: 15px; 
        page-break-after: always;
        font-family: Arial, sans-serif;
        position: relative;
        background: white;
        display: inline-block;
      ">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div style="flex: 1;">
            <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${driverSlip.lab_name || 'HMC INNOVS LLC'}</div>
            <div style="font-size: 12px; margin-bottom: 2px;"><strong>OFC:</strong> ${driverSlip.office_code || 'HMD'}</div>
            <div style="font-size: 12px; margin-bottom: 2px;"><strong>PT:</strong> ${driverSlip.pt_name || 'Mary Gutierrez'}</div>
            <div style="font-size: 12px;"><strong>DR:</strong> ${driverSlip.doctor_name || 'Cody Mugglestone'}</div>
          </div>
          <div style="width: 60px; height: 60px; border: 1px solid #000; display: flex; align-items: center; justify-content: center;">
            <img src="${driverSlip.qr_code || ''}" style="width: 58px; height: 58px; object-fit: contain;" alt="QR Code" />
          </div>
        </div>
        
        <div style="margin-top: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="font-size: 12px;"><strong>Stage:</strong> ${driverSlip.stage_code || 'FR'}-${driverSlip.stage_name || 'SC-FD-BB'}</span>
            <span style="font-size: 12px;"><strong>PAN #:</strong> ${driverSlip.case_pan_number || '0080'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="font-size: 12px;"><strong>PKU:</strong> ${driverSlip.pickup_date ? new Date(driverSlip.pickup_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '01/08/2025'}</span>
            <span style="font-size: 12px;"><strong>CASE #:</strong> ${driverSlip.case_number || 'C0123546'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 12px;"><strong>DEL:</strong> ${driverSlip.delivery_date ? new Date(driverSlip.delivery_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' @ ' + (driverSlip.delivery_time || '4pm') : '01/25/2025 @ 4pm'}</span>
            <span style="font-size: 12px;"><strong>SLIP #:</strong> ${driverSlip.slip_number || '01234568'}</span>
          </div>
        </div>
        
        <div style="position: absolute; bottom: 5px; right: 5px; font-size: 10px; color: #666;">
          Slot ${slotIndex + 1}
        </div>
      </div>
    `}).join('');

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);

    const labelsHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Driver Tags</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px;
            background: white;
          }
          .labels-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(4, 1fr);
            gap: 15px;
            width: 100%;
            max-width: 8.5in;
            margin: 0 auto;
            page-break-inside: avoid;
          }
          .driver-label {
            width: 100%;
            height: 240px;
            border: 2px solid #000;
            padding: 12px;
            font-family: Arial, sans-serif;
            position: relative;
            background: white;
            display: block;
            box-sizing: border-box;
          }
          .empty-slot {
            background: transparent;
            border: none;
            visibility: hidden;
          }
          @media print {
            body { 
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .labels-grid {
              width: 100%;
              max-width: none;
              gap: 15px;
            }
            .driver-label {
              page-break-inside: avoid;
              height: 240px;
            }
          }
          .qr-code {
            width: 58px !important;
            height: 58px !important;
          }
        </style>
      </head>
      <body>
        <div class="labels-grid">
          ${Array.from({ length: 8 }, (_, index) => {
            if (selectedSlots.includes(index)) {
              return `
                <div class="driver-label">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="flex: 1;">
                      <div style="font-weight: bold; font-size: 14px; margin-bottom: 3px;">${driverSlip.lab_name || 'HMC innovs LLC'}</div>
                      <div style="font-size: 11px; margin-bottom: 1px;"><strong>OFC:</strong> ${driverSlip.office_code || '4MD00001'}</div>
                      <div style="font-size: 11px; margin-bottom: 1px;"><strong>PT:</strong> ${driverSlip.pt_name || 'Gilbert TUazon'}</div>
                      <div style="font-size: 11px;"><strong>DR:</strong> ${driverSlip.doctor_name || 'Michael Chen'}</div>
                    </div>
                    <div style="width: 60px; height: 60px; border: 1px solid #000; display: flex; align-items: center; justify-content: center;">
                      <img src="${driverSlip.qr_code || ''}" style="width: 58px; height: 58px; object-fit: contain;" alt="QR Code" />
                    </div>
                  </div>
                  
                  <div style="border-top: 1px solid #ccc; padding-top: 6px; margin-top: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                      <span style="font-size: 11px;"><strong>Stage:</strong> ${driverSlip.stage_code || 'BTI'}-${driverSlip.stage_name || 'Bisque/Try In'}</span>
                      <span style="font-size: 11px;"><strong>PAN #:</strong> ${driverSlip.case_pan_number || '001'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                      <span style="font-size: 11px;"><strong>PKU:</strong> ${driverSlip.pickup_date ? new Date(driverSlip.pickup_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '08/13/2025'}</span>
                      <span style="font-size: 11px;"><strong>CASE #:</strong> ${driverSlip.case_number || 'C00001'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="font-size: 11px;"><strong>DEL:</strong> ${driverSlip.delivery_date ? new Date(driverSlip.delivery_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' @ ' + (driverSlip.delivery_time || '17:00') : '08/14/2025 @ 17:00'}</span>
                      <span style="font-size: 11px;"><strong>SLIP #:</strong> ${driverSlip.slip_number || 'C00001-S01'}</span>
                    </div>
                  </div>
                </div>
              `;
            } else {
              return '<div class="empty-slot"></div>';
            }
          }).join('')}
        </div>

        <script>
          // Auto-print after content loads
          setTimeout(() => {
            window.focus();
            window.print();
          }, 500); // Reduced delay since we don't need to generate QR codes
        </script>
      </body>
      </html>
    `;
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(labelsHtml);
      iframeDoc.close();
      // No extra print call here; print is triggered only from inside the iframe's script
      // Remove iframe after a delay to allow print dialog to finish (optional, or can be handled in iframe script)
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    }
  }

  const handlePrintStatement = (slip: any) => {
    void (async () => {
      const billingId = resolveCaseStatementBillingId(slip)

      if (billingId == null) {
        toast({
          title: "Statement not available",
          description: "No billing invoice was found for this case yet.",
          variant: "destructive",
        })
        return
      }

      try {
        const result = await generateVirtualStatement(billingId).unwrap()
        const html = result?.data?.html

        if (!html) {
          toast({
            title: "Statement unavailable",
            description: "The server did not return a statement for this case.",
            variant: "destructive",
          })
          return
        }

        const win = window.open("about:blank", "_blank", "width=1200,height=900")
        if (!win) {
          toast({
            title: "Pop-up blocked",
            description: "Please allow pop-ups for this site and try again.",
            variant: "destructive",
          })
          return
        }
        const printHtml = html.includes("</body>")
          ? html.replace("</body>", "<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()};}<\/script></body>")
          : html + "<script>window.onload=function(){window.print();window.onafterprint=function(){window.close()};}<\/script>"
        win.document.open()
        win.document.write(printHtml)
        win.document.close()
        win.focus()
      } catch {
        toast({
          title: "Failed to load statement",
          description: "Could not retrieve the statement from the server. Please try again.",
          variant: "destructive",
        })
      }
    })()
  }



  const getChangeDateHistory = (slipId: number) => {
    return [
      {
        id: 1,
        user: "John Smith",
        date: "2024-01-15 10:30 AM",
        oldDate: "2024-01-20",
        newDate: "2024-01-25",
        reason: "Patient requested schedule change due to vacation"
      },
      {
        id: 2,
        user: "Jane Doe",
        date: "2024-01-10 2:15 PM",
        oldDate: "2024-01-18",
        newDate: "2024-01-20",
        reason: "Lab scheduling conflict, moved to accommodate rush order"
      }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HIPAA Compliance Banner */}
      <div className="px-4 py-2">
        <HIPAAComplianceBanner variant="default" showDetails={false} />
      </div>

      <div className="w-full px-4 pb-8">
        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3 items-center rounded-lg bg-white shadow-sm px-4 py-3">
          <Input
            className="w-72 bg-white border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
            placeholder="Search by patient, office, doctor, case..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Select value={office} onValueChange={setOffice}>
            <SelectTrigger className={SLIP_LISTING_FILTER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="All offices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All offices</SelectItem>
              {allOffices.filter(o => o).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className={SLIP_LISTING_FILTER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All status</SelectItem>
              {allStatuses.filter(s => s).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className={SLIP_LISTING_FILTER_SELECT_TRIGGER_CLASS}>
              <SelectValue placeholder="All location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All location</SelectItem>
              {SLIP_LOCATION_FILTER_OPTIONS.map((loc) => (
                <SelectItem key={loc.id} value={String(loc.id)}>
                  {loc.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="flex items-center gap-2 text-gray-700 border-gray-300"
            onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          >
            <Filter className="h-4 w-4" /> Advance Filter
          </Button>
          <Popover open={showColumnsDialog} onOpenChange={setShowColumnsDialog}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2 text-gray-700 border-gray-300"
              >
                <Columns className="h-4 w-4" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 border border-gray-200 rounded-lg shadow-lg" align="start">
              <div className="p-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Show/Hide Columns</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(visibleColumns).map(([key, val]) => {
                    const labels = {
                      timestamp: "Time Stamp",
                      office: "Office Code",
                      patient: "Patient",
                      slipNumber: "Slip #",
                      pan: "Pan",
                      product: "Product",
                      status: "Status",
                      location: "Location",
                      attachment: "Attachment",
                      viewSlip: "View Slip",
                      due: "Due Date",
                      actions: "Actions"
                    }
                    const isRequired = key === 'actions' || key === 'office' || key === 'patient' || key === 'pan'
                    return (
                      <label key={key} className="flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={val}
                            onCheckedChange={() => handleColumnChange(key as keyof typeof visibleColumns)}
                            disabled={isRequired}
                            className="border-gray-400"
                            style={{
                              accentColor: val ? "#1162A8" : "#fff",
                              borderColor: "#1162A8",
                              backgroundColor: val ? "#1162A8" : "transparent"
                            }}
                          />
                          <span className="text-sm text-gray-700">{labels[key as keyof typeof labels]}</span>
                        </div>
                        {isRequired && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Required</span>
                        )}
                      </label>
                    )
                  })}
                  <div className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-200">
                    Settings saved automatically
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Advanced Filter Section */}
        {showAdvancedFilter && (
          <div className="rounded-lg bg-white shadow-sm px-4 py-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Advanced Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700"
                onClick={() => {
                  setDateRange({})
                  setSearch("")
                  setProductType("All")
                  setDoctorFilter("All")
                  setStageFilter("All")
                  setOfficeLabFilter("All")
                  setUserFilter("All")
                }}
              >
                Clear all Filters
              </Button>
            </div>

            {/* First Row */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="group w-full justify-start text-left font-normal text-xs"
                    >
                      <SlipListingCalendarIcon className="mr-2" />
                      {dateRange.start ? (
                        format(dateRange.start, "PPP")
                      ) : (
                        <span className="text-gray-500">Start Date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.start}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="group w-full justify-start text-left font-normal text-xs"
                    >
                      <SlipListingCalendarIcon className="mr-2" />
                      {dateRange.end ? (
                        format(dateRange.end, "PPP")
                      ) : (
                        <span className="text-gray-500">End Date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.end}
                      onSelect={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                      disabled={(date) =>
                        date > new Date() ||
                        date < new Date("1900-01-01") ||
                        (dateRange.start && date < dateRange.start)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Input
                placeholder="Search patient name, slip #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs"
              />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  {allStatuses.filter(s => s).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={office} onValueChange={setOffice}>
                <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="All Offices/Lab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Offices/Lab</SelectItem>
                  {allOffices.filter(o => o).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All users</SelectItem>
                  {allUsers.filter(u => u).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="All product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All product type</SelectItem>
                  {allProductTypes.filter(p => p).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Stages</SelectItem>
                </SelectContent>
              </Select>
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="All Doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Doctors</SelectItem>
                  {allDoctors.filter(d => d).map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
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

            {/* Third Row - Toggles */}
            <div className="flex items-center gap-6 mt-3">
              <Select value={location} onValueChange={setLocation}>
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
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showWithAttachments}
                    onChange={(e) => setShowWithAttachments(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${showWithAttachments ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${showWithAttachments ? 'translate-x-5' : 'translate-x-0.5'} translate-y-0.5`}></div>
                  </div>
                </div>
                Show only cases with attachments
              </label>
              <label className="flex items-center gap-2 text-base hidden">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showLabConnect}
                    onChange={(e) => setShowLabConnect(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors ${showLabConnect ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${showLabConnect ? 'translate-x-5' : 'translate-x-0.5'} translate-y-0.5`}></div>
                  </div>
                </div>
                Show only Lab Connect cases
              </label>
            </div>
          </div>
        )}

        {/* Move Pagination to Top */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">
            Showing {totalListingCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
            -
            {Math.min(currentPage * itemsPerPage, totalListingCount)}
            {" "}of {totalListingCount} entries
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-600 mr-2">Show</span>
            <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
              <SelectTrigger className="h-8 w-20 bg-white border-gray-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600 ml-2 mr-4">entries</span>
            <Button variant="outline" size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-gray-300">
              Prev
            </Button>
            <span className="text-sm text-gray-600 mx-2">{currentPage} / {maxPage || 1}</span>
            <Button variant="outline" size="sm"
              onClick={() => setCurrentPage(Math.min(maxPage, currentPage + 1))}
              disabled={currentPage === maxPage}
              className="border-gray-300">
              Next
            </Button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selected.length > 0 && (
          <div className="sticky top-20 z-20 flex flex-wrap gap-2 items-center px-4 py-3 mb-2 rounded-lg bg-blue-50 border border-blue-200 animate-fade-in">
            <span className="font-semibold text-blue-700 mr-3">Bulk actions:</span>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><Check className="h-4 w-4" />Pick up</Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100" onClick={handleBulkDriverPrint}>Print Driver label</Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100" onClick={handleBulkPrintPaperSlip}>Print Paper slip</Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex gap-1 text-blue-700 hover:bg-blue-100"
              disabled={selected.length !== 1 || !canPrintStatement(slipsPage.find((s) => s.id === selected[0]) ?? {})}
              onClick={() => selected.length === 1 ? handlePrintStatement(slipsPage.find((s) => s.id === selected[0])) : undefined}
            >
              Print Statement
            </Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><Plus className="h-4 w-4" />Send back to office</Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><ChevronDown className="h-4 w-4" />Rush case</Button>
            <Button variant="ghost" size="sm" className="flex gap-1 text-red-600 hover:bg-red-50" onClick={() => setArchiveConfirm(-1)}><Trash2 className="h-4 w-4" />Archive case</Button>
          </div>
        )}

        {/* Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white overflow-x-auto">
          <table className="min-w-full text-base">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-1 w-12 whitespace-nowrap">
                  <Checkbox
                    checked={selectAllHeaderChecked}
                    onCheckedChange={handleSelectAllPage}
                    aria-label="Select all"
                    className="border-gray-400"
                    style={{
                      accentColor: allOnPageSelected ? "#1162A8" : "#fff",
                      borderColor: "#1162A8",
                      backgroundColor: allOnPageSelected ? "#1162A8" : "transparent"
                    }}
                  />
                </th>
                {visibleColumns.timestamp && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Timestamp</th>}
                {visibleColumns.office && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Office Code</th>}
                {visibleColumns.patient && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Patient</th>}
                {visibleColumns.slipNumber && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Slip #</th>}
                {visibleColumns.pan && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Pan</th>}
                {visibleColumns.product && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Product</th>}
                {visibleColumns.status && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Status</th>}
                {visibleColumns.location && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Location</th>}
                {visibleColumns.attachment && (
                  <th className="px-3 py-1 text-center align-middle font-medium text-gray-700 whitespace-nowrap" scope="col" aria-label="Attachment">
                    <div className="flex h-[30px] items-center justify-center">
                      <SlipListingVsIcon
                        src={`${VS_CENTER_ICONS}/attachments.svg`}
                        hover={false}
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.viewSlip && (
                  <th className="px-3 py-1 text-center align-middle font-medium text-gray-700 whitespace-nowrap" scope="col" aria-label="View virtual slip">
                    <div className="flex h-[30px] items-center justify-center">
                      <SlipListingVsIcon
                        src={SLIP_LISTING_VIEW_VIRTUAL_SLIP_ICON}
                        hover={false}
                      />
                    </div>
                  </th>
                )}
                {visibleColumns.due && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Due date</th>}
                {visibleColumns.actions && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                // Skeleton loading rows
                Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="hover:bg-gray-50">
                    <td className="px-3 py-1 whitespace-nowrap">
                      <Skeleton className="h-4 w-4" />
                    </td>
                    {visibleColumns.timestamp && (
                      <td className="px-3 py-1 whitespace-nowrap">
                        <Skeleton className="h-4 w-32" />
                      </td>
                    )}
                    {visibleColumns.office && (
                      <td className="px-3 py-1 whitespace-nowrap">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    )}
                    {visibleColumns.patient && (
                      <td className="px-3 py-1 whitespace-nowrap">
                        <Skeleton className="h-4 w-32" />
                      </td>
                    )}
                    {visibleColumns.slipNumber && (
                      <td className="px-3 py-1 whitespace-nowrap">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    )}
                    {visibleColumns.pan && (
                      <td className="px-3 py-1 whitespace-nowrap">
                        <Skeleton className="h-5 w-12 rounded" />
                      </td>
                    )}
                    {visibleColumns.product && (
                      <td className="px-3 py-1 whitespace-nowrap">
                        <Skeleton className="h-4 w-40" />
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-3 py-1 whitespace-nowrap">
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </td>
                    )}
                    {visibleColumns.location && (
                      <td className="px-3 py-1 whitespace-nowrap">
                        <Skeleton className="h-4 w-48" />
                      </td>
                    )}
                    {visibleColumns.attachment && (
                      <td className="px-3 py-1 text-center whitespace-nowrap">
                        <Skeleton className="h-4 w-4 mx-auto" />
                      </td>
                    )}
                    {visibleColumns.viewSlip && (
                      <td className="px-3 py-1 text-center whitespace-nowrap">
                        <Skeleton className="h-4 w-4 mx-auto" />
                      </td>
                    )}
                    {visibleColumns.due && (
                      <td className="px-3 py-1 whitespace-nowrap">
                        <Skeleton className="h-4 w-28" />
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-6 w-6 rounded" />
                          <Skeleton className="h-6 w-6 rounded" />
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : slipsPage.length === 0 ? (
                <tr>
                  <td 
                    colSpan={
                      1 + // checkbox column
                      (visibleColumns.timestamp ? 1 : 0) +
                      (visibleColumns.office ? 1 : 0) +
                      (visibleColumns.patient ? 1 : 0) +
                      (visibleColumns.slipNumber ? 1 : 0) +
                      (visibleColumns.pan ? 1 : 0) +
                      (visibleColumns.product ? 1 : 0) +
                      (visibleColumns.status ? 1 : 0) +
                      (visibleColumns.location ? 1 : 0) +
                      (visibleColumns.attachment ? 1 : 0) +
                      (visibleColumns.viewSlip ? 1 : 0) +
                      (visibleColumns.due ? 1 : 0) +
                      (visibleColumns.actions ? 1 : 0)
                    } 
                    className="py-8 text-center text-gray-500"
                  >
                    No slips found for selected filters.
                  </td>
                </tr>
              ) : (
                slipsPage.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={slipListingRowClassName({
                      selected: selected.includes(row.id),
                      rush: row.rush,
                    })}
                  >
                    <td className="px-3 py-1 whitespace-nowrap">
                      <Checkbox
                        checked={selected.includes(row.id)}
                        onCheckedChange={() =>
                          setSelected(selected.includes(row.id)
                            ? selected.filter(id => id !== row.id)
                            : [...selected, row.id])
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="border-gray-400"
                        style={{
                          accentColor: selected.includes(row.id) ? "#1162A8" : "#fff",
                          borderColor: "#1162A8",
                          backgroundColor: selected.includes(row.id) ? "#1162A8" : "transparent"
                        }}
                      />
                    </td>
                    {visibleColumns.timestamp && (
                      <td className="px-3 py-1 whitespace-nowrap text-base text-black">
                        {row.createdAt}
                      </td>
                    )}
                    {visibleColumns.office && (
                      <td className="px-3 py-1 whitespace-nowrap font-medium text-gray-900 text-base">
                        <SlipListingVirtualSlipLink slipId={row.id} variant="cell">
                          {row.officeCode}
                        </SlipListingVirtualSlipLink>
                      </td>
                    )}
                    {visibleColumns.patient && (
                      <td className="px-3 py-1 whitespace-nowrap text-gray-900 text-base">
                        <SlipListingVirtualSlipLink slipId={row.id} variant="cell">
                          {formatSlipListingPatientName(row.patient)}
                        </SlipListingVirtualSlipLink>
                      </td>
                    )}
                    {visibleColumns.slipNumber && (
                      <td className="px-3 py-1 whitespace-nowrap text-gray-900 font-mono text-base">
                        <SlipListingVirtualSlipLink slipId={row.id} variant="cell">
                          {row.slipNumber || "-"}
                        </SlipListingVirtualSlipLink>
                      </td>
                    )}
                    {visibleColumns.pan &&
                      <td className="px-3 py-1 whitespace-nowrap">
                        <span
                          className={`inline-block w-12 text-center py-0.5 rounded text-white font-mono text-base`}
                          style={row.panColorStyle}
                        >
                          {row.pan}
                        </span>
                      </td>}
                    {visibleColumns.product && (
                      <td className="px-3 py-1 whitespace-nowrap text-gray-900 text-base">
                        <SlipListingVirtualSlipLink slipId={row.id} variant="cell">
                          {row.product}
                        </SlipListingVirtualSlipLink>
                      </td>
                    )}
                    {visibleColumns.status &&
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="flex gap-1.5 items-center">
                          {row.rush && (
                            <SlipListingStatusBadge tone="rush" className="flex items-center gap-0.5 border-0 text-base">
                              <svg width="8" height="10" viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                                <path d="M8.15625 7.91504V2.66504L2.53125 10.915H6.90625L6.90625 16.165L12.5313 7.91504L8.15625 7.91504Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Rush
                            </SlipListingStatusBadge>
                          )}
                          {row.status === "In Progress" && (
                            <SlipListingStatusBadge tone="in-progress" className="text-base">In Progress</SlipListingStatusBadge>
                          )}
                          {row.status === "On Hold" && (
                            <SlipListingStatusBadge tone="on-hold" className="text-base">On Hold</SlipListingStatusBadge>
                          )}
                          {isSlipCaseCancelled(row.status) && (
                            <SlipListingStatusBadge tone="cancelled" className="text-base">Cancelled</SlipListingStatusBadge>
                          )}
                          {row.status === "Draft" && (
                            <SlipListingStatusBadge tone="draft" className="text-base">Draft</SlipListingStatusBadge>
                          )}
                          {isSlipCaseFinished(row.status) && (
                            <SlipListingStatusBadge tone="finished" className="text-base">Finished</SlipListingStatusBadge>
                          )}
                        </div>
                      </td>}
                    {visibleColumns.location &&
                      <td className="px-3 py-1 whitespace-nowrap">
                        {rowAtSlipLocation(row, 1) && (
                          <span className="inline-flex items-center gap-1.5 text-green-700">
                            <SlipListingLocationIconSlot>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleLocationIconClick(row)
                                }}
                                className={slipListingIconButtonClass()}
                                title="View driver history"
                              >
                                <SlipListingVsIcon src={`${VS_CENTER_ICONS}/pick-up.svg`} />
                              </button>
                            </SlipListingLocationIconSlot>
                            <span className="text-base">{row.location}</span>
                          </span>
                        )}
                        {rowAtSlipLocation(row, 2) && (
                          <span className="inline-flex items-center gap-1.5 text-red-600">
                            <SlipListingLocationIconSlot>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleLocationIconClick(row)
                                }}
                                className={slipListingIconButtonClass()}
                                title="View driver history"
                              >
                                <SlipListingVsIcon src={`${VS_CENTER_ICONS}/drop-off.svg`} />
                              </button>
                            </SlipListingLocationIconSlot>
                            <span className="text-base">{row.location}</span>
                          </span>
                        )}
                        {rowAtSlipLocation(row, 3) && (
                          <span className="inline-flex items-center gap-1.5 text-[#0E66B2]">
                            <SlipListingLocationIconSlot>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenReadyToSend(row)
                                }}
                                className={slipListingIconButtonClass()}
                                title="Mark ready to send"
                              >
                                <SlipListingReadyToSendIcon />
                              </button>
                            </SlipListingLocationIconSlot>
                            <span className="text-base">{row.location}</span>
                          </span>
                        )}

                        {rowAtSlipLocation(row, 4) && (
                          <span className="inline-flex items-center gap-1.5 text-green-700">
                            <SlipListingLocationIconSlot>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleLocationIconClick(row)
                                }}
                                className={slipListingIconButtonClass()}
                                title="View driver history"
                              >
                                <SlipListingVsIcon src={`${VS_CENTER_ICONS}/pick-up.svg`} />
                              </button>
                            </SlipListingLocationIconSlot>
                            <span className="text-base">{row.location}</span>
                          </span>
                        )}

                        {rowAtSlipLocation(row, 5) && (
                          <span className="inline-flex items-center gap-1.5 text-red-600">
                            <SlipListingLocationIconSlot>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleLocationIconClick(row)
                                }}
                                className={slipListingIconButtonClass()}
                                title="View driver history"
                              >
                                <SlipListingVsIcon src={`${VS_CENTER_ICONS}/drop-off.svg`} />
                              </button>
                            </SlipListingLocationIconSlot>
                            <span className="text-base">{row.location}</span>
                          </span>
                        )}

                        {rowAtSlipLocation(row, 6) && (
                          <span className="inline-flex items-center gap-1.5 text-gray-700">
                            <SlipListingLocationIconSlot>
                              <SlipListingVsIcon
                                src={`${VS_CENTER_ICONS}/in-office.png`}
                                hover={false}
                              />
                            </SlipListingLocationIconSlot>
                            <span className="text-base">{row.location}</span>
                          </span>
                        )}

                        {![
                          1, 2, 3, 4, 5, 6,
                        ].some((locationId) => rowAtSlipLocation(row, locationId)) && (
                          <span className="inline-flex items-center gap-1.5 text-gray-500">
                            <SlipListingLocationIconSlot>
                              <UnknownLocationDotIcon />
                            </SlipListingLocationIconSlot>
                            <span className="text-base">{row.location}</span>
                          </span>
                        )}


                      </td>}
                    {visibleColumns.attachment &&
                      <td className="px-3 py-1 text-center align-middle whitespace-nowrap">
                        <div className="flex h-[30px] items-center justify-center">
                          {row.attachment ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAttachmentClick(row)
                              }}
                              className={slipListingIconButtonClass(
                                "h-[30px] w-[30px] items-center justify-center p-0"
                              )}
                              title="View attachments"
                            >
                              <SlipListingVsIcon src={`${VS_CENTER_ICONS}/attachments.svg`} />
                            </button>
                          ) : null}
                        </div>
                      </td>}
                    {visibleColumns.viewSlip &&
                      <td className="px-3 py-1 text-center align-middle whitespace-nowrap">
                        <div className="flex h-[30px] items-center justify-center">
                          <SlipListingViewSlipLink slipId={row.id} />
                        </div>
                      </td>}
                    {visibleColumns.due &&
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDateIconClick(row)
                            }}
                            className={slipListingIconButtonClass("flex-shrink-0")}
                            title="Change due date"
                          >
                            <SlipListingCalendarIcon />
                          </button>
                          <SlipListingDueDateLabel dueDate={row.dueDate} />
                          {row.rush && <span className="text-red-500 flex-shrink-0">
                            <svg width="10" height="12" viewBox="0 0 16 19" fill="none">
                              <path d="M8.71094 8.41504V3.16504L3.08594 11.415H7.46094L7.46094 16.665L13.0859 7.91504L8.71094 7.91504Z" stroke="#CF0202" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>}
                        </div>
                      </td>}
                    {visibleColumns.actions &&
                      <td className="px-3 py-1 whitespace-nowrap">
                        <div className="flex items-center gap-0.5">
                          <Popover open={printDropdownOpen === row.id} onOpenChange={open => setPrintDropdownOpen(open ? row.id : null)}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={slipListingActionIconButtonClass()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <SlipListingVsIcon src={`${VS_ACTION_ICONS}/printer.svg`} />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0 border border-gray-200 rounded-lg shadow-lg">
                              <div className="py-2">
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm"
                                  onClick={() => {
                                  handlePrintPaperSlip(row);
                                  }}
                                >
                                  Print Paper Slip
                                </button>
                                <button
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm"
                                  onClick={() => handlePrintDriverLabel(row)}
                                >
                                  Print Driver Label
                                </button>
                                {canPrintStatement(row) && (
                                  <button
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm"
                                    onClick={() => handlePrintStatement(row)}
                                  >
                                    Print Statement
                                  </button>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={slipListingActionIconButtonClass()}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddOnsClick(row)
                            }}
                          >
                            <SlipListingVsIcon src={`${VS_CENTER_ICONS}/add-general.svg`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={slipListingActionIconButtonClass()}  
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCallLogClick(row)
                            }}
                          >
                            <SlipListingVsIcon src={`${VS_CENTER_ICONS}/call-log.svg`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={slipListingActionIconButtonClass()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg
                              width="22"
                              height="22"
                              viewBox="0 0 17 17"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className={cn(SLIP_LISTING_ICON_SIZE_CLASS, SLIP_LISTING_ICON_HOVER_CLASS)}
                            >
                              <path d="M14.5031 5.57471H7.10957C6.2929 5.57471 5.63086 6.23675 5.63086 7.05342V14.447C5.63086 15.2636 6.2929 15.9257 7.10957 15.9257H14.5031C15.3198 15.9257 15.9818 15.2636 15.9818 14.447V7.05342C15.9818 6.23675 15.3198 5.57471 14.5031 5.57471Z" stroke="#1162A8" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M2.67402 11.4896C1.86073 11.4896 1.19531 10.8242 1.19531 10.0109V2.61738C1.19531 1.80409 1.86073 1.13867 2.67402 1.13867H10.0676C10.8809 1.13867 11.5463 1.80409 11.5463 2.61738" stroke="#1162A8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Button>
                          <Popover open={menuRow === row.id} onOpenChange={open => setMenuRow(open ? row.id : null)}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={slipListingActionIconButtonClass()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical
                                  className={cn(
                                    SLIP_LISTING_ICON_SIZE_CLASS,
                                    "text-gray-500",
                                    SLIP_LISTING_ICON_HOVER_CLASS
                                  )}
                                />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-0 border border-gray-200 rounded-lg shadow-lg">
                              <div className="py-1">
                                {buildLabCaseDropdownActions({
                                  onEditCase: () => handleEditCase(row),
                                  onChangeDueDate: () => handleDateIconClick(row),
                                  onPrintDriverLabel: () => handlePrintDriverLabel(row),
                                  onPrintPaperSlip: () => void handlePrintPaperSlip(row),
                                  onPrintStatement: canPrintStatement(row)
                                    ? () => handlePrintStatement(row)
                                    : null,
                                  onSendBackToOffice: canSendBackToOffice(row)
                                    ? () => handleOpenSendBackToOffice(row)
                                    : null,
                                  onRushCase: () => handleOpenRushCase(row),
                                  onCancelCase: () => handleOpenCancelCase(row),
                                }).filter((action) => action.key !== "print-statement" || canPrintStatement(row)).map((action) => (
                                  <button
                                    key={action.key}
                                    type="button"
                                    disabled={action.disabled}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left ${
                                      action.disabled
                                        ? "cursor-not-allowed text-gray-400"
                                        : "hover:bg-gray-50 text-gray-700"
                                    }`}
                                    onClick={() => {
                                      if (action.disabled || !action.onSelect) return
                                      setMenuRow(null)
                                      action.onSelect()
                                    }}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination at Bottom */}
        <div className="flex items-center justify-between mt-2 border-t border-gray-200 pt-2">
          <div className="text-sm text-gray-600">
            Showing {totalListingCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
            -
            {Math.min(currentPage * itemsPerPage, totalListingCount)}
            {" "}of {totalListingCount} entries
          </div>
          <div className="flex items-center space-x-1">
            <button
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              «
            </button>
            {Array.from({ length: Math.min(5, maxPage) }, (_, i) => {
              let pageNum: number;
              if (maxPage <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= maxPage - 2) {
                pageNum = maxPage - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                    pageNum === currentPage ? "bg-[#1162a8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs bg-gray-100 text-gray-600 disabled:opacity-50 hover:bg-gray-200 transition-colors"
              onClick={() => setCurrentPage(Math.min(maxPage, currentPage + 1))}
              disabled={currentPage === maxPage}
            >
              »
            </button>
          </div>
        </div>

        {/* Archive Confirm Dialog */}
        <Dialog open={archiveConfirm !== null} onOpenChange={v => { if (!v) closeArchive() }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archive Case</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              Are you sure you want to archive {archiveConfirm === -1 ? 'the selected cases' : 'this case'}?
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={closeArchive}>Cancel</Button>
              <Button variant="destructive" onClick={confirmArchive}>Archive</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* File Attachment Modal */}
        {showAttachModal && selectedSlipForAttachment && typeof document !== "undefined" && createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-white"
            style={{ width: "100vw", height: "100vh" }}
            role="dialog"
            aria-modal="true"
            aria-label="File Attachments"
          >
            <FileAttachmentModalContent
              setShowAttachModal={setShowAttachModal}
              isCaseSubmitted={selectedSlipForAttachment.status === "Completed" || selectedSlipForAttachment.status === "Cancelled"}
              slipId={selectedSlipForAttachment.id}
              doctorName={selectedSlipForAttachment.doctor}
              patientName={selectedSlipForAttachment.patient}
              onAttachmentsUploaded={handleAttachmentsUploaded}
              onAttachmentStateChange={handleAttachmentStateChange}
              open={showAttachModal}
            />
          </div>,
          document.body
        )}

        {/* Change Date Modal */}
        {selectedSlipForDateChange && (
          <ChangeDateModal
            open={showChangeDateModal}
            onClose={() => {
              setShowChangeDateModal(false)
              setSelectedSlipForDateChange(null)
            }}
            patient={selectedSlipForDateChange.patient}
            stage={selectedSlipForDateChange.product || "Unknown Stage"}
            currentDate={new Date().toLocaleDateString()}
            deliveryDate={selectedSlipForDateChange.dueDate}
            deliveryTime="10:00"
            slipId={selectedSlipForDateChange.id}
            history={getChangeDateHistory(selectedSlipForDateChange.id)}
            onSaved={refreshSlipsAfterCustomDeliveryDate}
          />
        )}

        <ReadyToSendModal
          open={showReadyToSendModal}
          onClose={() => {
            if (!readyToSendSubmitting) {
              setShowReadyToSendModal(false)
              setReadyToSendSlip(null)
            }
          }}
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
              isOpen={showRushModal}
              onClose={() => {
                setShowRushModal(false)
                setSelectedSlipForRush(null)
                setAddonInputs(null)
              }}
              onConfirm={handleConfirmRushCase}
              isRushed={(addonInputs?.slipIsRush ?? false) || rushSlots.some((s) => s.isRushed)}
              existingRushDate={rushSlots.find((s) => s.existingRushDate)?.existingRushDate}
              onRemoveRush={handleRemoveRushCase}
              onRemoveRushByKey={() => {
                void handleRemoveRushCase()
              }}
              maxRushed={hasMax}
              maxExistingRushDate={rushSlots.find((s) => s.arch === "maxillary")?.existingRushDate}
              mandRushed={hasMand}
              mandExistingRushDate={rushSlots.find((s) => s.arch === "mandibular")?.existingRushDate}
              onRemoveMaxRush={hasMax ? handleRemoveRushCase : undefined}
              onRemoveMandRush={hasMand ? handleRemoveRushCase : undefined}
              archSlots={rushSlots}
              hasMaxillary={rushSlots.length > 0 ? rushSlots.some((s) => s.arch === "maxillary") : undefined}
              hasMandibular={rushSlots.length > 0 ? rushSlots.some((s) => s.arch === "mandibular") : undefined}
              product={{
                name: rushSlots[0]?.productName ?? selectedSlipForRush?.product ?? "Case",
                stage: rushSlots[0]?.stageName ?? selectedSlipForRush?.product ?? "Unknown Stage",
                deliveryDate: addonInputs?.deliveryDateIso || selectedSlipForRush?.dueDate || "",
                price: 0,
              }}
            />
          )
        })()}

        <SendCaseBackToOfficeModal
          open={showSendBackToOfficeModal}
          onClose={() => {
            if (sendBackToOfficeSubmitting) return
            setShowSendBackToOfficeModal(false)
            setSelectedSlipForSendBackToOffice(null)
          }}
          onConfirm={handleConfirmSendBackToOffice}
          loading={sendBackToOfficeSubmitting}
        />

        <CaseActionModal
          open={cancelSlipModalOpen}
          onClose={() => {
            if (cancelSlipSubmitting) return
            setCancelSlipModalOpen(false)
            setSelectedSlipForCancel(null)
          }}
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

        {/* Driver History Modal */}
        <DriverHistoryModal
          isOpen={showDriverHistoryModal}
          onClose={() => setShowDriverHistoryModal(false)}
          slip={selectedSlipForDriverHistory}
        />

        {/* Add Ons Modal */}
        <AddOnsModal
          isOpen={showAddOnsModal}
          onClose={() => {
            setShowAddOnsModal(false)
            setAddonInputs(null)
          }}
          onAddAddOns={() => {}}
          labId={0}
          productId=""
          arch="maxillary"
          products={addonInputs?.addonProducts ?? []}
          archSlots={addonInputs?.addonArchSlots ?? []}
          slipId={selectedSlipForAddOns?.id}
          onSlipAddonsSaved={refreshCurrentListing}
        />

        {/* Call Log Modal */}
        <CallLogModal
          isOpen={showCallLogModal}
          onClose={() => setShowCallLogModal(false)}
          slipNumber={selectedSlipForCallLog?.id ? String(selectedSlipForCallLog.id) : ""}
        />

        {/* Print Preview Modal */}
        <PrintPreviewModal
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          caseData={
            selectedSlipForPrint
              ? {
                  lab: selectedSlipForPrint.labName || "",
                  address: selectedSlipForPrint.labAddress || "",
                  office: selectedSlipForPrint.officeCode || "",
                  doctor: selectedSlipForPrint.doctor || "",
                  patient: selectedSlipForPrint.patient || "",
                  pickupDate: selectedSlipForPrint.pickupDate || "",
                  panNumber: selectedSlipForPrint.panNumber || "",
                  caseNumber: selectedSlipForPrint.caseNumber || "",
                  slipNumber:
                    selectedSlipForPrint.slipNumber ||
                    (selectedSlipForPrint.id ? String(selectedSlipForPrint.id) : ""),
                  products: selectedSlipForPrint.products || [],
                  contact: selectedSlipForPrint.labContact || "",
                  email: selectedSlipForPrint.labEmail || "",
                }
              : {
                  lab: "",
                  address: "",
                  office: "",
                  doctor: "",
                  patient: "",
                  pickupDate: "",
                  panNumber: "",
                  caseNumber: "",
                  slipNumber: "",
                  products: [],
                  contact: "",
                  email: "",
                }
          }
        />

        {/* Print Driver Tags Modal */}
        <PrintDriverTagsModal
          isOpen={showPrintDriverTags}
          slip={selectedSlipForDriverTags}
          onClose={() => setShowPrintDriverTags(false)}
          onRegularPrint={async (slip, allSlots) => {
            if (slip) {
              await handleRegularDriverPrint(slip, allSlots);
            }
          }}
          onGenerateLabels={async (slip, selectedSlots) => {
            if (slip) {
              await handleGenerateDriverLabels(slip, selectedSlots);
            }
          }}
        />

      </div>
    </div>
  )
}
