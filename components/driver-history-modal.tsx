// app/components/DriverHistoryModal.tsx

"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { X, Plus, Loader2, AlertCircle, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDriverSlip, QRScanResponseData } from "@/contexts/DriverSlipContext"
import { useSlipContext } from "../app/lab-case-management/SlipContext"
import { useToast } from "@/hooks/use-toast"
import {
  buildPickupDeliveryEntryFromSlip,
  type PickupDeliveryEntry,
} from "@/lib/virtual-slip-pickup-entry"
import {
  slipPickupDropoffAction,
  slipNextLocationIdFromRef,
  type SlipPickupDropoffAction,
} from "@/lib/slip-location"
import { postSlipDriverHistoryChangeLocation } from "@/lib/api/slip-driver-history"

function pickupDropoffModalCopy(action: SlipPickupDropoffAction | null) {
  if (action === "dropoff") {
    return {
      title: "Drop off",
      subtitle: "Confirm drop off for this slip.",
      signaturePlaceholder: "Please sign to confirm drop off...",
      entriesLabel: "Drop off",
    }
  }
  if (action === "pickup") {
    return {
      title: "Pick up",
      subtitle: "Confirm pick up for this slip.",
      signaturePlaceholder: "Please sign to confirm pick up...",
      entriesLabel: "Pick up",
    }
  }
  return {
    title: "Pick up and Drop off",
    subtitle: "Select cases to confirm pick up or drop off.",
    signaturePlaceholder: "Please sign to confirm pick up or drop off...",
    entriesLabel: "Delivery Entries",
  }
}

type DeliveryEntry = PickupDeliveryEntry

function DirectionsIcon() {
  return (
    <svg width="30" height="26" viewBox="0 0 30 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M8.33761 17.114C8.33761 17.6369 8.13442 18.1383 7.77275 18.508C7.41107 18.8777 6.92053 19.0854 6.40904 19.0854C5.89755 19.0854 5.40701 18.8777 5.04533 18.508C4.68366 18.1383 4.48047 17.6369 4.48047 17.114C4.48047 16.5912 4.68366 16.0897 5.04533 15.72C5.40701 15.3503 5.89755 15.1426 6.40904 15.1426C6.92053 15.1426 7.41107 15.3503 7.77275 15.72C8.13442 16.0897 8.33761 16.5912 8.33761 17.114Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.2307 17.1141C11.2307 21.8074 6.40932 24.507 6.40932 24.507C6.40932 24.507 1.58789 21.8074 1.58789 17.1141C1.58789 15.807 2.09586 14.5534 3.00005 13.6291C3.90425 12.7048 5.1306 12.1855 6.40932 12.1855C7.68804 12.1855 8.91439 12.7048 9.81858 13.6291C10.7228 14.5534 11.2307 15.807 11.2307 17.1141Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M25.695 6.60033C25.695 7.12319 25.4918 7.62463 25.1302 7.99435C24.7685 8.36406 24.278 8.57176 23.7665 8.57176C23.255 8.57176 22.7644 8.36406 22.4028 7.99435C22.0411 7.62463 21.8379 7.12319 21.8379 6.60033C21.8379 6.07748 22.0411 5.57604 22.4028 5.20632C22.7644 4.83661 23.255 4.62891 23.7665 4.62891C24.278 4.62891 24.7685 4.83661 25.1302 5.20632C25.4918 5.57604 25.695 6.07748 25.695 6.60033Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M28.5882 6.60045C28.5882 11.2938 23.7667 13.9933 23.7667 13.9933C23.7667 13.9933 18.9453 11.2938 18.9453 6.60045C18.9453 5.29331 19.4533 4.03971 20.3575 3.11542C21.2617 2.19113 22.488 1.67188 23.7667 1.67188C25.0455 1.67188 26.2718 2.19113 27.176 3.11542C28.0802 4.03971 28.5882 5.29331 28.5882 6.60045Z" stroke="#1162A8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.08789 24.6725H25.1412C26.6897 24.6725 27.945 23.4172 27.945 21.8687V21.8687C27.945 20.3202 26.6897 19.0649 25.1412 19.0649H20.3172C18.9623 19.0649 17.8639 17.9665 17.8639 16.6115V16.6115C17.8639 15.2566 18.9623 14.1582 20.3172 14.1582H24.2486" stroke="#1162A8" strokeWidth="1.5" />
    </svg>
  )
}

