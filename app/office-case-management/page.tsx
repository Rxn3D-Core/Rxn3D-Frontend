"use client"

import { useState, useMemo, useEffect } from "react"
import { createPortal } from "react-dom"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Filter, Columns, MoreVertical, ChevronDown, Trash2, Eye, Copy, Phone, Printer, Download, X } from "lucide-react"
import { format } from "date-fns"
import { useOfficeSlipContext } from "@/contexts/office-slip-context"
import { useSlipCreation } from "@/contexts/slip-creation-context"
import FileAttachmentModalContent from "@/components/file-attachment-modal-content"
import AddOnsModal from "@/components/add-ons-modal"
import { buildVirtualSlipAddonInputs, type VirtualSlipAddonInputs } from "@/lib/virtual-slip-addon-inputs"
import CallLogModal from "@/components/call-log-modal"
import PrintPreviewModal from "@/components/print-preview-modal"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useAdvancedBillingSearchMutation, useGenerateVirtualStatementMutation } from "@/lib/redux/api/billingApi"
import { findBillingInvoiceIdFromSearchResults, resolveCaseStatementBillingId } from "@/lib/case-statement-print"
import { SLIP_LISTING_DEFAULT_PER_PAGE } from "@/app/lab-case-management/lab-slip-listing-constants"
import { isSlipCaseCancelled, isSlipCaseFinished } from "@/lib/slip-case-status"
import { SlipListingCalendarIcon } from "@/components/slip-listing/SlipListingCalendarIcon"
import { SlipListingVsIcon } from "@/components/slip-listing/SlipListingVsIcon"
import {
  SLIP_LISTING_ICON_HOVER_CLASS,
  SLIP_LISTING_ICON_SIZE_CLASS,
  slipListingIconButtonClass,
} from "@/components/slip-listing/slip-listing-icon-hover"
import { cn } from "@/lib/utils"
import { SlipListingDueDateLabel } from "@/components/slip-listing/SlipListingDueDateLabel"
import { SlipListingVirtualSlipLink } from "@/components/slip-listing/SlipListingVirtualSlipLink"
import {
  SLIP_LISTING_VIEW_VIRTUAL_SLIP_ICON,
  SlipListingViewSlipLink,
} from "@/components/slip-listing/SlipListingViewSlipLink"
import { SlipListingStatusBadge } from "@/components/slip-listing/SlipListingStatusBadge"
import { formatSlipListingPatientName } from "@/lib/slip-listing-patient-name"
import { slipListingRowClassName } from "@/lib/slip-listing-row-class"
import {
  SLIP_LISTING_ADVANCED_FILTER_LOCATION_SELECT_TRIGGER_CLASS,
  SLIP_LISTING_ADVANCED_FILTER_SELECT_TRIGGER_CLASS,
  SLIP_LISTING_FILTER_SELECT_TRIGGER_CLASS,
} from "@/lib/slip-listing-filter-select"
import Link from "next/link"
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes"
import { resolveListingCustomerId } from "@/lib/customer-scope"

function buildApiUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ""
  if (!base && typeof window !== "undefined") {
    return new URL(pathOrUrl, window.location.origin).toString()
  }
  return new URL(pathOrUrl, base.endsWith("/") ? base : `${base}/`).toString()
}

/** Virtual-slip icon asset folders — same glyphs used on the virtual slip page. */
const VS_CENTER_ICONS = "/icons/virtual-slip-center"

