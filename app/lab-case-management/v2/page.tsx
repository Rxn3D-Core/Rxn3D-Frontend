"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { useSlipContext } from "../SlipContext";
import { useSlipCreation } from "@/contexts/slip-creation-context";
import FileAttachmentModalContent from "@/components/file-attachment-modal-content"
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
import PrintDriverTagsModal from "@/components/print-driver-tags-modal"
import CaseActionModal from "@/components/CaseActionModal"
import RushRequestModal from "@/components/rush-request-modal"
import SendCaseBackToOfficeModal from "@/components/send-case-back-to-office-modal"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast";
import { HIPAAComplianceBanner } from "@/components/hipaa-compliance-banner"
import { useGenerateVirtualStatementMutation } from "@/lib/redux/api/billingApi"
import { resolveCaseStatementBillingId } from "@/lib/case-statement-print"
import {
  SLIP_LOCATION_FILTER_OPTIONS,
  LAB_SLIP_STATUS_OPTIONS,
  SLIP_LISTING_DEFAULT_PER_PAGE,
  parseLocationFilterFromUrl,
} from "@/app/lab-case-management/lab-slip-listing-constants"
import { slipCanSendBackToOffice, slipCanHold, SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE } from "@/lib/slip-location"
import { VirtualSlipPauseIcon } from "@/components/virtual-slip/VirtualSlipPauseIcon"
import { resolveListingCustomerId } from "@/lib/customer-scope"
import { slipListingStatusLabel } from "@/components/slip-listing/SlipListingStatusTabs"
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes"
import { usePaperSlipInPagePrintV2 } from "@/hooks/use-paper-slip-in-page-print-v2"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { useDebounce } from "@/lib/performance-utils"
import { V2CaseWidget } from "./components/V2CaseWidget"

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