function DeliveryActionIcon({ clipId }: { clipId: string }) {
  return (
    <svg width="23" height="33" viewBox="0 0 24 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <g clipPath={`url(#${clipId})`}>
        <path d="M8.95658 6.95117H2.75481C1.69774 6.95117 0.84082 7.80677 0.84082 8.8622V16.2821C0.84082 17.3376 1.69774 18.1932 2.75481 18.1932H8.95658C10.0136 18.1932 10.8706 17.3376 10.8706 16.2821V8.8622C10.8706 7.80677 10.0136 6.95117 8.95658 6.95117Z" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
        <path d="M5.85561 18.7695L1.87793 23.4564H9.84399L5.85561 18.7695Z" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
        <path d="M5.85547 23.457V32.9161" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
        <path d="M19.0824 6.51344C20.6651 6.51344 21.9481 5.23243 21.9481 3.65223C21.9481 2.07202 20.6651 0.791016 19.0824 0.791016C17.4998 0.791016 16.2168 2.07202 16.2168 3.65223C16.2168 5.23243 17.4998 6.51344 19.0824 6.51344Z" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
        <path d="M12.9661 15.1931L18.4729 8.83008H20.0554C20.4724 8.83008 20.8573 9.03293 21.1353 9.38524L21.8838 10.3461C22.1725 10.7198 22.3329 11.1788 22.3329 11.6486V19.5916L16.4947 26.0934V30.0863C16.4947 30.9084 16.2702 31.7304 15.789 32.3603C15.7034 32.4671 15.6286 32.5525 15.5644 32.5952C15.265 32.7874 14.5059 32.7447 14.1851 32.5952C14.1209 32.5632 14.0354 32.4991 14.0354 32.4991C13.4045 31.9013 13.1265 31.1326 13.1265 30.3425V26.3283L18.3125 19.8265L18.1093 14.5525L14.9122 18.3639H5.85547" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
        <path d="M22.7717 22.0039V29.7014C22.7717 30.5235 22.5899 31.3455 22.2049 31.9754C22.1408 32.0822 22.0766 32.1676 22.0232 32.2103C21.7879 32.4025 21.1678 32.3598 20.9111 32.2103C20.8577 32.1783 20.7935 32.1142 20.7187 32.0288C20.291 31.5164 20.0664 30.7477 20.0664 29.9576V25.9434" stroke="#34C759" strokeWidth="1.5" strokeMiterlimit="10" />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="23" height="33" fill="white" transform="translate(0.306641 0.257812)" />
        </clipPath>
      </defs>
    </svg>
  )
}

interface DriverHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  slip?: any
  qrScanData?: QRScanResponseData[] // Optional QR scan data to pre-populate
  /** Virtual slip: use loaded slip details only — do not POST /slip/pickup-delivery-slips */
  singleSlipMode?: boolean
}