export default function SlipPage() {
  const { slips, loading, error, pagination, fetchOfficeSlips } = useOfficeSlipContext()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("All")
  const [location, setLocation] = useState(() => searchParams.get("location") || "All")
  const [showWithAttachments, setShowWithAttachments] = useState(false)
  const [showLabConnect, setShowLabConnect] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(SLIP_LISTING_DEFAULT_PER_PAGE)
  const [showColumnsDialog, setShowColumnsDialog] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
    timestamp: true,
    patient: true,
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
  const [patientSearch, setPatientSearch] = useState("")
  const [productType, setProductType] = useState("All")
  const [doctorFilter, setDoctorFilter] = useState("All")
  const [stageFilter, setStageFilter] = useState("All")
  const [userFilter, setUserFilter] = useState("All")
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [selectedSlipForAttachment, setSelectedSlipForAttachment] = useState<any>(null)
  const [printDropdownOpen, setPrintDropdownOpen] = useState<number | null>(null)
  const [showAddOnsModal, setShowAddOnsModal] = useState(false)
  const [selectedSlipForAddOns, setSelectedSlipForAddOns] = useState<any>(null)
  // Per-product add-on catalog inputs (same as the virtual slip add-ons popup).
  const [addonInputs, setAddonInputs] = useState<VirtualSlipAddonInputs | null>(null)
  const [showCallLogModal, setShowCallLogModal] = useState(false)
  const [selectedSlipForCallLog, setSelectedSlipForCallLog] = useState<any>(null)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [selectedSlipForPrint, setSelectedSlipForPrint] = useState<any>(null)
  const [selectedSlipForStatement, setSelectedSlipForStatement] = useState<any>(null)
  const [advancedBillingSearch] = useAdvancedBillingSearchMutation()
  const [generateVirtualStatement] = useGenerateVirtualStatementMutation()

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const customerId = resolveListingCustomerId()
        if (customerId) {
          await fetchOfficeSlips(customerId, currentPage, itemsPerPage)
        }
      } catch (err) {
        console.error('Error fetching office slips:', err)
      }
    }

    fetchData()
  }, [fetchOfficeSlips, currentPage, itemsPerPage])

  // Get unique values for filter dropdowns
  const allStatuses = Array.from(new Set(slips.map((s) => s.status)))
  const allLocations = Array.from(new Set(slips.map((s) => s.location)))
  const allDoctors = Array.from(new Set(slips.map((s) => s.doctorName || "Unknown")))
  const allUsers = Array.from(new Set(slips.map((s) => (s as any).createdBy || "Unknown")))
  const allProductTypes = Array.from(new Set(slips.map((s) => (s as any).productType || "Unknown")))

  // Filtering
  const filteredSlips = useMemo(() => {
    let result = slips
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((s) =>
        s.patient.toLowerCase().includes(q)
        || s.product.toLowerCase().includes(q)
        || (s.doctorName?.toLowerCase().includes(q) ?? false)
        || (s.caseNumber?.toLowerCase().includes(q) ?? false)
        || (s.slipNumber?.toLowerCase().includes(q) ?? false)
      )
    }
    if (status !== "All") result = result.filter((s) => s.status === status)
    if (location !== "All") result = result.filter((s) => s.location === location)
    if (showWithAttachments) result = result.filter((s) => s.attachment)
    return result
  }, [slips, search, status, location, showWithAttachments])

  // Paging - use filtered slips for display, but API handles pagination
  const slipsPage = filteredSlips
  const allOnPageSelected = slipsPage.length && slipsPage.every((s) => selected.includes(s.id))
  const someOnPageSelected = slipsPage.some((s) => selected.includes(s.id))
  const maxPage = pagination?.last_page || 1

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

  const handleAttachmentsUploaded = async () => {
    try {
      const customerId = resolveListingCustomerId()
      if (customerId) {
        await fetchOfficeSlips(customerId, currentPage, itemsPerPage)
      }
    } catch (err) {
      console.error("Error refreshing slips after attachment upload:", err)
    }
  }

  const handleAddOnsClick = (slip: any) => {
    setSelectedSlipForAddOns(slip)
    setShowAddOnsModal(true)
    setAddonInputs(null)
    const slipId = slip?.id
    if (!slipId) return
    void (async () => {
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
    })()
  }


  const handleCallLogClick = (slip: any) => {
    setSelectedSlipForCallLog(slip)
    setShowCallLogModal(true)
  }

  const handlePrintStatement = (slip: any) => {
    void (async () => {
      setSelectedSlipForStatement(slip)

      let billingId = resolveCaseStatementBillingId(slip)

      if (billingId == null && slip?.caseNumber) {
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
        toast({
          title: "Statement not available",
          description: "No billing invoice was found for this case yet.",
          variant: "destructive",
        })
        return
      }

      const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900")
      if (!printWindow) {
        toast({
          title: "Unable to print statement",
          description: "Please allow pop-ups and try again.",
          variant: "destructive",
        })
        return
      }

      printWindow.document.open()
      printWindow.document.write(`
        <html>
          <head>
            <title>Preparing statement...</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                color: #111827;
              }
            </style>
          </head>
          <body>Preparing statement...</body>
        </html>
      `)
      printWindow.document.close()

      try {
        const result = await generateVirtualStatement(billingId).unwrap()
        const printUrl = result?.data?.print_url
        const statementHtml = result?.data?.html

        if (printUrl) {
          printWindow.location.href = buildApiUrl(printUrl)
          return
        }

        if (!statementHtml) {
          throw new Error(result?.message || "No printable statement content was returned.")
        }

        printWindow.document.open()
        printWindow.document.write(statementHtml)
        printWindow.document.close()
        printWindow.focus()
        window.setTimeout(() => {
          try {
            printWindow.print()
          } catch {
            // Leave preview open if auto-print is blocked.
          }
        }, 300)
      } catch (error) {
        printWindow.close()
        toast({
          title: "Unable to print statement",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        })
      }
    })()
  }

  // Show loading state
  if (loading) {
    return (
      <div className="w-full p-6 space-y-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading office slips...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full p-6 space-y-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">Error loading office slips</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6 space-y-4 bg-gray-50 min-h-screen">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center mb-4 rounded-lg bg-white shadow-sm px-4 py-3">
        <Input
          className="w-72 bg-white border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
          placeholder="Search by patient, doctor, case..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className={SLIP_LISTING_FILTER_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All status</SelectItem>
            {allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className={SLIP_LISTING_FILTER_SELECT_TRIGGER_CLASS}>
            <SelectValue placeholder="All location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All location</SelectItem>
            {allLocations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Popover open={showColumnsDialog} onOpenChange={setShowColumnsDialog}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2 text-gray-700 border-gray-300">
              <Columns className="h-4 w-4" />
              Columns
        </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 border border-gray-200 rounded-lg shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Show/Hide Columns</h3>
              </div>
              <div className="space-y-3">
                {Object.entries(visibleColumns).map(([key, val]) => {
                  const labels = {
                    timestamp: "Time Stamp",
                    patient: "Patient",
                    product: "Product",
                    status: "Status",
                    location: "Location",
                    attachment: "Attachment",
                    viewSlip: "View Slip",
                    due: "Due Date",
                    actions: "Actions"
                  }
                  const isRequired = key === 'actions' || key === 'patient'
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
        <Button
          variant="outline"
          className="flex items-center gap-2 text-gray-700 border-gray-300"
          onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
        >
          <Filter className="h-4 w-4" /> Advance Filter
        </Button>
        <div className="flex items-center gap-4 ml-2">
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <Checkbox checked={showWithAttachments} onCheckedChange={(checked) => setShowWithAttachments(checked === true)} className="border-blue-400" />
            With attachments
          </label>
          <label className="flex items-center gap-1 text-xs cursor-pointer">
            <Checkbox checked={showLabConnect} onCheckedChange={(checked) => setShowLabConnect(checked === true)} className="border-blue-400" />
            Lab Connect only
          </label>
        </div>
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
                setPatientSearch("")
                setProductType("All")
                setDoctorFilter("All")
                setStageFilter("All")
                setUserFilter("All")
              }}
            >
              Clear all Filters
            </Button>
          </div>

          {/* First Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
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
                    disabled={(date) => {
                      if (date > new Date()) return true
                      if (date < new Date("1900-01-01")) return true
                      if (dateRange.start && date < dateRange.start) return true
                      return false
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Input
              placeholder="Search patient name, slip #..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          </div>

          {/* Third Row - Toggles */}
          <div className="flex items-center gap-6 mt-3">
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className={SLIP_LISTING_ADVANCED_FILTER_LOCATION_SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="All Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Location</SelectItem>
                {allLocations.filter(l => l).map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs">
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
            <label className="flex items-center gap-2 text-xs hidden">
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

      {/* Bulk Action Bar */}
      {selected.length > 0 && (
        <div className="sticky top-20 z-20 flex flex-wrap gap-2 items-center px-4 py-3 mb-2 rounded-lg bg-blue-50 border border-blue-200 animate-fade-in">
          <span className="font-semibold text-blue-700 mr-3">Bulk actions:</span>
          <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100"><Printer className="h-4 w-4" />Print Paper slip</Button>
          <Button variant="ghost" size="sm" className="flex gap-1 text-blue-700 hover:bg-blue-100" onClick={() => selected.length === 1 ? handlePrintStatement(slipsPage.find((s) => s.id === selected[0])) : undefined}><Printer className="h-4 w-4" />Print Statement</Button>
          <Button variant="ghost" size="sm" className="flex gap-1 text-red-600 hover:bg-red-50" onClick={() => setArchiveConfirm(-1)}><Trash2 className="h-4 w-4" />Archive case</Button>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-1.5 w-12">
                <Checkbox
                  checked={!!allOnPageSelected}
                  onCheckedChange={(checked) => handleSelectAllPage()}
                  aria-label="Select all"
                  className="border-gray-400"
                />
              </th>
              {visibleColumns.timestamp && <th className="px-3 py-1 text-left font-medium text-gray-700 whitespace-nowrap">Timestamp</th>}
              {visibleColumns.patient && <th className="px-4 py-1.5 text-left font-medium text-gray-700">Patient</th>}
              {visibleColumns.product && <th className="px-4 py-1.5 text-left font-medium text-gray-700">Product</th>}
              {visibleColumns.status && <th className="px-4 py-1.5 text-left font-medium text-gray-700">Status</th>}
              {visibleColumns.location && <th className="px-4 py-1.5 text-left font-medium text-gray-700">Location</th>}
              {visibleColumns.attachment && (
                <th className="px-4 py-1.5 text-center align-middle font-medium text-gray-700" scope="col" aria-label="Attachment">
                  <div className="flex h-[30px] items-center justify-center">
                    <SlipListingVsIcon
                      src={`${VS_CENTER_ICONS}/attachments.svg`}
                      hover={false}
                    />
                  </div>
                </th>
              )}
              {visibleColumns.viewSlip && (
                <th className="px-4 py-1.5 text-center align-middle font-medium text-gray-700" scope="col" aria-label="View virtual slip">
                  <div className="flex h-[30px] items-center justify-center">
                    <SlipListingVsIcon
                      src={SLIP_LISTING_VIEW_VIRTUAL_SLIP_ICON}
                      hover={false}
                    />
                  </div>
                </th>
              )}
              {visibleColumns.due && <th className="px-4 py-1.5 text-left font-medium text-gray-700">Due date</th>}
              {visibleColumns.actions && <th className="px-4 py-1.5 text-left font-medium text-gray-700">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {slipsPage.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    1 +
                    (visibleColumns.timestamp ? 1 : 0) +
                    (visibleColumns.patient ? 1 : 0) +
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
                  <td className="px-4 py-1.5">
                    <Checkbox
                      checked={selected.includes(row.id)}
                      onCheckedChange={() =>
                        setSelected(selected.includes(row.id)
                          ? selected.filter(id => id !== row.id)
                          : [...selected, row.id])
                      }
                      className="border-gray-400"
                    />
                  </td>
                  {visibleColumns.timestamp && (
                    <td className="px-3 py-1 whitespace-nowrap text-base text-black">
                      {row.createdAt}
                    </td>
                  )}
                  {visibleColumns.patient && (
                    <td className="px-4 py-1.5 text-gray-900">
                      <SlipListingVirtualSlipLink slipId={row.id} variant="cell" cellPadding="comfortable">
                        {formatSlipListingPatientName(row.patient)}
                      </SlipListingVirtualSlipLink>
                    </td>
                  )}
                  {visibleColumns.product && (
                    <td className="px-4 py-1.5 text-gray-900">
                      <SlipListingVirtualSlipLink slipId={row.id} variant="cell" cellPadding="comfortable">
                        {row.product}
                      </SlipListingVirtualSlipLink>
                    </td>
                  )}
                  {visibleColumns.status &&
                    <td className="px-4 py-1.5">
                      <div className="flex gap-2 items-center">
                        {row.rush && (
                          <SlipListingStatusBadge tone="rush" size="comfortable" className="border-0">
                            <svg width="12" height="14" viewBox="0 0 16 19" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                              <path d="M8.15625 7.91504V2.66504L2.53125 10.915H6.90625L6.90625 16.165L12.5313 7.91504L8.15625 7.91504Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Rush
                          </SlipListingStatusBadge>
                        )}
                        {row.status === "In Progress" && (
                          <SlipListingStatusBadge tone="in-progress" size="comfortable">In Progress</SlipListingStatusBadge>
                        )}
                        {row.status === "On Hold" && (
                          <SlipListingStatusBadge tone="on-hold" size="comfortable">On Hold</SlipListingStatusBadge>
                        )}
                        {isSlipCaseCancelled(row.status) && (
                          <SlipListingStatusBadge tone="cancelled" size="comfortable">Cancelled</SlipListingStatusBadge>
                        )}
                        {isSlipCaseFinished(row.status) && (
                          <SlipListingStatusBadge tone="finished" size="comfortable">Finished</SlipListingStatusBadge>
                        )}
                      </div>
                    </td>}
                  {visibleColumns.location &&
                    <td className="px-4 py-1.5 text-sm text-gray-700">
                      {row.location}
                    </td>}
                  {visibleColumns.attachment &&
                    <td className="px-4 py-1.5 text-center align-middle">
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
                    <td className="px-4 py-1.5 text-center align-middle">
                      <div className="flex h-[30px] items-center justify-center">
                        <SlipListingViewSlipLink slipId={row.id} />
                      </div>
                    </td>}
                  {visibleColumns.due &&
                    <td className="px-4 py-1.5">
                      <div className="inline-flex items-center gap-2">
                        <SlipListingDueDateLabel dueDate={row.dueDate} />
                        {row.rush && <span className="text-red-500">
                          <svg width="12" height="14" viewBox="0 0 16 19" fill="none">
                            <path d="M8.71094 8.41504V3.16504L3.08594 11.415H7.46094L7.46094 16.665L13.0859 8.41504L8.71094 8.41504Z" stroke="#CF0202" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>}
                        {row.overdue && <SlipListingStatusBadge tone="overdue" size="comfortable">Overdue</SlipListingStatusBadge>}
                      </div>
                    </td>}
                  {visibleColumns.actions &&
                    <td className="px-4 py-1.5">
                      <Popover open={menuRow === row.id} onOpenChange={open => setMenuRow(open ? row.id : null)}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              slipListingIconButtonClass("h-[30px] w-[30px] p-0"),
                              "hover:bg-gray-100"
                            )}
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
                          <div className="py-1 divide-y divide-gray-100">
                            <Link
                              href={buildVirtualSlipV2Path(row.id)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm"
                              onClick={() => setMenuRow(null)}
                            >
                              <Eye className="h-4 w-4" />View Case
                            </Link>
                            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm">
                              <Copy className="h-4 w-4" />Duplicate
                            </button>
                            <button
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm"
                              onClick={() => {
                                setMenuRow(null)
                                handlePrintStatement(row)
                              }}
                            >
                              <Printer className="h-4 w-4" />Print Statement
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-red-600 text-sm" onClick={() => handleArchive(row.id)}>
                              <Trash2 className="h-4 w-4" />Archive Case
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-2">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * (pagination?.per_page || SLIP_LISTING_DEFAULT_PER_PAGE) + 1}
          -
          {Math.min(currentPage * (pagination?.per_page || SLIP_LISTING_DEFAULT_PER_PAGE), pagination?.total || 0)}
          {" "}of {pagination?.total || 0} entries
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-600 mr-2">Show</span>
          <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
            <SelectTrigger className="h-8 w-20 bg-white border-gray-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600 ml-2 mr-4">entries</span>
          <Button variant="outline" size="sm"
            onClick={() => {
              const newPage = Math.max(1, currentPage - 1)
              setCurrentPage(newPage)
            }}
            disabled={currentPage === 1}
            className="border-gray-300">
            Prev
          </Button>
          <span className="text-sm text-gray-600 mx-2">{currentPage} / {maxPage || 1}</span>
          <Button variant="outline" size="sm"
            onClick={() => {
              const newPage = Math.min(maxPage, currentPage + 1)
              setCurrentPage(newPage)
            }}
            disabled={currentPage === maxPage}
            className="border-gray-300">
            Next
          </Button>
        </div>
      </div>

      {/* Columns Dialog */}
      <Dialog open={showColumnsDialog} onOpenChange={setShowColumnsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-900">Show/Hide Columns</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowColumnsDialog(false)}
              className="h-6 w-6 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {Object.entries(visibleColumns).map(([key, val]) => {
              const labels = {
                timestamp: "Time Stamp",
                patient: "Patient",
                product: "Product",
                status: "Status",
                location: "Location",
                attachment: "Attachment",
                viewSlip: "View Slip",
                due: "Due Date",
                actions: "Actions"
              }
              const isRequired = key === 'actions'
              return (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={val}
                      onCheckedChange={() => handleColumnChange(key as keyof typeof visibleColumns)}
                      disabled={isRequired}
                      className="border-gray-400"
                    />
                    <span className="text-sm text-gray-700">{labels[key as keyof typeof labels]}</span>
                  </div>
                  {isRequired && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Required</span>
                  )}
                </label>
              )
            })}
            <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
              Settings saved automatically
            </div>
          </div>
        </DialogContent>
      </Dialog>


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
            doctorName={selectedSlipForAttachment.doctorName}
            patientName={selectedSlipForAttachment.patientName}
            onAttachmentsUploaded={handleAttachmentsUploaded}
          />
        </div>,
        document.body
      )}

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
        onSlipAddonsSaved={() => {
          const customerId = resolveListingCustomerId()
          if (customerId) void fetchOfficeSlips(customerId, currentPage, itemsPerPage)
        }}
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
                slipNumber: selectedSlipForPrint.id ? String(selectedSlipForPrint.id) : "",
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

    </div>
  )
}