export default function LabSlipPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { print: printPaperSlip, portal: paperSlipPortal, isPrinting } = usePaperSlipInPagePrintV2();
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
  const [selectedCaseForAttachment, setSelectedCaseForAttachment] = useState<{
    caseId: number
    caseNumber: string
    patient: string
    doctor: string
  } | null>(null)
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
  const [rushCaseSchedule, setRushCaseSchedule] = useState<CaseSchedule | null>(null)
  const [labBusinessHours, setLabBusinessHours] = useState<BusinessHour[] | null>(null)
  const [selectedSlipForRush, setSelectedSlipForRush] = useState<any>(null)
  const [showSendBackToOfficeModal, setShowSendBackToOfficeModal] = useState(false)
  const [selectedSlipForSendBackToOffice, setSelectedSlipForSendBackToOffice] = useState<any>(null)
  const [sendBackToOfficeSubmitting, setSendBackToOfficeSubmitting] = useState(false)
  const [cancelSlipModalOpen, setCancelSlipModalOpen] = useState(false)
  const [selectedSlipForCancel, setSelectedSlipForCancel] = useState<any>(null)
  const [cancelSlipSubmitting, setCancelSlipSubmitting] = useState(false)
  const [holdSlipModalOpen, setHoldSlipModalOpen] = useState(false)
  const [selectedSlipForHold, setSelectedSlipForHold] = useState<any>(null)
  const [holdSlipSubmitting, setHoldSlipSubmitting] = useState(false)

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
  const { fetchProductAddons, requestSlipRush, cancelSlipRush, cancelSlip, holdSlip, sendBackToOfficeSlip } = useSlipCreation();
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
    // Canonical API values first so they win de-duplication; collapse duplicate labels.
    const seenLabels = new Set<string>()
    const result: string[] = []
    for (const status of [...LAB_SLIP_STATUS_OPTIONS, ...fromSlips]) {
      const label = slipListingStatusLabel(status)
      if (seenLabels.has(label)) continue
      seenLabels.add(label)
      result.push(status)
    }
    return result
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
  // Visible table columns after consolidation: checkbox + Patient/Slip + Office + Pan/Product + Status + Location + Due.
  // Actions are a hover overlay (no column), so they are not counted here.
  const listingColumnCount =
    1 +
    (visibleColumns.patient || visibleColumns.slipNumber ? 1 : 0) +
    (visibleColumns.office ? 1 : 0) +
    (visibleColumns.pan || visibleColumns.product ? 1 : 0) +
    (visibleColumns.status ? 1 : 0) +
    (visibleColumns.location ? 1 : 0) +
    (visibleColumns.due ? 1 : 0) +
    (visibleColumns.actions ? 1 : 0)
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
    setSelectedCaseForAttachment({
      caseId: slip.caseId,
      caseNumber: slip.caseNumber ?? "",
      patient: slip.patient ?? "",
      doctor: slip.doctor ?? "",
    })
    setShowAttachModal(true)
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
    setRushCaseSchedule(null)
    setLabBusinessHours(null)
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

  const handleOpenHoldCase = (slip: any) => {
    if (!slipCanHold({ locationId: slip.locationId, location: slip.location })) {
      toast({
        title: "Cannot put on hold",
        description: SLIP_HOLD_REQUIRES_IN_LAB_MESSAGE,
        variant: "destructive",
        duration: 5000,
      })
      return
    }
    setSelectedSlipForHold(slip)
    setHoldSlipModalOpen(true)
  }

  const handleConfirmHoldCase = async (reason: string) => {
    if (!selectedSlipForHold?.id || !reason.trim()) return

    setHoldSlipSubmitting(true)
    try {
      await holdSlip(selectedSlipForHold.id, reason.trim())
      toast({
        title: "Case put on hold",
        description: "The case has been put on hold successfully.",
        duration: 3000,
      })
      setHoldSlipModalOpen(false)
      setSelectedSlipForHold(null)
      refreshCurrentListing()
    } catch (error) {
      toast({
        title: "Unable to put case on hold",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setHoldSlipSubmitting(false)
    }
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


  // Individual print handler
  const handlePrintPaperSlip = (slip: any) => {
    const customerType = (typeof window !== 'undefined' && localStorage.getItem('customerType')) || 'lab';
    const idToSend: number | null = customerType === 'office'
      ? ((typeof slip.caseId === 'number' && !isNaN(slip.caseId)) ? slip.caseId : null)
      : ((typeof slip.id === 'number' && !isNaN(slip.id)) ? slip.id : null);
    if (idToSend === null) {
      toast({ title: "No valid slip", description: "This slip does not have a valid slip ID.", variant: "destructive" });
      return;
    }
    printPaperSlip([idToSend], []);
  }

  // Bulk print handler
  const handleBulkPrintPaperSlip = () => {
    if (!selected.length) return;
    const selectedRows = slips.filter(slip => selected.includes(slip.id));
    const slipIds = selectedRows
      .map(r => (typeof r.caseId === 'number' && !isNaN(r.caseId)) ? r.caseId : (typeof r.id === 'number' && !isNaN(r.id) ? r.id : null))
      .filter((id): id is number => typeof id === 'number' && !isNaN(id));
    if (!slipIds.length) {
      toast({ title: "No valid slips", description: "Please select slips with valid slip IDs.", variant: "destructive" });
      return;
    }
    printPaperSlip(slipIds, []);
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



  const getChangeDateHistory = (slipId: number): any[] => {
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

  const handleCopyCaseIdentifier = async (row: { id: number; slipNumber?: string; caseNumber?: string }) => {
    const value = row.slipNumber || row.caseNumber || String(row.id)
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: "Copied", description: value + " copied to clipboard.", duration: 2500 })
    } catch {
      toast({ title: "Copy failed", description: "Could not copy the case identifier.", variant: "destructive" })
    }
  }

  const selectedStatementRow = selected.length === 1
    ? slipsPage.find((row) => row.id === selected[0])
    : undefined

  return (
    <div className="min-h-screen">
      <div className="px-4 py-2">
        <HIPAAComplianceBanner variant="default" showDetails={false} />
      </div>

      <main className="w-full px-4 pb-8">
        <V2CaseWidget
          attachmentsOnly={showWithAttachments}
          bulkCanPrintStatement={Boolean(selectedStatementRow && canPrintStatement(selectedStatementRow))}
          canPrintStatement={canPrintStatement}
          canSendBack={canSendBackToOffice}
          currentPage={currentPage}
          dateRange={dateRange}
          doctor={doctorFilter}
          doctors={allDoctors}
          itemsPerPage={itemsPerPage}
          loading={loading}
          location={location}
          moreMenuRow={menuRow}
          office={office}
          officeLab={officeLabFilter}
          offices={allOffices}
          onAttachmentsOnlyChange={setShowWithAttachments}
          onBulkArchive={() => setArchiveConfirm(-1)}
          onBulkPrintDriverLabels={() => void handleBulkDriverPrint()}
          onBulkPrintPaperSlips={() => void handleBulkPrintPaperSlip()}
          onBulkPrintStatement={() => {
            if (selectedStatementRow) handlePrintStatement(selectedStatementRow)
          }}
          onClearFilters={() => {
            setSearch("")
            setOffice("All")
            setStatus("All")
            setLocation("All")
            setShowWithAttachments(false)
            setDateRange({})
            setProductType("All")
            setDoctorFilter("All")
            setStageFilter("All")
            setOfficeLabFilter("All")
            setUserFilter("All")
            setCurrentPage(1)
          }}
          onColumnChange={handleColumnChange}
          onDateRangeChange={setDateRange}
          onDoctorChange={setDoctorFilter}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value)
            setCurrentPage(1)
          }}
          onLocationChange={setLocation}
          onMoreMenuRowChange={setMenuRow}
          onOfficeChange={setOffice}
          onOfficeLabChange={setOfficeLabFilter}
          onPageChange={setCurrentPage}
          onPrintMenuRowChange={setPrintDropdownOpen}
          onProductTypeChange={setProductType}
          onSearchChange={setSearch}
          onSearchEnter={() => {
            if (slipsPage.length === 1) router.push(buildVirtualSlipV2Path(slipsPage[0].id))
          }}
          onSelectAll={handleSelectAllPage}
          onSelectRow={(id) => {
            setSelected((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id])
          }}
          onShowAdvancedChange={setShowAdvancedFilter}
          onStageChange={setStageFilter}
          onStatusChange={setStatus}
          onUserChange={setUserFilter}
          printMenuRow={printDropdownOpen}
          productType={productType}
          products={allProductTypes}
          rowActions={{
            onOpen: (row) => router.push(buildVirtualSlipV2Path(row.id)),
            onPrintPaperSlip: handlePrintPaperSlip,
            onPrintDriverLabel: handlePrintDriverLabel,
            onPrintStatement: handlePrintStatement,
            onCallLog: handleCallLogClick,
            onAddOns: handleAddOnsClick,
            onAttachment: handleAttachmentClick,
            onCopy: (row) => void handleCopyCaseIdentifier(row),
            onEdit: handleEditCase,
            onHold: handleOpenHoldCase,
            onChangeDueDate: handleDateIconClick,
            onDriverHistory: handleLocationIconClick,
            onReadyToSend: handleOpenReadyToSend,
            onAddStage: (slip) => router.push(`/add-new-stage?sourceSlipId=${slip.id}`),
            onSendBack: handleOpenSendBackToOffice,
            onRush: handleOpenRushCase,
            onCancel: handleOpenCancelCase,
          }}
          rows={slipsPage}
          search={search}
          selectAllChecked={selectAllHeaderChecked}
          selected={selected}
          showAdvanced={showAdvancedFilter}
          stage={stageFilter}
          status={status}
          statuses={allStatuses}
          totalCount={totalListingCount}
          totalPages={maxPage}
          user={userFilter}
          users={allUsers}
          visibleColumns={visibleColumns}
        />

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

        {paperSlipPortal}
        <LoadingOverlay isLoading={isPrinting} title="Preparing Paper Slip" message="Please wait while we prepare your paper slip for printing…" />

        {/* File Attachment Modal */}
        {showAttachModal && selectedCaseForAttachment && createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
            <FileAttachmentModalContent
              setShowAttachModal={(show) => {
                setShowAttachModal(show)
                if (!show) setSelectedCaseForAttachment(null)
              }}
              isCaseSubmitted={false}
              caseId={selectedCaseForAttachment.caseId}
              caseNumber={selectedCaseForAttachment.caseNumber}
              doctorName={selectedCaseForAttachment.doctor}
              patientName={selectedCaseForAttachment.patient}
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
              isOpen={showRushModal && rushSlots.length > 0}
              onClose={() => {
                setShowRushModal(false)
                setSelectedSlipForRush(null)
                setAddonInputs(null)
                setRushCaseSchedule(null)
                setLabBusinessHours(null)
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

        <CaseActionModal
          open={holdSlipModalOpen}
          onClose={() => {
            if (holdSlipSubmitting) return
            setHoldSlipModalOpen(false)
            setSelectedSlipForHold(null)
          }}
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

      </main>
    </div>
  )
}