export default function DriverHistoryModal({
  isOpen,
  onClose,
  slip,
  qrScanData,
  singleSlipMode = false,
}: DriverHistoryModalProps) {
  const [deliveryEntries, setDeliveryEntries] = useState<DeliveryEntry[]>([])
  const [signature, setSignature] = useState("")
  const { qrScanData: contextQrScanData, qrScanLoading, qrScanError, sessionKey } = useDriverSlip()
  const { submitScannedSlips, fetchPickupDeliverySlips } = useSlipContext()
  const { toast } = useToast()
  const [loadingPickup, setLoadingPickup] = useState(false)
  const [pickupError, setPickupError] = useState<string | null>(null)
  const lastFetchedSlipIdRef = useRef<number | null>(null)

  // Convert QR scan data to delivery entries
  const convertQRDataToDeliveryEntries = (qrData: QRScanResponseData[]): DeliveryEntry[] => {
    return qrData.map((item, index) => ({
      id: `qr-${item.slip_id}-${index}`,
      office: item.customer_code || "Unknown Office",
      patientName: item.patient_name,
      location: item.location || item.current_driver_location,
      isChecked: true, // Auto-select QR scanned items
      case_id: item.case_id,
      slip_id: item.slip_id,
      case_number: item.case_number,
      slip_number: item.slip_number,
      casepan_number: item.casepan_number,
      location_id: item.location_id,
      customer_code: item.customer_code,
      customer_id: item.customer_id,
    }))
  }

  // Update delivery entries when QR scan data is available (listing / header scan flows)
  useEffect(() => {
    if (singleSlipMode) return
    const activeQrData = qrScanData || contextQrScanData?.data
    if (activeQrData && activeQrData.length > 0) {
      const qrEntries = convertQRDataToDeliveryEntries(activeQrData)
      setDeliveryEntries(qrEntries)
    }
  }, [qrScanData, contextQrScanData, singleSlipMode])

  // Derive a stable primitive slipId from the slip prop to avoid effect loops
  const slipId = useMemo(() => {
    if (!slip) return null
    return typeof slip === 'number' ? slip : slip.slip_id || slip.id || null
  }, [slip])

  const pickupDropoffAction = useMemo((): SlipPickupDropoffAction | null => {
    if (!singleSlipMode || !slip) return null
    const entry = buildPickupDeliveryEntryFromSlip(slip)
    if (!entry) return null
    return slipPickupDropoffAction({
      locationId: entry.location_id,
      location: entry.location,
    })
  }, [singleSlipMode, slip])

  const modalCopy = useMemo(
    () => pickupDropoffModalCopy(singleSlipMode ? pickupDropoffAction : null),
    [singleSlipMode, pickupDropoffAction]
  )

  // Virtual slip: one row from details already on the page (no pickup-delivery-slips API)
  useEffect(() => {
    if (!singleSlipMode || !isOpen || !slip) return
    const entry = buildPickupDeliveryEntryFromSlip(slip)
    if (!entry) {
      setPickupError(`Could not load slip details for ${modalCopy.title.toLowerCase()}.`)
      setDeliveryEntries([])
      return
    }
    setPickupError(null)
    setDeliveryEntries([entry])
    if (slipId) lastFetchedSlipIdRef.current = Number(slipId)
  }, [singleSlipMode, isOpen, slip, slipId, modalCopy.title])

  // Fetch pickup/delivery slips when modal opens (listing / multi-slip flows)
  useEffect(() => {
    const loadPickup = async () => {
      if (singleSlipMode) return
      if (!isOpen) return
      if (!slipId) return
      if (lastFetchedSlipIdRef.current === Number(slipId)) return // already fetched

      setLoadingPickup(true)
      setPickupError(null)
      try {
        const res = await fetchPickupDeliverySlips(Number(slipId))
        if (res && res.success && Array.isArray(res.data)) {
          const entries = convertQRDataToDeliveryEntries(res.data)
          setDeliveryEntries(entries)
          lastFetchedSlipIdRef.current = Number(slipId)
        } else {
          setPickupError(res?.message || 'Failed to load pickup slips')
        }
      } catch (error) {
        console.error('Error loading pickup slips:', error)
        setPickupError('Failed to load pickup slips')
      } finally {
        setLoadingPickup(false)
      }
    }

    void loadPickup()
  }, [isOpen, slipId, fetchPickupDeliverySlips, singleSlipMode])

  // Reset entries when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDeliveryEntries([])
      setSignature("")
      setPickupError(null)
      lastFetchedSlipIdRef.current = null
    }
  }, [isOpen])

  // Header checkbox: check if all are selected
  const allChecked = deliveryEntries.length > 0 && deliveryEntries.every(entry => entry.isChecked)

  const handleCheckboxToggle = (id: string) => {
    setDeliveryEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === id ? { ...entry, isChecked: !entry.isChecked } : entry,
      ),
    )
  }

  // Select/deselect all
  const handleAllToggle = () => {
    setDeliveryEntries((prevEntries) =>
      prevEntries.map((entry) => ({ ...entry, isChecked: !allChecked })),
    )
  }

  const handleAddCase = () => {
    const newId = String(Date.now())
    const newEntry: DeliveryEntry = {
      id: newId,
      office: "",
      patientName: "",
      location: "",
      isChecked: false,
    }
    setDeliveryEntries((prevEntries) => [...prevEntries, newEntry])
  }

  const handleUpdateManualEntry = (id: string, field: keyof DeliveryEntry, value: string) => {
    setDeliveryEntries((prevEntries) =>
      prevEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    )
  }

  const handleDeleteManualEntry = (id: string) => {
    setDeliveryEntries((prevEntries) => prevEntries.filter((entry) => entry.id !== id))
  }

  const handleSubmit = async () => {
    const selectedCases = deliveryEntries.filter((entry) => entry.isChecked)
    const slipIds = selectedCases.map((entry) => entry.slip_id).filter((id): id is number => typeof id === 'number')
    
    if (selectedCases.length === 0) {
      toast({ title: "No slips selected", description: "Please select at least one slip.", variant: "destructive" })
      return
    }
    if (!signature.trim()) {
      toast({ title: "Signature required", description: "Please enter your signature.", variant: "destructive" })
      return
    }

    if (slipIds.length > 0) {
      if (singleSlipMode && slipIds.length === 1) {
        const entry = selectedCases[0]
        const fromLocationId = entry.location_id
        const toLocationId =
          typeof fromLocationId === "number"
            ? slipNextLocationIdFromRef({
                locationId: fromLocationId,
                location: entry.location,
              })
            : slipNextLocationIdFromRef({ location: entry.location })

        if (toLocationId == null) {
          toast({
            title: "Invalid location",
            description: "This slip cannot be moved from its current location.",
            variant: "destructive",
          })
          return
        }

        const result = await postSlipDriverHistoryChangeLocation({
          slip_ids: slipIds,
          to_location_id: toLocationId,
          notes: signature.trim(),
        })
        if (result.success) {
          toast({
            title: "Submission Successful",
            description:
              result.message || "Location updated successfully",
            duration: 3000,
          })
          onClose()
        } else {
          toast({
            title: "Submission Failed",
            description: result.message || "Failed to update location",
            variant: "destructive",
            duration: 5000,
          })
        }
        return
      }

      const result = await submitScannedSlips(slipIds, signature)
      if (result && result.success) {
        toast({ title: "Submission Successful", description: result.message || "Scanned slips submitted successfully", duration: 3000 })
        onClose()
      } else {
        toast({ title: "Submission Failed", description: result?.message || "Failed to submit scanned slips", variant: "destructive", duration: 5000 })
      }
    } else {
      toast({ title: "Submission Successful", description: "Manual entries processed successfully", duration: 3000 })
      onClose()
    }
  }

  const tableScrollable = deliveryEntries.length > 5

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="flex w-[min(96vw,1080px)] max-w-none flex-col overflow-hidden rounded-none border border-[#D9D9D9] bg-white p-0 shadow-xl sm:rounded-lg max-h-[90dvh]"
      >
        <div className="flex shrink-0 items-center justify-between px-5 py-4 sm:px-8 sm:py-5">
          <DialogTitle className="text-xl font-bold tracking-[-0.02em] text-[#1F2937] sm:text-[22px]">
            {modalCopy.title}
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center text-[#9CA3AF] transition-colors hover:text-[#4B5563]"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 sm:px-8 sm:pb-6">
          {!singleSlipMode && contextQrScanData ? (
            <p className="mb-3 text-xs text-green-700">
              QR scanned ({contextQrScanData.scanned_cases_count} cases)
              {sessionKey ? ` · session ${sessionKey.substring(0, 8)}…` : ""}
            </p>
          ) : null}

          {loadingPickup ? (
            <div className="mb-4 flex items-center justify-center gap-2 py-6 text-[#1162A8]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading entries…</span>
            </div>
          ) : null}

          {pickupError ? (
            <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{pickupError}</span>
            </div>
          ) : null}

          <div
            className={cn(
              "w-full overflow-x-auto",
              tableScrollable && "max-h-[min(42dvh,320px)] overflow-y-auto",
            )}
          >
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-[#1162A8] text-white">
                  <th className="px-4 py-3 text-[15px] font-semibold sm:px-5 sm:py-3.5">Location</th>
                  <th className="w-[72px] px-2 py-3 text-center text-[15px] font-semibold sm:py-3.5">
                    Directions
                  </th>
                  <th className="w-[52px] px-2 py-3 text-center sm:py-3.5">
                    <Checkbox
                      checked={allChecked}
                      onCheckedChange={handleAllToggle}
                      className="mx-auto border-white data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-[#1162A8]"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="w-[88px] px-3 py-3 text-[15px] font-semibold sm:px-4 sm:py-3.5">Office</th>
                  <th className="w-[72px] px-2 py-3 text-center text-[15px] font-semibold sm:py-3.5">Action</th>
                  <th className="min-w-[140px] px-4 py-3 text-[15px] font-semibold sm:px-5 sm:py-3.5">
                    Patient Name
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingPickup ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="bg-[#F5F5F5]">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="h-4 w-full max-w-md animate-pulse rounded bg-gray-200" />
                      </td>
                    </tr>
                  ))
                ) : deliveryEntries.length === 0 ? (
                  <tr className="bg-[#F5F5F5]">
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-600">
                      {singleSlipMode
                        ? `Slip details are not available for ${modalCopy.title.toLowerCase()}.`
                        : 'No entries available. Click "Add Case" to add one manually or scan a QR code.'}
                    </td>
                  </tr>
                ) : (
                  deliveryEntries.map((entry) => {
                    const isManual = !entry.slip_id
                    return (
                      <tr key={entry.id} className="bg-[#F5F5F5] text-[15px] text-[#1F2937]">
                        <td className="px-4 py-4 align-middle sm:px-5">
                          {isManual ? (
                            <Input
                              value={entry.location}
                              onChange={(e) => handleUpdateManualEntry(entry.id, "location", e.target.value)}
                              placeholder="Location"
                              className="h-9 border-[#D9D9D9] bg-white text-sm"
                            />
                          ) : (
                            <span className="block max-w-[280px] leading-snug">{entry.location}</span>
                          )}
                        </td>
                        <td className="px-2 py-4 text-center align-middle">
                          {!isManual ? <DirectionsIcon /> : null}
                        </td>
                        <td className="px-2 py-4 text-center align-middle">
                          <Checkbox
                            id={`entry-${entry.id}`}
                            checked={entry.isChecked}
                            onCheckedChange={() => handleCheckboxToggle(entry.id)}
                            className="mx-auto border-[#1162A8] data-[state=checked]:bg-[#1162A8] data-[state=checked]:text-white"
                            aria-label={`Select ${entry.patientName || "entry"}`}
                          />
                        </td>
                        <td className="px-3 py-4 align-middle sm:px-4">
                          {isManual ? (
                            <Input
                              value={entry.office}
                              onChange={(e) => handleUpdateManualEntry(entry.id, "office", e.target.value)}
                              placeholder="Office"
                              className="h-9 w-full min-w-[72px] border-[#D9D9D9] bg-white text-sm"
                            />
                          ) : (
                            <span className="font-medium">{entry.office || "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-4 text-center align-middle">
                          {isManual ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleDeleteManualEntry(entry.id)}
                              title="Delete manual entry"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <div className="flex justify-center">
                              <DeliveryActionIcon clipId={`delivery-action-${entry.id}`} />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 align-middle sm:px-5">
                          {isManual ? (
                            <Input
                              value={entry.patientName}
                              onChange={(e) =>
                                handleUpdateManualEntry(entry.id, "patientName", e.target.value)
                              }
                              placeholder="Patient Name"
                              className="h-9 border-[#D9D9D9] bg-white text-sm"
                            />
                          ) : (
                            <span className="lowercase">{entry.patientName}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {!singleSlipMode ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                className="border-[#1162A8] text-[#1162A8] hover:bg-blue-50"
                onClick={handleAddCase}
                type="button"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Case
              </Button>
            </div>
          ) : null}

          <div className="relative mt-5 min-h-[120px] shrink-0 border border-[#D9D9D9] bg-white sm:mt-6 sm:min-h-[150px]">
            {!signature.trim() ? (
              <span
                className="pointer-events-none absolute inset-0 flex items-center justify-center select-none text-[28px] text-[#C4C4C4] sm:text-[32px]"
                style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}
                aria-hidden
              >
                Signature
              </span>
            ) : null}
            <Textarea
              id="signature"
              rows={4}
              className="min-h-[120px] w-full resize-none border-0 bg-transparent px-4 py-4 text-[22px] leading-relaxed text-[#1F2937] shadow-none focus-visible:ring-0 sm:min-h-[150px] sm:text-[26px]"
              style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              aria-label="Signature"
            />
          </div>

          <div className="mt-4 flex shrink-0 flex-col-reverse justify-end gap-2 sm:flex-row sm:gap-3">
            <Button
              variant="outline"
              className="h-10 border-[#D9D9D9] sm:w-auto"
              onClick={onClose}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!signature.trim()}
              className="h-10 bg-[#1162A8] px-8 text-white hover:bg-[#0d4f8a] sm:w-auto"
              type="submit"
            >
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
