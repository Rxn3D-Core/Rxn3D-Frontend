"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X } from "lucide-react"
import { useSlipContext } from "../SlipContext"
import { useSlipCreation } from "@/contexts/slip-creation-context"
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
import { useToast } from "@/components/ui/use-toast"
import { HIPAAComplianceBanner } from "@/components/hipaa-compliance-banner"
import { useGenerateVirtualStatementMutation } from "@/lib/redux/api/billingApi"
import { resolveCaseStatementBillingId } from "@/lib/case-statement-print"
import {
  SLIP_LISTING_DEFAULT_PER_PAGE,
  parseLocationFilterFromUrl,
} from "@/app/lab-case-management/lab-slip-listing-constants"
import { slipCanSendBackToOffice } from "@/lib/slip-location"
import { resolveListingCustomerId } from "@/lib/customer-scope"
import { buildVirtualSlipV2Path } from "@/lib/virtual-slip-routes"
import { usePaperSlipInPagePrint } from "@/hooks/use-paper-slip-in-page-print"
import { LoadingOverlay } from "@/components/ui/loading-overlay"
import { useDebounce } from "@/lib/performance-utils"
import { V3CaseWidget } from "./components/V3CaseWidget"
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

export default function LabSlipV3Page() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { print: printPaperSlip, portal: paperSlipPortal, isPrinting } = usePaperSlipInPagePrint()

  const [search, setSearch] = useState("")
  const [location, setLocation] = useState(() => parseLocationFilterFromUrl(searchParams.get("location")))
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(SLIP_LISTING_DEFAULT_PER_PAGE)
  const [selected, setSelected] = useState<number[]>([])
  const [menuRow, setMenuRow] = useState<number | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState<number | null>(null)
  const [printDropdownOpen, setPrintDropdownOpen] = useState<number | null>(null)

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
  const [showPrintDriverTags, setShowPrintDriverTags] = useState(false)
  const [selectedSlipForDriverTags, setSelectedSlipForDriverTags] = useState<V2CaseRowData | null>(null)
  const [showReadyToSendModal, setShowReadyToSendModal] = useState(false)
  const [readyToSendSlip, setReadyToSendSlip] = useState<V2CaseRowData | null>(null)
  const [readyToSendSubmitting, setReadyToSendSubmitting] = useState(false)
  const [showRushModal, setShowRushModal] = useState(false)
  const [selectedSlipForRush, setSelectedSlipForRush] = useState<V2CaseRowData | null>(null)
  const [showSendBackToOfficeModal, setShowSendBackToOfficeModal] = useState(false)
  const [selectedSlipForSendBackToOffice, setSelectedSlipForSendBackToOffice] = useState<V2CaseRowData | null>(null)
  const [sendBackToOfficeSubmitting, setSendBackToOfficeSubmitting] = useState(false)
  const [cancelSlipModalOpen, setCancelSlipModalOpen] = useState(false)
  const [selectedSlipForCancel, setSelectedSlipForCancel] = useState<V2CaseRowData | null>(null)
  const [cancelSlipSubmitting, setCancelSlipSubmitting] = useState(false)

  const { readyToSendRequired } = useSignatureRequirementSettings(showReadyToSendModal)

  const {
    slips, loading, fetchLabSlips, fetchDriverPrintData,
    createCustomDeliveryDate, fetchOfficeSlips, fetchCustomDeliveryDates,
    readyToSend, labListingPagination, updateSlipAttachmentState,
  } = useSlipContext()
  const { fetchProductAddons, requestSlipRush, cancelSlipRush, cancelSlip, sendBackToOfficeSlip } = useSlipCreation()
  const [generateVirtualStatement] = useGenerateVirtualStatementMutation()
  const router = useRouter()

  const debouncedSearch = useDebounce(search, 400)
  const filterSig = useMemo(
    () => [debouncedSearch, location].join("|"),
    [debouncedSearch, location]
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
    void fetchLabSlips(customerId, {
      q: debouncedSearch.trim() || undefined,
      location_id: location !== "All" ? Number(location) : undefined,
      page: pageToFetch,
      per_page: itemsPerPage,
    })
  }, [filterSig, currentPage, itemsPerPage, fetchLabSlips])

  const slipsPage = slips
  const totalListingCount = labListingPagination?.total ?? slips.length
  const maxPage = Math.max(1, labListingPagination?.last_page ?? 1)

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
    if (!slipId) return
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const url = new URL(`/v1/slip/slip/${slipId}/details`, process.env.NEXT_PUBLIC_API_BASE_URL)
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 401) { window.location.href = "/login"; return }
      const json = await res.json()
      setAddonInputs(buildVirtualSlipAddonInputs(json?.data ?? null))
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
      await cancelSlip(selectedSlipForCancel.id, reason.trim())
      toast({ title: "Case cancelled", description: "The case was cancelled successfully.", duration: 3000 })
      setCancelSlipModalOpen(false); setSelectedSlipForCancel(null); refreshCurrentListing()
    } catch (error) {
      toast({ title: "Unable to cancel case", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setCancelSlipSubmitting(false)
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
          location={location}
          onLocationChange={setLocation}
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
            onChangeDueDate: (slip) => { setSelectedSlipForDateChange(slip); setShowChangeDateModal(true) },
            onDriverHistory: (slip) => { setSelectedSlipForDriverHistory(slip); setShowDriverHistoryModal(true) },
            onReadyToSend: handleOpenReadyToSend,
            onSendBack: (slip) => { setSelectedSlipForSendBackToOffice(slip); setShowSendBackToOfficeModal(true) },
            onRush: handleOpenRushCase,
            onCancel: (slip) => { setSelectedSlipForCancel(slip); setCancelSlipModalOpen(true) },
          }}
          canPrintStatement={canPrintStatement}
          canSendBack={canSendBackToOffice}
          printMenuRow={printDropdownOpen}
          moreMenuRow={menuRow}
          onPrintMenuRowChange={setPrintDropdownOpen}
          onMoreMenuRowChange={setMenuRow}
          currentPage={currentPage}
          totalPages={maxPage}
          totalCount={totalListingCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
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

        {showAttachModal && selectedCaseForAttachment && createPortal(
          <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
            <FileAttachmentModalContent
              setShowAttachModal={(show) => { setShowAttachModal(show); if (!show) setSelectedCaseForAttachment(null) }}
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
              isOpen={showRushModal}
              onClose={() => { setShowRushModal(false); setSelectedSlipForRush(null); setAddonInputs(null) }}
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
